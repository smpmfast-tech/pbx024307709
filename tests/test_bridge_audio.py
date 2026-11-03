import struct
import unittest

from bridge_audio import Pcm8To16Resampler, Pcm16To8Resampler, pack_audio_frames


def pcm(*samples):
    return b"".join(struct.pack("<h", sample) for sample in samples)


def samples(pcm_bytes):
    return [sample[0] for sample in struct.iter_unpack("<h", pcm_bytes)]


class BridgeAudioTests(unittest.TestCase):
    def test_upsamples_8khz_across_packet_boundaries(self):
        resampler = Pcm8To16Resampler()
        output = resampler.push(pcm(0, 1000)) + resampler.push(pcm(2000))
        output += resampler.finish()

        self.assertEqual(samples(output), [0, 500, 1000, 1500, 2000, 2000])

    def test_downsamples_16khz_and_preserves_partial_pair(self):
        resampler = Pcm16To8Resampler()
        output = resampler.push(pcm(100, 300, 500))
        output += resampler.push(pcm(700, 900))

        self.assertEqual(samples(output), [200, 600])

    def test_pack_audio_frames_uses_big_endian_payload_length(self):
        framed = pack_audio_frames(pcm(10, -10), 0x10)

        self.assertEqual(framed[:3], b"\x10\x00\x04")
        self.assertEqual(framed[3:], pcm(10, -10))

    def test_pack_audio_frames_splits_on_even_sample_boundary(self):
        framed = pack_audio_frames(pcm(1, 2, 3), 0x10, max_payload_bytes=4)

        self.assertEqual(framed, b"\x10\x00\x04" + pcm(1, 2) + b"\x10\x00\x02" + pcm(3))

    def test_rejects_incomplete_pcm_samples(self):
        with self.assertRaises(ValueError):
            Pcm8To16Resampler().push(b"\x01")

        with self.assertRaises(ValueError):
            pack_audio_frames(b"\x01", 0x10)


if __name__ == "__main__":
    unittest.main()
