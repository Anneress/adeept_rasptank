import gpiozero
from enum import Enum

class Direction(Enum):
    FORWARD=1
    BACKWARD=2

class Turn(Enum):
    LEFT=1
    RIGHT=2

async def move(speed: int, direction: Direction, turn: Turn, radius: float):
    pass

async def stop():
    pass