import asyncio
import logging
import struct
import uuid

from bridge_audio import Pcm8To16Resampler, Pcm16To8Resampler, pack_audio_frames


AUDIOSOCKET_HOST = "127.0.0.1"
AUDIOSOCKET_PORT = 9092
CLOUD_RUN_URL = "https://fahsai-audio-bridge-izqaizo67a-as.a.run.app"
PCM_8KHZ = 0x10
PCM_16KHZ = 0x12
TERMINATE = 0x00
MAX_AUDIO_FRAME_BYTES = 65534

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


async def get_access_token():
    import google.auth
    from google.auth.transport.requests import Request

    credentials, _ = google.auth.default(
        scopes=["openid", "https://www.googleapis.com/auth/userinfo.email"]
    )
    credentials.refresh(Request())
    if not credentials.token:
        raise RuntimeError("OAuth 2.0 token exchange returned no access token.")
    return credentials.token


async def handle_client(reader, writer):
    import aiohttp

    session_id = str(uuid.uuid4())
    logging.info("Incoming AudioSocket session=%s", session_id)
    ws_url = f"{CLOUD_RUN_URL}/ws/voice-stream"
    upsampler = Pcm8To16Resampler()
    downsampler = Pcm16To8Resampler()
    tasks = set()

    try:
        access_token = await get_access_token()
        timeout = aiohttp.ClientTimeout(total=None, connect=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.ws_connect(
                ws_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                heartbeat=30,
            ) as websocket:
                await websocket.send_json(
                    {"event": "call_start", "session_id": session_id}
                )

                async def send_audio_socket_audio():
                    while True:
                        header = await reader.readexactly(3)
                        message_type, payload_length = struct.unpack("!BH", header)
                        payload = await reader.readexactly(payload_length)

                        if message_type == TERMINATE:
                            await websocket.send_json({"event": "call_end"})
                            return
                        if message_type == PCM_8KHZ:
                            pcm_16khz = upsampler.push(payload)
                            if pcm_16khz:
                                await websocket.send_bytes(pcm_16khz)
                        elif message_type == PCM_16KHZ:
                            if len(payload) % 2:
                                raise ValueError("16 kHz PCM frame has an incomplete sample.")
                            await websocket.send_bytes(payload)

                async def receive_ai_audio():
                    async for message in websocket:
                        if message.type == aiohttp.WSMsgType.BINARY:
                            pcm_8khz = downsampler.push(message.data)
                            if pcm_8khz:
                                writer.write(pack_audio_frames(pcm_8khz, PCM_8KHZ))
                                await writer.drain()
                        elif message.type == aiohttp.WSMsgType.ERROR:
                            raise websocket.exception() or RuntimeError(
                                "AI WebSocket closed with an error."
                            )

                tasks = {
                    asyncio.create_task(send_audio_socket_audio()),
                    asyncio.create_task(receive_ai_audio()),
                }
                done, pending = await asyncio.wait(
                    tasks,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for task in done:
                    exception = task.exception()
                    if exception:
                        raise exception
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
    except asyncio.IncompleteReadError:
        logging.info("AudioSocket caller disconnected session=%s", session_id)
    except Exception as error:
        logging.error("Voice stream failed session=%s error=%s", session_id, error)
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        writer.close()
        try:
            await writer.wait_closed()
        except (ConnectionError, OSError):
            pass


async def main():
    server = await asyncio.start_server(handle_client, AUDIOSOCKET_HOST, AUDIOSOCKET_PORT)
    logging.info("Fahsai bridge ready on %s:%s", AUDIOSOCKET_HOST, AUDIOSOCKET_PORT)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
