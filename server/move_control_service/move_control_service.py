import gpiozero

RIGHT_ENABLE = 4
RIGHT_FORWARD = 14
RIGHT_BACKWARD = 15

LEFT_ENABLE = 17
LEFT_FORWARD = 18
LEFT_BACKWARD = 27

_left_motor = gpiozero.Motor(forward=LEFT_FORWARD, backward=LEFT_BACKWARD, enable=LEFT_ENABLE, pwm=True)
_right_motor = gpiozero.Motor(forward=RIGHT_FORWARD, backward=RIGHT_BACKWARD, enable=RIGHT_ENABLE, pwm=True)


def _clamp(value: float, low: float = -1.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


async def move(x: float, y: float) -> None:
    x = _clamp(x)
    y = _clamp(y)
    _left_motor.value = _clamp(y - x)
    _right_motor.value = _clamp(y + x)


async def stop() -> None:
    _left_motor.stop()
    _right_motor.stop()
