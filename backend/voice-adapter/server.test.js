import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVoiceServer,
  Pcm24To16Resampler,
  createAudioInputMessage,
  createSetupMessage,
} from './server.js';
import { WebSocket } from 'ws';

test('creates a Vertex Live API setup for the configured model', () => {
  const setup = createSetupMessage(
    'test-project',
    'us-central1',
    'gemini-live-2.5-flash-native-audio',
    'Speak Thai.',
  );

  assert.equal(
    setup.setup.model,
    'projects/test-project/locations/us-central1/publishers/google/models/gemini-live-2.5-flash-native-audio',
  );
  assert.deepEqual(setup.setup.generation_config.response_modalities, ['AUDIO']);
});

test('wraps signed 16 kHz PCM in the Live API input format', () => {
  const pcm = Buffer.alloc(4);
  pcm.writeInt16LE(-100, 0);
  pcm.writeInt16LE(100, 2);

  const input = createAudioInputMessage(pcm);
  assert.equal(input.realtime_input.media_chunks[0].mime_type, 'audio/pcm;rate=16000');
  assert.equal(input.realtime_input.media_chunks[0].data, pcm.toString('base64'));
});

test('resamples 24 kHz PCM to 16 kHz and preserves samples across chunks', () => {
  const resampler = new Pcm24To16Resampler();
  const first = Buffer.alloc(6);
  [0, 300, 600].forEach((value, index) => first.writeInt16LE(value, index * 2));
  const second = Buffer.alloc(6);
  [900, 1200, 1500].forEach((value, index) => second.writeInt16LE(value, index * 2));

  const output = Buffer.concat([resampler.push(first), resampler.push(second)]);
  assert.equal(output.length, 8);
  assert.deepEqual(
    Array.from({ length: 4 }, (_, index) => output.readInt16LE(index * 2)),
    [0, 450, 900, 1350],
  );
});

test('serves health checks and accepts the bridge WebSocket route', async (t) => {
  const server = createVoiceServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${baseUrl}/healthz?probe=1`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');

  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/voice-stream`);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  assert.equal(socket.readyState, WebSocket.OPEN);
  socket.close();
  await new Promise((resolve) => socket.once('close', resolve));
});
