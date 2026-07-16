from move_control_service.move_control_service import move, stop


async def handle_move_event(x: float, y: float) -> None:
    await move(x, y)


async def handle_stop_event() -> None:
    await stop()
