import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { GoogleAuth } from 'google-auth-library';
import twilio from 'twilio';
import { WebSocket, WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import {
  decodeTwilioMuLawPayload,
  Pcm8To16Resampler,
  Pcm16To8Resampler,
} from './audio.js';

const BODY_LIMIT_BYTES = 16 * 1024;
const MAX_WS_MESSAGE_BYTES = 64 * 1024;
const MAX_SOCKET_BUFFERED_BYTES = 1024 * 1024;
const MAX_QUEUED_CLIENT_BYTES = 1024 * 1024;
const STREAM_TOKEN_TTL_SECONDS = 300;
const CALL_SID_PATTERN = /^CA[a-f0-9]{32}$/i;
const STREAM_SID_PATTERN = /^MZ[a-f0-9]{32}$/i;
const IAP_SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email'];

export function createStreamToken(callSid, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!CALL_SID_PATTERN.test(callSid)) throw new Error('Invalid call identifier.');
  const expiresAt = nowSeconds + STREAM_TOKEN_TTL_SECONDS;
  const payload = `${callSid}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyStreamToken(token, callSid, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || typeof callSid !== 'string') return false;
  const match = /^(CA[a-f0-9]{32})\.(\d{10})\.([A-Za-z0-9_-]{43})$/i.exec(token);
  if (!match || match[1] !== callSid) return false;

  const expiresAt = Number(match[2]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < nowSeconds || expiresAt > nowSeconds + STREAM_TOKEN_TTL_SECONDS) {
    return false;
  }

  const payload = `${match[1]}.${match[2]}`;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const supplied = Buffer.from(match[3], 'base64url');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createTwiML(streamUrl, streamToken) {
  const escapeXml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&apos;');

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response><Connect><Stream url="${escapeXml(streamUrl)}">` +
    `<Parameter name="sessionToken" value="${escapeXml(streamToken)}"/>` +
    `</Stream></Connect><Say language="th-TH">ขออภัย ระบบเสียงขัดข้อง กรุณาติดต่อใหม่อีกครั้ง</Say>` +
    `<Hangup/></Response>`;
}

export function validateTwilioRequest(authToken, signature, url, params = {}) {
  return Boolean(
    authToken &&
    signature &&
    twilio.validateRequest(authToken, signature, url, params),
  );
}

function getPublicRequestUrl(config, requestUrl, protocol) {
  const publicBase = new URL(config.publicBaseUrl);
  const request = new URL(requestUrl, publicBase);
  if (request.origin !== publicBase.origin) {
    throw new Error('Request URL does not match the configured public origin.');
  }
  if (protocol) request.protocol = protocol;
  return request.toString();
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let oversized = false;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) oversized = true;
      else if (!oversized) chunks.push(chunk);
    });
    request.once('end', () => {
      if (oversized) reject(new Error('Request body too large.'));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.once('error', reject);
  });
}

function parseForm(body) {
  const params = new URLSearchParams(body);
  const result = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(result, key)) throw new Error('Duplicate form parameter.');
    result[key] = value;
  }
  return result;
}

function normalizeE164(number) {
  return typeof number === 'string' && /^\+[1-9]\d{7,14}$/.test(number) ? number : null;
}

function defaultConfig() {
  const publicBaseUrl = process.env.TWILIO_PUBLIC_BASE_URL;
  const voiceAdapterUrl = process.env.VOICE_ADAPTER_URL;
  const config = {
    port: Number(process.env.PORT || 8080),
    publicBaseUrl,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    inboundNumber: process.env.TWILIO_INBOUND_NUMBER,
    streamTokenSecret: process.env.TWILIO_STREAM_TOKEN_SECRET,
    voiceAdapterUrl,
    webhookPath: '/twilio/voice',
    websocketPath: '/twilio/media',
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  if (!config.publicBaseUrl || new URL(config.publicBaseUrl).protocol !== 'https:') {
    throw new Error('TWILIO_PUBLIC_BASE_URL must be an absolute HTTPS URL.');
  }
  if (!config.authToken || !config.streamTokenSecret || config.streamTokenSecret.length < 32) {
    throw new Error('Twilio Auth Token and a 32-character stream token secret are required.');
  }
  if (!normalizeE164(config.inboundNumber)) {
    throw new Error('TWILIO_INBOUND_NUMBER must be in E.164 format.');
  }
  if (!voiceAdapterUrl || new URL(voiceAdapterUrl).protocol !== 'https:') {
    throw new Error('VOICE_ADAPTER_URL must be an absolute HTTPS URL.');
  }
  return config;
}

function createAdapterConnector(config, getAccessToken) {
  return async () => {
    const token = await getAccessToken();
    const adapterUrl = new URL('/ws/voice-stream', config.voiceAdapterUrl);
    adapterUrl.protocol = 'wss:';
    return new WebSocket(adapterUrl, {
      handshakeTimeout: 15000,
      maxPayload: MAX_WS_MESSAGE_BYTES,
      headers: { Authorization: `Bearer ${token}` },
    });
  };
}

function createGoogleAccessTokenProvider() {
  const auth = new GoogleAuth({ scopes: IAP_SCOPES });
  return async () => {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error('Google ADC did not return an IAP-compatible access token.');
    }
    return tokenResponse.token;
  };
}

