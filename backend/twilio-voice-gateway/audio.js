const MAX_MEDIA_BYTES = 32 * 1024;
const TWILIO_FRAME_BYTES = 160;

export function decodeMuLawByte(value) {
  const encoded = (~value) & 0xff;
  const sign = encoded & 0x80;
  const exponent = (encoded >> 4) & 0x07;
  const mantissa = encoded & 0x0f;
  const magnitude = (((mantissa << 3) + 0x84) << exponent) - 0x84;
  return sign ? -magnitude : magnitude;
}

export function encodeMuLawSample(sample) {
  let value = Math.max(-32635, Math.min(32635, Math.trunc(sample)));
  const sign = value < 0 ? 0x80 : 0;
  if (value < 0) value = -value;
  value += 0x84;

  let exponent = 7;
  for (let mask = 0x4000; exponent > 0 && (value & mask) === 0; mask >>= 1) {
    exponent -= 1;
  }

  const mantissa = (value >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

export function decodeTwilioMuLawPayload(payload) {
  if (typeof payload !== 'string' || payload.length === 0 || payload.length > MAX_MEDIA_BYTES * 4 / 3) {
    throw new Error('Invalid Twilio audio payload size.');
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload)) {
    throw new Error('Invalid base64 audio payload.');
  }

  const mulaw = Buffer.from(payload, 'base64');
  if (mulaw.length === 0 || mulaw.length > MAX_MEDIA_BYTES || mulaw.toString('base64') !== payload) {
    throw new Error('Invalid Twilio audio payload.');
  }

  const pcm = Buffer.allocUnsafe(mulaw.length * 2);
  for (let index = 0; index < mulaw.length; index += 1) {
    pcm.writeInt16LE(decodeMuLawByte(mulaw[index]), index * 2);
  }
  return pcm;
}

export class Pcm8To16Resampler {
  constructor() {
    this.previousSample = null;
  }

  push(pcm) {
    if (pcm.length % 2 !== 0) {
      throw new Error('PCM input must contain complete 16-bit samples.');
    }

    const output = [];
    for (let offset = 0; offset < pcm.length; offset += 2) {
      const current = pcm.readInt16LE(offset);
      if (this.previousSample === null) {
        output.push(current, current);
      } else {
        output.push(Math.round((this.previousSample + current) / 2), current);
      }
      this.previousSample = current;
    }

    const result = Buffer.allocUnsafe(output.length * 2);
    output.forEach((sample, index) => result.writeInt16LE(sample, index * 2));
    return result;
  }
}

export class Pcm16To8Resampler {
  constructor() {
    this.pendingSample = null;
  }

  push(pcm) {
    if (pcm.length % 2 !== 0) {
      throw new Error('PCM input must contain complete 16-bit samples.');
    }

    const samples = [];
    let offset = 0;
    if (this.pendingSample !== null && pcm.length >= 2) {
      samples.push(Math.round((this.pendingSample + pcm.readInt16LE(0)) / 2));
      this.pendingSample = null;
      offset = 2;
    }

    for (; offset + 3 < pcm.length; offset += 4) {
      samples.push(Math.round((pcm.readInt16LE(offset) + pcm.readInt16LE(offset + 2)) / 2));
    }
    if (offset + 1 < pcm.length) {
      this.pendingSample = pcm.readInt16LE(offset);
    }

    const result = Buffer.allocUnsafe(samples.length);
    samples.forEach((sample, index) => {
      result[index] = encodeMuLawSample(sample);
    });
    return result;
  }

  flush() {
    if (this.pendingSample === null) return Buffer.alloc(0);
    const result = Buffer.from([encodeMuLawSample(this.pendingSample)]);
    this.pendingSample = null;
    return result;
  }
}

export function splitTwilioFrames(mulaw) {
  const frames = [];
  for (let offset = 0; offset < mulaw.length; offset += TWILIO_FRAME_BYTES) {
    frames.push(mulaw.subarray(offset, Math.min(offset + TWILIO_FRAME_BYTES, mulaw.length)));
  }
  return frames;
}
