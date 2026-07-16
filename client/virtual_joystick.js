"use strict";
var _a;
class VirtualJoystick {
    constructor(canvasId) {
        this.touchStart = null;
        this.touchMove = null;
        this.radius = 150;
        this.deadzone = 0.1;
        this.direction = { x: 0, y: 0 };
        this.onRelease = null;
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error("Canvas element not found");
        }
        this.context = this.canvas.getContext("2d");
        this.addEventListeners();
    }
    addEventListeners() {
        this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), false);
        this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), false);
        this.canvas.addEventListener("touchend", () => this.onTouchEnd(), false);
    }
    onTouchStart(event) {
        const touch = event.touches[0];
        this.touchStart = this.getTouchPosition(touch);
        this.touchMove = this.touchStart;
    }
    onTouchMove(event) {
        if (this.touchStart) {
            const touch = event.touches[0];
            this.touchMove = this.getTouchPosition(touch);
            this.updateDirection();
        }
    }
    onTouchEnd() {
        var _b;
        this.touchStart = null;
        this.touchMove = null;
        this.direction = { x: 0, y: 0 };
        (_b = this.onRelease) === null || _b === void 0 ? void 0 : _b.call(this);
    }
    getTouchPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
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
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = "lightBlue";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.beginPath();
        this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.radius, 0, Math.PI * 2);
        this.context.strokeStyle = "gray";
        this.context.stroke();
        if (this.touchStart) {
            if (this.touchMove) {
                this.context.beginPath();
                this.context.arc(this.touchMove.x, this.touchMove.y, 30, 0, Math.PI * 2);
                this.context.fillStyle = "blue";
                this.context.fill();
            }
        }
    }
}
class MoveVectorSender {
    constructor(url) {
        this.sendIntervalMs = 50;
        this.socket = new WebSocket(url);
        this.socket.onopen = () => console.log("Connected to WebSocket server");
        this.socket.onclose = () => console.log("Disconnected from WebSocket server");
    }
    start(joystick) {
        setInterval(() => this.sendMove(joystick.direction), this.sendIntervalMs);
    }
    sendStop() {
        this.send({ type: "stop" });
    }
    sendMove(direction) {
        this.send({ type: "move", x: direction.x, y: direction.y });
    }
    send(payload) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        }
    }
}
const canvas = document.createElement("canvas");
canvas.id = "gameCanvas";
canvas.width = 400;
canvas.height = 400;
(_a = document.getElementById("gamepad")) === null || _a === void 0 ? void 0 : _a.append(canvas);
const joystick = new VirtualJoystick("gameCanvas");
const moveVectorSender = new MoveVectorSender("ws://localhost:8000");
joystick.onRelease = () => moveVectorSender.sendStop();
moveVectorSender.start(joystick);
function gameLoop() {
    joystick.render();
    requestAnimationFrame(gameLoop);
}
gameLoop();
