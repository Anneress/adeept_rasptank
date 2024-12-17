import asyncio
import websockets

async def echo(websocket, path):
    async for message in websocket:
        print(f"Received message: {message}")
        await websocket.send(f"Echo: {message}")

async def start_server():
    server = await websockets.serve(echo, "0.0.0.0", 8000)
    print("WebSocket server started on ws://0.0.0.0:8000")
    await server.wait_closed()