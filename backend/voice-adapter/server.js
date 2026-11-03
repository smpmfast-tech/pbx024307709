import { createServer } from 'node:http';
import { GoogleAuth } from 'google-auth-library';
import { WebSocket, WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 8080);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL_ID = process.env.GEMINI_LIVE_MODEL || 'gemini-live-2.5-flash-native-audio';
const MAX_QUEUED_AUDIO_BYTES = 1024 * 1024;
const MAX_CLIENT_MESSAGE_BYTES = 64 * 1024;
const AUDIO_FRAME_BYTES = 65534;
const SYSTEM_INSTRUCTION =
  process.env.GEMINI_SYSTEM_INSTRUCTION ||
  'คุณคือผู้ช่วยเสียงของ 711shopping พูดภาษาไทยอย่างเป็นธรรมชาติ สุภาพ กระชับ และช่วยตอบคำถามเรื่องสินค้าและบริการ หากผู้โทรต้องการคุยกับพนักงาน ให้แจ้งว่าจะประสานงานให้';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

export class Pcm24To16Resampler {
  constructor() {
    this.samples = [];
    this.position = 0;
  }

  push(input) {
    if (input.length % 2 !== 0) {
      throw new Error('PCM input must contain complete 16-bit samples.');
    }

    for (let offset = 0; offset < input.length; offset += 2) {
      this.samples.push(input.readInt16LE(offset));
    }

    const output = [];
    while (this.position + 1 < this.samples.length) {
      const start = Math.floor(this.position);
      const fraction = this.position - start;
      const sample = Math.round(
        this.samples[start] * (1 - fraction) + this.samples[start + 1] * fraction,
      );
      output.push(Math.max(-32768, Math.min(32767, sample)));
      this.position += 1.5;
    }

    const consumed = Math.floor(this.position);
    if (consumed > 0) {
      this.samples.splice(0, consumed);
      this.position -= consumed;
    }

    const result = Buffer.allocUnsafe(output.length * 2);
    output.forEach((sample, index) => result.writeInt16LE(sample, index * 2));
    return result;
  }
}

export function createSetupMessage(projectId, location, modelId, systemInstruction) {
  return {
    setup: {
      model: `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`,
      generation_config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: { voice_name: 'Aoede' },
          },
        },
      },
      system_instruction: { parts: [{ text: systemInstruction }] },
    },
  };
}

export function createAudioInputMessage(pcm) {
  return {
    realtime_input: {
      media_chunks: [
        {
          mime_type: 'audio/pcm;rate=16000',
          data: pcm.toString('base64'),
        },
      ],
    },
  };
}

function sendPcmFrames(client, pcm) {
  for (let offset = 0; offset < pcm.length; offset += AUDIO_FRAME_BYTES) {
    const end = Math.min(offset + AUDIO_FRAME_BYTES, pcm.length);
    if (client.readyState === WebSocket.OPEN) {
      client.send(pcm.subarray(offset, end), { binary: true });
    }
  }
}

function sendInitialGreeting(upstream) {
  upstream.send(JSON.stringify({
    client_content: {
      turns: [{ role: 'user', parts: [{ text: 'เริ่มบทสนทนาโดยทักทายผู้โทรอย่างสุภาพ' }] }],
      turn_complete: true,
    },
  }));
}

