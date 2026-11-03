import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  createStreamToken,
  createTwiML,
  createTwilioVoiceServer,
  validateTwilioRequest,
  verifyStreamToken,
} from './server.js';
import {
  decodeMuLawByte,
  decodeTwilioMuLawPayload,
  encodeMuLawSample,
  Pcm8To16Resampler,
  Pcm16To8Resampler,
  splitTwilioFrames,
} from './audio.js';
import twilio from 'twilio';
import { WebSocket, WebSocketServer } from 'ws';

const AUTH_TOKEN = 'test-auth-token';
const STREAM_SECRET = 'test-stream-signing-secret-that-is-long-enough';
const CALL_SID = 'CA1234567890abcdef1234567890abcdef';
const INBOUND_NUMBER = '+18312988954';

function buildConfig() {
  return {
    port: 0,
    publicBaseUrl: 'https://voice.example.test',
    authToken: AUTH_TOKEN,
    inboundNumber: INBOUND_NUMBER,
    streamTokenSecret: STREAM_SECRET,
    voiceAdapterUrl: 'https://adapter.example.test',
    webhookPath: '/twilio/voice',
    websocketPath: '/twilio/media',
  };
}

test('creates and verifies short-lived call-bound stream tokens', () => {
  const now = 1_800_000_000;
  const token = createStreamToken(CALL_SID, STREAM_SECRET, now);
  assert.equal(verifyStreamToken(token, CALL_SID, STREAM_SECRET, now), true);
  assert.equal(verifyStreamToken(token, `${CALL_SID}x`, STREAM_SECRET, now), false);
  assert.equal(verifyStreamToken(token, CALL_SID, 'wrong secret', now), false);
  assert.equal(verifyStreamToken(token, CALL_SID, STREAM_SECRET, now + 301), false);
});

test('creates TwiML with a secure bidirectional stream and fail-safe', () => {
  const xml = createTwiML('wss://voice.example.test/twilio/media', 'token&value');
  assert.match(xml, /<Connect><Stream url="wss:\/\/voice\.example\.test\/twilio\/media">/);
  assert.match(xml, /value="token&amp;value"/);
  assert.match(xml, /<Say language="th-TH">/);
  assert.match(xml, /<Hangup\/>/);
});

test('validates webhook signatures using the Twilio request validator', () => {
  const url = 'https://voice.example.test/twilio/voice';
  const params = { CallSid: CALL_SID, To: INBOUND_NUMBER };
  const signature = twilio.getExpectedTwilioSignature(AUTH_TOKEN, url, params);
  assert.equal(validateTwilioRequest(AUTH_TOKEN, signature, url, params), true);
  assert.equal(validateTwilioRequest(AUTH_TOKEN, signature, `${url}/wrong`, params), false);
});

test('decodes mu-law silence and converts PCM samples to and from mu-law', () => {
  assert.equal(decodeMuLawByte(0xff), 0);
  assert.equal(encodeMuLawSample(0), 0xff);

  const payload = Buffer.from([0xff, 0x80, 0x00]).toString('base64');
  const pcm = decodeTwilioMuLawPayload(payload);
  assert.equal(pcm.length, 6);
  assert.equal(pcm.readInt16LE(0), 0);
  assert.equal(pcm.readInt16LE(2), -pcm.readInt16LE(4));
});

test('resamples across chunk boundaries and preserves mu-law output pairs', () => {
  const upsampler = new Pcm8To16Resampler();
  const first = Buffer.alloc(2);
  first.writeInt16LE(1000);
  const second = Buffer.alloc(2);
  second.writeInt16LE(3000);
  const upsampled = Buffer.concat([upsampler.push(first), upsampler.push(second)]);
  assert.deepEqual(
    Array.from({ length: 4 }, (_, index) => upsampled.readInt16LE(index * 2)),
    [1000, 1000, 2000, 3000],
  );

  const downsampler = new Pcm16To8Resampler();
  assert.equal(downsampler.push(upsampled).length, 2);
  assert.equal(downsampler.push(Buffer.from([0, 0])).length, 0);
  assert.equal(downsampler.flush().length, 1);
});

test('splits outbound media into Twilio-sized 20 ms frames', () => {
  const frames = splitTwilioFrames(Buffer.alloc(350));
  assert.deepEqual(frames.map((frame) => frame.length), [160, 160, 30]);
});

