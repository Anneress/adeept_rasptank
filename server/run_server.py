import asyncio
import logging

from websocket_server.server import start_server

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(start_server())