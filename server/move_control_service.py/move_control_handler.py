from move_control_service import move, stop, Direction, Turn

async def handle_move_event():
    move()

async def handle_stop_event():
    stop()