function validateMediaFormat(format) {
  return format &&
    format.encoding === 'audio/x-mulaw' &&
    Number(format.sampleRate) === 8000 &&
    Number(format.channels) === 1;
}

function handleMediaConnection(client, request, config, dependencies) {
  let adapter;
  let streamSid;
  let callSid;
  let started = false;
  let closed = false;
  let messageQueue = Promise.resolve();
  let queuedClientBytes = 0;
  const upsampler = new Pcm8To16Resampler();
  const downsampler = new Pcm16To8Resampler();
  let outgoingAudio = Buffer.alloc(0);

  const closeBoth = (code = 1000, reason = 'Call ended') => {
    if (closed) return;
    closed = true;
    if (client.readyState === WebSocket.OPEN) client.close(code, reason);
    if (adapter && adapter.readyState < WebSocket.CLOSING) adapter.close();
  };

  const sendPendingAudio = (includePartial) => {
    while (outgoingAudio.length >= 160 && client.readyState === WebSocket.OPEN) {
      if (client.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES) {
        closeBoth(1013, 'Twilio connection is overloaded.');
        return;
      }
      const frame = outgoingAudio.subarray(0, 160);
      outgoingAudio = outgoingAudio.subarray(160);
      client.send(JSON.stringify({
        event: 'media',
        streamSid,
        media: { payload: frame.toString('base64') },
      }));
    }

    if (includePartial && outgoingAudio.length && client.readyState === WebSocket.OPEN) {
      if (client.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES) {
        closeBoth(1013, 'Twilio connection is overloaded.');
        return;
      }
      client.send(JSON.stringify({
        event: 'media',
        streamSid,
        media: { payload: outgoingAudio.toString('base64') },
      }));
      outgoingAudio = Buffer.alloc(0);
    }
  };

  const sendAudioToTwilio = (pcm16) => {
    const mulaw = downsampler.push(pcm16);
    if (mulaw.length) outgoingAudio = Buffer.concat([outgoingAudio, mulaw]);
    sendPendingAudio(true);
  };

  const flushAudioToTwilio = () => {
    const finalSample = downsampler.flush();
    if (finalSample.length) outgoingAudio = Buffer.concat([outgoingAudio, finalSample]);
    sendPendingAudio(true);
  };

  const handleMessage = async (data, isBinary) => {
    if (isBinary) {
      closeBoth(1003, 'Twilio messages must be JSON.');
      return;
    }
    if (data.length > MAX_WS_MESSAGE_BYTES) {
      closeBoth(1009, 'Message too large.');
      return;
    }

    let message;
    try {
      message = JSON.parse(data.toString('utf8'));
    } catch {
      closeBoth(1008, 'Invalid JSON.');
      return;
    }

    if (message.event === 'connected') return;

    if (message.event === 'start') {
      if (started) {
        closeBoth(1008, 'Duplicate start event.');
        return;
      }
      const start = message.start;
      callSid = start?.callSid;
      streamSid = message.streamSid;
      const token = start?.customParameters?.sessionToken;
      if (
        !CALL_SID_PATTERN.test(callSid || '') ||
        !STREAM_SID_PATTERN.test(streamSid || '') ||
        start.streamSid !== streamSid ||
        !validateMediaFormat(start?.mediaFormat) ||
        !verifyStreamToken(token, callSid, config.streamTokenSecret)
      ) {
        closeBoth(1008, 'Invalid stream start.');
        return;
      }

      started = true;
      adapter = await dependencies.createAdapterSocket();
      await new Promise((resolve, reject) => {
        adapter.once('open', resolve);
        adapter.once('error', reject);
      });
      adapter.send(JSON.stringify({ event: 'call_start', session_id: callSid }));
      adapter.on('message', (response, isAdapterBinary) => {
        if (!isAdapterBinary) return;
        if (response.length % 2 !== 0) {
          closeBoth(1011, 'Invalid AI audio frame.');
          return;
        }
        sendAudioToTwilio(response);
      });
      adapter.once('error', (error) => {
        dependencies.logger.error('[Twilio gateway] AI adapter connection failed:', error.message);
        closeBoth(1011, 'AI connection failed.');
      });
      adapter.once('close', () => {
        flushAudioToTwilio();
        closeBoth(1011, 'AI session ended.');
      });
      return;
    }

    if (!started) {
      closeBoth(1008, 'Expected a start event.');
      return;
    }

    if (message.event === 'media') {
      if (message.streamSid !== streamSid || typeof message.media?.payload !== 'string') {
        closeBoth(1008, 'Invalid media event.');
        return;
      }
      if (!adapter || adapter.readyState !== WebSocket.OPEN) {
        closeBoth(1011, 'AI session is unavailable.');
        return;
      }
      if (adapter.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES) {
        closeBoth(1013, 'AI session is overloaded.');
        return;
      }
      const pcm8 = decodeTwilioMuLawPayload(message.media.payload);
      const pcm16 = upsampler.push(pcm8);
      if (pcm16.length) adapter.send(pcm16, { binary: true });
      return;
    }

    if (message.event === 'stop') {
      if (message.streamSid !== streamSid) {
        closeBoth(1008, 'Invalid stop event.');
        return;
      }
      closeBoth(1000, 'Call ended.');
      return;
    }

    if (message.event === 'dtmf') {
      if (message.streamSid !== streamSid) {
        closeBoth(1008, 'Invalid DTMF event.');
        return;
      }
      dependencies.logger.info('[Twilio gateway] DTMF received; this release does not route DTMF to the AI adapter.');
      return;
    }

    closeBoth(1008, 'Unsupported Twilio event.');
  };

  client.on('message', (data, isBinary) => {
    if (closed) return;
    queuedClientBytes += data.length;
    if (queuedClientBytes > MAX_QUEUED_CLIENT_BYTES) {
      closeBoth(1013, 'Twilio connection is overloaded.');
      return;
    }
    const messageBytes = data.length;
    messageQueue = messageQueue
      .then(() => {
        queuedClientBytes -= messageBytes;
        if (closed) return;
        return handleMessage(data, isBinary);
      })
      .catch((error) => {
        dependencies.logger.error('[Twilio gateway] Media session failed:', error.message);
        closeBoth(1011, 'Media session failed.');
      });
  });
  client.once('close', () => {
    if (adapter && adapter.readyState === WebSocket.OPEN) {
      adapter.send(JSON.stringify({ event: 'call_end' }));
      adapter.close();
    }
  });
  client.once('error', (error) => {
    dependencies.logger.error('[Twilio gateway] Twilio WebSocket error:', error.message);
    closeBoth(1011, 'Media connection failed.');
  });
  request.once('aborted', () => closeBoth(1001, 'Request aborted.'));
}