async function handleCall(client) {
  let upstream;
  let started = false;
  let setupComplete = false;
  let queuedAudioBytes = 0;
  let setupTimer;
  const queuedAudio = [];
  const resampler = new Pcm24To16Resampler();

  const closeBoth = (code = 1000, reason = 'Call ended') => {
    if (client.readyState === WebSocket.OPEN) client.close(code, reason);
    if (upstream && upstream.readyState < WebSocket.CLOSING) upstream.close();
  };

  client.on('message', async (data, isBinary) => {
    if (isBinary) {
      if (data.length % 2 !== 0) {
        closeBoth(1003, 'Invalid PCM frame');
        return;
      }

      if (!setupComplete || !upstream || upstream.readyState !== WebSocket.OPEN) {
        queuedAudioBytes += data.length;
        if (queuedAudioBytes > MAX_QUEUED_AUDIO_BYTES) {
          closeBoth(1009, 'Audio buffer limit exceeded');
          return;
        }
        queuedAudio.push(Buffer.from(data));
        return;
      }

      upstream.send(JSON.stringify(createAudioInputMessage(data)));
      return;
    }

    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      closeBoth(1008, 'Expected a call_start message');
      return;
    }

    if (started) {
      if (message?.event === 'call_end') {
        closeBoth(1000, 'Call ended');
        return;
      }

      closeBoth(1008, 'Only one call_start message is allowed');
      return;
    }

    if (!message || message.event !== 'call_start') {
      closeBoth(1008, 'Expected a call_start message');
      return;
    }

    started = true;

    try {
      const authClient = await auth.getClient();
      const token = await authClient.getAccessToken();
      if (!token?.token) throw new Error('Cloud Run ADC did not return an access token.');

      const upstreamUrl =
        `wss://${LOCATION}-aiplatform.googleapis.com//ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
      upstream = new WebSocket(upstreamUrl, {
        handshakeTimeout: 15000,
        headers: {
          Authorization: `Bearer ${token.token}`,
          'X-Goog-User-Project': PROJECT_ID,
          'x-goog-api-client': 'fahsai-audiosocket-bridge/1',
        },
      });

      upstream.once('open', () => {
        upstream.send(JSON.stringify(
          createSetupMessage(PROJECT_ID, LOCATION, MODEL_ID, SYSTEM_INSTRUCTION),
        ));
        setupTimer = setTimeout(() => {
          console.error('[Voice adapter] Vertex setup timed out.');
          closeBoth(1011, 'Vertex setup timed out');
        }, 20000);
      });

      upstream.on('message', (response) => {
        let payload;
        try {
          payload = JSON.parse(response.toString());
        } catch {
          closeBoth(1011, 'Invalid response from Vertex AI');
          return;
        }

        if (payload.error) {
          console.error(
            '[Voice adapter] Vertex API error:',
            payload.error.code || 'unknown code',
            payload.error.status || 'unknown status',
          );
          closeBoth(1011, 'Vertex AI rejected the session');
          return;
        }

        if (payload.setupComplete || payload.setup_complete) {
          setupComplete = true;
          clearTimeout(setupTimer);
          sendInitialGreeting(upstream);
          while (queuedAudio.length && upstream.readyState === WebSocket.OPEN) {
            const audio = queuedAudio.shift();
            queuedAudioBytes -= audio.length;
            upstream.send(JSON.stringify(createAudioInputMessage(audio)));
          }
          return;
        }

        const parts =
          payload.serverContent?.modelTurn?.parts ??
          payload.server_content?.model_turn?.parts ??
          [];
        for (const part of parts) {
          const audio = part.inlineData ?? part.inline_data;
          if (!audio?.data) continue;

          const pcm = Buffer.from(audio.data, 'base64');
          const mimeType = audio.mimeType ?? audio.mime_type ?? '';
          const sampleRate = Number(/rate=(\d+)/i.exec(mimeType)?.[1] || 24000);
          const output = sampleRate === 24000 ? resampler.push(pcm) : pcm;
          sendPcmFrames(client, output);
        }
      });

      upstream.once('error', (error) => {
        console.error('[Voice adapter] Vertex WebSocket error:', error.message);
        closeBoth(1011, 'Vertex AI connection failed');
      });

      upstream.once('close', (code, reason) => {
        clearTimeout(setupTimer);
        const safeReason = reason
          .toString('utf8')
          .replace(/bearer\s+\S+/gi, 'Bearer [redacted]')
          .slice(0, 256);
        console.error(
          '[Voice adapter] Vertex WebSocket closed:',
          code,
          'reason:',
          safeReason,
        );
        if (client.readyState === WebSocket.OPEN) {
          client.close(1011, 'Vertex AI connection closed');
        }
      });
    } catch (error) {
      console.error('[Voice adapter] Could not start Vertex session:', error.message);
      closeBoth(1011, 'Could not start AI session');
    }
  });

  client.once('close', () => {
    if (upstream && upstream.readyState < WebSocket.CLOSING) upstream.close();
  });
  client.once('error', (error) => {
    console.error('[Voice adapter] Client WebSocket error:', error.message);
    if (upstream && upstream.readyState < WebSocket.CLOSING) upstream.close();
  });
}

export function createVoiceServer() {
  const server = createServer((request, response) => {
    const requestPath = new URL(request.url, 'http://localhost').pathname;
    if (requestPath === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('ok');
      return;
    }
    response.writeHead(404);
    response.end();
  });

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_CLIENT_MESSAGE_BYTES,
  });

  server.on('upgrade', (request, socket, head) => {
    let url;
    try {
      url = new URL(request.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }

    if (url.pathname !== '/ws/voice-stream') {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
      void handleCall(client);
    });
  });

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!PROJECT_ID || PROJECT_ID.trim() !== PROJECT_ID || /\s/.test(PROJECT_ID)) {
    throw new Error('GOOGLE_CLOUD_PROJECT must be set to a valid project ID.');
  }

  const server = createVoiceServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Voice adapter] Listening on port ${PORT}`);
  });
}
