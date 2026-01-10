# test_ws.py
import asyncio, websockets
async def main():
    uri = "ws://localhost:8766"
    try:
        async with websockets.connect(uri) as ws:
            print("connected")
            for _ in range(5):
                msg = await ws.recv()
                print("recv:", msg[:200])
    except Exception as e:
        print("client error:", e)

asyncio.run(main())
