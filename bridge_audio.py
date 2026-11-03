import struct


class Pcm8To16Resampler:
    def __init__(self):
        self.previous_sample = None

    def push(self, pcm):
        samples = _read_samples(pcm)
        output = []
        for sample in samples:
            if self.previous_sample is None:
                output.append(sample)
            else:
                output.append((self.previous_sample + sample) // 2)
                output.append(sample)
            self.previous_sample = sample
        return _write_samples(output)

    def finish(self):
        if self.previous_sample is None:
            return b""
        return _write_samples([self.previous_sample])


class Pcm16To8Resampler:
    def __init__(self):
        self.pending_sample = None

    def push(self, pcm):
        samples = _read_samples(pcm)
        if self.pending_sample is not None:
            samples.insert(0, self.pending_sample)
            self.pending_sample = None

        if len(samples) % 2:
            self.pending_sample = samples.pop()

        output = [
            (samples[index] + samples[index + 1]) // 2
            for index in range(0, len(samples), 2)
        ]
        return _write_samples(output)


def pack_audio_frames(pcm, message_type, max_payload_bytes=65534):
    if len(pcm) % 2:
        raise ValueError("PCM data must contain complete 16-bit samples.")
    if not 0 <= message_type <= 0xFF:
        raise ValueError("AudioSocket message type must fit in one byte.")
    if max_payload_bytes < 2 or max_payload_bytes > 65535 or max_payload_bytes % 2:
        raise ValueError("AudioSocket frame limit must be an even value from 2 to 65534.")

    frames = []
    for offset in range(0, len(pcm), max_payload_bytes):
        payload = pcm[offset : offset + max_payload_bytes]
        frames.append(struct.pack("!BH", message_type, len(payload)) + payload)
    return b"".join(frames)


def _read_samples(pcm):
    if len(pcm) % 2:
        raise ValueError("PCM input must contain complete 16-bit samples.")
    return [sample[0] for sample in struct.iter_unpack("<h", pcm)]


def _write_samples(samples):
    return b"".join(struct.pack("<h", sample) for sample in samples)
