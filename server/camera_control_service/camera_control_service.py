import logging

import board
import busio
from adafruit_motor import servo
from adafruit_pca9685 import PCA9685

logger = logging.getLogger(__name__)

TILT_CHANNEL = 2
TILT_MIN_DEG = 0
TILT_MAX_DEG = 80
TILT_INIT_DEG = 40
TILT_STEP_DEG = 5

# Reference calibration (Adeept RaspTank kit, PCA9685 channel 2): raw ticks
# 100-500 out of 4096 at 50Hz, relabeled linearly as TILT_MIN_DEG-TILT_MAX_DEG.
_PERIOD_US = 20_000
_MIN_PULSE_US = round(100 / 4096 * _PERIOD_US)
_MAX_PULSE_US = round(500 / 4096 * _PERIOD_US)

_i2c = busio.I2C(board.SCL, board.SDA)
_pca = PCA9685(_i2c)
_pca.frequency = 50
_tilt_servo = servo.Servo(
    _pca.channels[TILT_CHANNEL],
    min_pulse=_MIN_PULSE_US,
    max_pulse=_MAX_PULSE_US,
    actuation_range=TILT_MAX_DEG,
)

_current_angle = TILT_INIT_DEG
_tilt_servo.angle = _current_angle
logger.info("Camera tilt servo initialized on PCA9685 channel %d at %.0f deg", TILT_CHANNEL, _current_angle)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


async def tilt_step(direction: str) -> None:
    global _current_angle

    if direction == "up":
        _current_angle = _clamp(_current_angle - TILT_STEP_DEG, TILT_MIN_DEG, TILT_MAX_DEG)
    elif direction == "down":
        _current_angle = _clamp(_current_angle + TILT_STEP_DEG, TILT_MIN_DEG, TILT_MAX_DEG)
    else:
        return

    _tilt_servo.angle = _current_angle
    logger.info("Camera tilt -> %.0f deg (channel %d)", _current_angle, TILT_CHANNEL)
