# Adeept Rasptank Control

Web-based remote control for the Adeept RaspTank, a Raspberry Pi tracked robot. A browser client sends steering input over WebSocket to a Python server, which drives the tank's two tracks via GPIO.

## Language

**MoveVector**:
A 2D steering input with `x`, `y` fields, each in the range [-1.0, 1.0], representing the joystick's current deflection. `y` is forward (+1.0) / backward (-1.0); `x` is right (+1.0) / left (-1.0) turn intensity. `(0, 0)` means stop.
_Avoid_: joystick input, direction vector

**Tank mixing**:
The formula that converts a **MoveVector** into independent left/right track speeds: `left = clamp(y + x, -1, 1)`, `right = clamp(y - x, -1, 1)`. `x` alone produces a zero-radius turn (tracks spin in opposite directions).

## Relationships

- The client's joystick produces a **MoveVector** on every touch update and sends it to the server.
- The server applies **tank mixing** to a **MoveVector** to produce per-track motor speeds, each in [-1.0, 1.0], fed directly to `gpiozero.Motor.value`.
- On WebSocket disconnect, the server stops both tracks regardless of the last received **MoveVector** (see [ADR-0001](docs/adr/0001-disconnect-stops-motors.md)).
- The server accepts only one active controlling connection at a time; a second connection attempt is rejected while the first is active (see [ADR-0002](docs/adr/0002-single-controller-connection.md)).

## Example dialogue

> **Dev:** "Does the server still use `speed`/`Direction`/`Turn`/`radius` to drive the motors?"
> **Domain expert:** "No — that model is replaced by **MoveVector**. The server takes `(x, y)` directly and mixes it into track speeds itself."

## Flagged ambiguities

- The client's on-screen joystick uses screen coordinates, where `y` grows downward. The client is responsible for inverting `y` before sending a **MoveVector**, so that server-side `y` always means "forward = positive," independent of screen coordinate conventions.