test('serves health and only returns TwiML for a signed expected-number webhook', async (t) => {
  const server = createTwilioVoiceServer({
    config: buildConfig(),
    validateSignature: (authToken, signature, url) =>
      authToken === AUTH_TOKEN &&
      signature === 'valid-signature' &&
      url === 'https://voice.example.test/twilio/voice',
    createAdapterSocket: async () => {
      throw new Error('Not used by webhook test.');
    },
    logger: { warn() {}, error() {}, info() {} },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${baseUrl}/healthz`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');

  const form = new URLSearchParams({ CallSid: CALL_SID, To: INBOUND_NUMBER }).toString();
  const accepted = await fetch(`${baseUrl}/twilio/voice`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': 'valid-signature',
    },
    body: form,
  });
  assert.equal(accepted.status, 200);
  assert.match(await accepted.text(), /wss:\/\/voice\.example\.test\/twilio\/media/);

  const rejected = await fetch(`${baseUrl}/twilio/voice`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': 'invalid-signature',
    },
    body: form,
  });
  assert.equal(rejected.status, 403);

  const unexpectedNumber = await fetch(`${baseUrl}/twilio/voice`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': 'valid-signature',
    },
    body: new URLSearchParams({
      CallSid: CALL_SID,
      To: '+18312980000',
    }).toString(),
  });
  assert.equal(unexpectedNumber.status, 403);
});

test('validates the Media Stream upgrade and relays audio in both directions', async (t) => {
  const adapterServer = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(adapterServer, 'listening');
  const adapterAddress = adapterServer.address();
  let adapterClient;
  const callStarted = new Promise((resolve) => {
    adapterServer.once('connection', (socket) => {
      adapterClient = socket;
      socket.once('message', (data, isBinary) => {
        assert.equal(isBinary, false);
        resolve(JSON.parse(data.toString()));
      });
    });
  });

  const server = createTwilioVoiceServer({
    config: buildConfig(),
    createAdapterSocket: async () => new WebSocket(
      `ws://127.0.0.1:${adapterAddress.port}/ws/voice-stream`,
    ),
    logger: { warn() {}, error() {}, info() {} },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  let client;

  t.after(async () => {
    if (client && client.readyState !== WebSocket.CLOSED) {
      client.close();
      await once(client, 'close');
    }
    if (adapterClient && adapterClient.readyState !== WebSocket.CLOSED) {
      adapterClient.close();
      await once(adapterClient, 'close');
    }
    await new Promise((resolve) => adapterServer.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  });

  const invalidSocket = new WebSocket(`ws://127.0.0.1:${address.port}/twilio/media`, {
    headers: { 'x-twilio-signature': 'invalid-signature' },
  });
  const invalidError = await new Promise((resolve) => {
    invalidSocket.once('error', resolve);
    invalidSocket.once('open', () => resolve(null));
  });
  assert.ok(invalidError);
  assert.equal(adapterClient, undefined);

  client = new WebSocket(`ws://127.0.0.1:${address.port}/twilio/media`, {
    headers: {
      'x-twilio-signature': twilio.getExpectedTwilioSignature(
        AUTH_TOKEN,
        'wss://voice.example.test/twilio/media',
        {},
      ),
    },
  });
  await once(client, 'open');

  const streamSid = 'MZabcdef1234567890abcdef1234567890';
  const streamToken = createStreamToken(CALL_SID, STREAM_SECRET);
  client.send(JSON.stringify({
    event: 'start',
    streamSid,
    start: {
      callSid: CALL_SID,
      streamSid,
      customParameters: { sessionToken: streamToken },
      mediaFormat: { encoding: 'audio/x-mulaw', sampleRate: 8000, channels: 1 },
    },
  }));
  assert.deepEqual(await callStarted, { event: 'call_start', session_id: CALL_SID });

  const inboundAudio = new Promise((resolve) => {
    adapterClient.once('message', (data, isBinary) => {
      assert.equal(isBinary, true);
      resolve(data);
    });
  });
  client.send(JSON.stringify({
    event: 'media',
    streamSid,
    media: { payload: Buffer.alloc(160, 0xff).toString('base64') },
  }));
  assert.equal((await inboundAudio).length, 640);

  const outboundMedia = new Promise((resolve) => {
    client.once('message', (data, isBinary) => {
      assert.equal(isBinary, false);
      resolve(JSON.parse(data.toString()));
    });
  });
  adapterClient.send(Buffer.alloc(640), { binary: true });
  const mediaMessage = await outboundMedia;
  assert.equal(mediaMessage.event, 'media');
  assert.equal(mediaMessage.streamSid, streamSid);
  assert.equal(Buffer.from(mediaMessage.media.payload, 'base64').length, 160);

  const partialMedia = new Promise((resolve) => {
    client.once('message', (data) => resolve(JSON.parse(data.toString())));
  });
  adapterClient.send(Buffer.alloc(4), { binary: true });
  const partialMessage = await partialMedia;
  assert.equal(Buffer.from(partialMessage.media.payload, 'base64').length, 1);
});
