import logging

import board
import busio
from adafruit_motor import servo
from adafruit_pca9685 import PCA9685

logger = logging.getLogger(__name__)

TILT_CHANNEL = 3
TILT_MIN_DEG = 0
TILT_MAX_DEG = 25
TILT_INIT_DEG = 12
TILT_STEP_DEG = 2

# Empirically measured on this build (channel 3): 0 deg hits the top
# mechanical endstop, 25 deg hits the bottom one. The reference kit's
# channel-2 tick calibration (100-500 raw ticks) does not apply here -
# this servo's usable travel is a narrower slice of that pulse range.
_MIN_PULSE_US = 488
_MAX_PULSE_US = 1098

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
