# Adeept Rasptank Control

Web-based remote control for the Adeept RaspTank, a Raspberry Pi tracked robot. A browser client sends steering input over WebSocket to a Python server, which drives the tank's two tracks via GPIO.

## Language

**MoveVector**:
A 2D steering input with `x`, `y` fields, each in the range [-1.0, 1.0], representing the joystick's current deflection. `y` is forward (+1.0) / backward (-1.0); `x` is right (+1.0) / left (-1.0) turn intensity. `(0, 0)` means stop.
_Avoid_: joystick input, direction vector

**Tank mixing**:
The formula that converts a **MoveVector** into independent left/right track speeds: `left = clamp(y + x, -1, 1)`, `right = clamp(y - x, -1, 1)`. `x` alone produces a zero-radius turn (tracks spin in opposite directions).

**TiltAngle**:
The camera unit's vertical look angle, in degrees `[0, 25]`. `0` is fully up (top mechanical endstop), `25` is fully down (bottom mechanical endstop), `12` is roughly level/home. The server holds the current **TiltAngle** as state and moves it in fixed 2° steps on each **tilt step** command; there is no client-side notion of the current angle.
_Avoid_: servo angle, camera position, pitch

**Tilt step**:
A client command that nudges **TiltAngle** by 2° in one direction (`up` or `down`), clamped to `[0, 25]`. Sent repeatedly (every 100ms) while the client's up/down button is held, not just once per press.
_Avoid_: tilt delta, camera move

## Relationships

- The client's joystick produces a **MoveVector** on every touch update and sends it to the server.
- The server applies **tank mixing** to a **MoveVector** to produce per-track motor speeds, each in [-1.0, 1.0], fed directly to `gpiozero.Motor.value`.
- On WebSocket disconnect, the server stops both tracks regardless of the last received **MoveVector** (see [ADR-0001](docs/adr/0001-disconnect-stops-motors.md)).
- The server accepts only one active controlling connection at a time; a second connection attempt is rejected while the first is active (see [ADR-0002](docs/adr/0002-single-controller-connection.md)).
- The client's up/down buttons send a **tilt step** on press and repeatedly while held; the server applies each one to its stored **TiltAngle** and drives the camera servo via PCA9685 channel 3.
- Unlike **MoveVector**, **TiltAngle** is not reset on WebSocket disconnect — it holds its last position (see [ADR-0003](docs/adr/0003-tilt-holds-position-on-disconnect.md)).
- The camera also exposes a continuous MJPEG video stream over its own HTTP port (8001), served by a dedicated process separate from the control server (see [ADR-0004](docs/adr/0004-mjpeg-http-video-stream.md) and [ADR-0005](docs/adr/0005-camera-runs-in-dedicated-process.md)). Viewing the stream is decoupled from the **MoveVector**/**tilt step** control connection — it requires no active controller and no authentication, and any number of clients may view it at once.

## Example dialogue

> **Dev:** "Does the server still use `speed`/`Direction`/`Turn`/`radius` to drive the motors?"
> **Domain expert:** "No — that model is replaced by **MoveVector**. The server takes `(x, y)` directly and mixes it into track speeds itself."

## Flagged ambiguities

- The client's on-screen joystick uses screen coordinates, where `y` grows downward. The client is responsible for inverting `y` before sending a **MoveVector**, so that server-side `y` always means "forward = positive," independent of screen coordinate conventions.
- **TiltAngle**'s `[0, 25]` range and pulse-width calibration were determined empirically on the physical build (channel 3), not derived from the Adeept reference kit's channel-2 tick values — that reference calibration turned out not to match this hardware's actual wiring or mechanical travel. The degree values are a readable label for the measured safe travel range, not a manufacturer-specified physical angle.
