"use strict";
var _a;
class VirtualJoystick {
    constructor(canvasId, size) {
        this.touchStart = null;
        this.touchMove = null;
        this.radius = 150;
        this.knobRadius = 36;
        this.deadzone = 0.1;
        this.direction = { x: 0, y: 0 };
        this.onRelease = null;
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error("Canvas element not found");
        }
        this.context = this.canvas.getContext("2d");
        this.resize(size);
        this.addEventListeners();
    }
    resize(size) {
        this.canvas.width = size;
        this.canvas.height = size;
        this.radius = size * VirtualJoystick.RADIUS_RATIO;
        this.knobRadius = size * VirtualJoystick.KNOB_RADIUS_RATIO;
    }
    addEventListeners() {
        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e), false);
        this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e), false);
        this.canvas.addEventListener("pointerup", () => this.onPointerUp(), false);
        this.canvas.addEventListener("pointercancel", () => this.onPointerUp(), false);
    }
    onPointerDown(event) {
        this.canvas.setPointerCapture(event.pointerId);
        this.touchStart = this.getPointerPosition(event);
        this.touchMove = this.touchStart;
    }
    onPointerMove(event) {
        if (this.touchStart) {
            this.touchMove = this.getPointerPosition(event);
            this.updateDirection();
        }
    }
    onPointerUp() {
        var _a;
        this.touchStart = null;
        this.touchMove = null;
        this.direction = { x: 0, y: 0 };
        (_a = this.onRelease) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    getPointerPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }
    updateDirection() {
        if (this.touchStart && this.touchMove) {
            const dx = this.touchMove.x - this.touchStart.x;
            const dy = this.touchMove.y - this.touchStart.y;
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            if (magnitude / this.radius < this.deadzone) {
                this.direction = { x: 0, y: 0 };
                return;
            }
            // Screen y grows downward; MoveVector.y is positive forward, so it's inverted here.
            if (magnitude > this.radius) {
                this.direction = {
                    x: dx / magnitude,
                    y: -dy / magnitude,
                };
            }
            else {
                this.direction = { x: dx / this.radius, y: -dy / this.radius };
            }
        }
    }
    render() {
        const ctx = this.context;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const isActive = this.touchStart !== null;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Base pad
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 6;
        const baseGradient = ctx.createRadialGradient(centerX, centerY, this.radius * 0.1, centerX, centerY, this.radius);
        baseGradient.addColorStop(0, "#3a4750");
        baseGradient.addColorStop(1, "#232c33");
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = baseGradient;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Knob: derived from the current direction so it is always visible,
        // even at rest, and stays within the base's bounds.
        const knobRadius = this.knobRadius;
        const knobX = centerX + this.direction.x * (this.radius - knobRadius / 2);
        const knobY = centerY - this.direction.y * (this.radius - knobRadius / 2);
        ctx.save();
        ctx.shadowColor = isActive ? "rgba(74, 158, 255, 0.6)" : "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = isActive ? 18 : 8;
        ctx.shadowOffsetY = 3;
        const knobGradient = ctx.createRadialGradient(knobX - knobRadius * 0.3, knobY - knobRadius * 0.3, knobRadius * 0.1, knobX, knobY, knobRadius);
        if (isActive) {
            knobGradient.addColorStop(0, "#6fb6ff");
            knobGradient.addColorStop(1, "#2f7dd6");
        }
        else {
            knobGradient.addColorStop(0, "#8a97a1");
            knobGradient.addColorStop(1, "#5b6670");
        }
        ctx.beginPath();
        ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
        ctx.fillStyle = knobGradient;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? "#bfe0ff" : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
// Tuned against the original fixed 400px canvas (radius 150, knob radius 36).
VirtualJoystick.RADIUS_RATIO = 150 / 400;
VirtualJoystick.KNOB_RADIUS_RATIO = 36 / 400;
class MoveVectorSender {
    constructor(socket) {
        this.sendIntervalMs = 50;
        this.lastSentWasZero = false;
        this.socket = socket;
    }
    start(joystick) {
        setInterval(() => this.sendMove(joystick.direction), this.sendIntervalMs);
    }
    sendStop() {
        this.lastSentWasZero = false;
        this.send({ type: "stop" });
    }
    sendMove(direction) {
        const isZero = direction.x === 0 && direction.y === 0;
        if (isZero && this.lastSentWasZero) {
            return;
        }
        this.lastSentWasZero = isZero;
        this.send({ type: "move", x: direction.x, y: direction.y });
    }
    send(payload) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        }
    }
}
class TiltButtons {
    constructor(socket, upButton, downButton) {
        this.repeatIntervalMs = 100;
        this.repeatHandle = null;
        this.socket = socket;
        this.bindButton(upButton, "up");
        this.bindButton(downButton, "down");
    }
    bindButton(button, direction) {
        const start = (event) => {
            event.preventDefault();
            this.sendTilt(direction);
            this.repeatHandle = setInterval(() => this.sendTilt(direction), this.repeatIntervalMs);
        };
        const stop = () => {
            if (this.repeatHandle !== null) {
                clearInterval(this.repeatHandle);
                this.repeatHandle = null;
            }
        };
        button.addEventListener("pointerdown", start);
        button.addEventListener("pointerup", stop);
        button.addEventListener("pointercancel", stop);
        button.addEventListener("pointerleave", stop);
    }
    sendTilt(direction) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "tilt", direction }));
        }
    }
}
const MAX_JOYSTICK_SIZE = 400;
const MIN_JOYSTICK_SIZE = 220;
function computeJoystickSize() {
    const horizontalBudget = window.innerWidth - 48;
    const verticalBudget = window.innerHeight - 220;
    return Math.max(MIN_JOYSTICK_SIZE, Math.min(MAX_JOYSTICK_SIZE, horizontalBudget, verticalBudget));
}
const canvas = document.createElement("canvas");
canvas.id = "gameCanvas";
(_a = document.getElementById("gamepad")) === null || _a === void 0 ? void 0 : _a.append(canvas);
const joystick = new VirtualJoystick("gameCanvas", computeJoystickSize());
window.addEventListener("resize", () => joystick.resize(computeJoystickSize()));
const socket = new WebSocket(`ws://${location.hostname}:8000`);
socket.onopen = () => console.log("Connected to WebSocket server");
socket.onclose = () => console.log("Disconnected from WebSocket server");
const moveVectorSender = new MoveVectorSender(socket);
joystick.onRelease = () => moveVectorSender.sendStop();
moveVectorSender.start(joystick);
const tiltUpButton = document.getElementById("tiltUp");
const tiltDownButton = document.getElementById("tiltDown");
new TiltButtons(socket, tiltUpButton, tiltDownButton);
function gameLoop() {
    joystick.render();
    requestAnimationFrame(gameLoop);
}
gameLoop();
