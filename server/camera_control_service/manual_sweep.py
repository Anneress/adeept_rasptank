"""Standalone hardware check: sweeps the camera tilt servo end to end.

Run directly on the Pi (from the server/ directory) to verify the PCA9685
wiring and channel independently of the WebSocket server:

    python3 -m camera_control_service.manual_sweep
"""
import time

from camera_control_service.camera_control_service import TILT_MAX_DEG, TILT_MIN_DEG, _tilt_servo

if __name__ == "__main__":
    for angle in (TILT_MIN_DEG, TILT_MAX_DEG, TILT_MIN_DEG, TILT_MAX_DEG):
        print(f"Setting angle to {angle}")
        _tilt_servo.angle = angle
        time.sleep(1.5)