export function createTwilioVoiceServer(options = {}) {
  const config = options.config || defaultConfig();
  const dependencies = {
    validateSignature: options.validateSignature || validateTwilioRequest,
    createAdapterSocket: options.createAdapterSocket ||
      createAdapterConnector(
        config,
          options.getAccessToken || createGoogleAccessTokenProvider(),
        ),
    logger: options.logger || console,
  };

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url, config.publicBaseUrl);
    if (request.method === 'GET' && requestUrl.pathname === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      response.end('ok');
      return;
    }
    if (request.method !== 'POST' || requestUrl.pathname !== config.webhookPath) {
      response.writeHead(404);
      response.end();
      return;
    }
    if (!request.headers['content-type']?.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
      response.writeHead(415);
      response.end();
      return;
    }

    try {
      const body = await readBody(request);
      const params = parseForm(body);
      const signature = request.headers['x-twilio-signature'];
      const canonicalUrl = getPublicRequestUrl(config, request.url);
      if (!dependencies.validateSignature(config.authToken, signature, canonicalUrl, params)) {
        response.writeHead(403);
        response.end();
        return;
      }

      const callSid = params.CallSid;
      if (
        !CALL_SID_PATTERN.test(callSid || '') ||
        normalizeE164(params.To) !== config.inboundNumber
      ) {
        response.writeHead(403);
        response.end();
        return;
      }

      const streamToken = createStreamToken(callSid, config.streamTokenSecret);
      const streamUrl = new URL(config.websocketPath, config.publicBaseUrl);
      streamUrl.protocol = 'wss:';
      response.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(createTwiML(streamUrl.toString(), streamToken));
    } catch (error) {
      if (!response.headersSent) {
        const status = error.message === 'Request body too large.' ? 413 : 400;
        response.writeHead(status);
        response.end();
      }
      dependencies.logger.warn('[Twilio gateway] Rejected voice webhook request.');
    }
  });

  const webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_WS_MESSAGE_BYTES,
  });

  server.on('upgrade', (request, socket, head) => {
    let requestUrl;
    try {
      requestUrl = new URL(request.url, config.publicBaseUrl);
    } catch {
      socket.destroy();
      return;
    }

    if (requestUrl.pathname !== config.websocketPath || requestUrl.search) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    let canonicalUrl;
    try {
      canonicalUrl = getPublicRequestUrl(config, request.url, 'wss:');
    } catch {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const signature = request.headers['x-twilio-signature'];
    if (!dependencies.validateSignature(config.authToken, signature, canonicalUrl, {})) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (client) => {
      webSocketServer.emit('connection', client, request);
      handleMediaConnection(client, request, config, dependencies);
    });
  });

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = defaultConfig();
  const server = createTwilioVoiceServer({ config });
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[Twilio gateway] Listening on port ${config.port}`);
  });
}
