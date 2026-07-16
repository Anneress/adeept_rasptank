# Connection loss stops the motors

A physical tank that keeps driving after its controller disconnects is a safety hazard, and WebSocket connections over WiFi can drop without a clean close handshake. We decided the server treats any WebSocket close or error as an implicit `stop`, calling `stop()` immediately, independent of the explicit `{"type": "stop"}` message the client sends on `touchend`. This is a deliberate safety net: the explicit `stop` handles the normal case, the connection-loss handler handles the failure case.
