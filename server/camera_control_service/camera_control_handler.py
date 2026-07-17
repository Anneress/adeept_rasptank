from camera_control_service.camera_control_service import tilt_step


async def handle_tilt_event(direction: str) -> None:
    await tilt_step(direction)
