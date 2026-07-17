import json
import logging

import websockets

from camera_control_service.camera_control_handler import handle_tilt_event
from move_control_service.move_control_handler import handle_move_event, handle_stop_event

logger = logging.getLogger(__name__)

_active_connection = None


async def _handle_message(message: str) -> None:
    try:
        data = json.loads(message)
        message_type = data["type"]
    except (json.JSONDecodeError, KeyError, TypeError):
        logger.warning("Ignoring malformed message: %r", message)
        return

    if message_type == "move":
        try:
            x = float(data["x"])
            y = float(data["y"])
        except (KeyError, TypeError, ValueError):
            logger.warning("Ignoring malformed move message: %r", message)
            return
        await handle_move_event(x, y)
    elif message_type == "stop":
        await handle_stop_event()
    elif message_type == "tilt":
        direction = data.get("direction")
        if direction not in ("up", "down"):
            logger.warning("Ignoring malformed tilt message: %r", message)
            return
        await handle_tilt_event(direction)
    else:
        logger.warning("Ignoring unknown message type: %r", message_type)


async def _connection_handler(websocket):
    global _active_connection

    if _active_connection is not None:
        await websocket.close(code=1013, reason="Another controller is already connected")
        return

    _active_connection = websocket
    try:
        async for message in websocket:
            await _handle_message(message)
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected without a clean close handshake")
    finally:
        _active_connection = None
        await handle_stop_event()


async def start_server():
    server = await websockets.serve(_connection_handler, "0.0.0.0", 8000)
    print("WebSocket server started on ws://0.0.0.0:8000")
    await server.wait_closed()
