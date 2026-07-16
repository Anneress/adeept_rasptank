type Vector2 = {
    x: number;
    y: number;
};

class VirtualJoystick {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private touchStart: Vector2 | null = null;
    private touchMove: Vector2 | null = null;
    private radius: number = 150;
    private deadzone: number = 0.1;

    public direction: Vector2 = { x: 0, y: 0 };
    public onRelease: (() => void) | null = null;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error("Canvas element not found");
        }
        this.context = this.canvas.getContext("2d")!;
        this.addEventListeners();
    }

    private addEventListeners() {
        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e), false);
        this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e), false);
        this.canvas.addEventListener("pointerup", () => this.onPointerUp(), false);
        this.canvas.addEventListener("pointercancel", () => this.onPointerUp(), false);
    }

    private onPointerDown(event: PointerEvent) {
        this.canvas.setPointerCapture(event.pointerId);
        this.touchStart = this.getPointerPosition(event);
        this.touchMove = this.touchStart;
    }

    private onPointerMove(event: PointerEvent) {
        if (this.touchStart) {
            this.touchMove = this.getPointerPosition(event);
            this.updateDirection();
        }
    }

    private onPointerUp() {
        this.touchStart = null;
        this.touchMove = null;
        this.direction = { x: 0, y: 0 };
        this.onRelease?.();
    }

    private getPointerPosition(event: PointerEvent): Vector2 {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    private updateDirection() {
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
            } else {
                this.direction = { x: dx / this.radius, y: -dy / this.radius };
            }
        }
    }

    public render() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = "lightBlue";
        this.context.fillRect(0,0,this.canvas.width, this.canvas.height);
        
        this.context.beginPath();
        this.context.arc(this.canvas.width / 2, this.canvas.width/2, this.radius, 0, Math.PI * 2);
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
    private socket: WebSocket;
    private readonly sendIntervalMs = 50;

    constructor(url: string) {
        this.socket = new WebSocket(url);
        this.socket.onopen = () => console.log("Connected to WebSocket server");
        this.socket.onclose = () => console.log("Disconnected from WebSocket server");
    }

    public start(joystick: VirtualJoystick) {
        setInterval(() => this.sendMove(joystick.direction), this.sendIntervalMs);
    }

    public sendStop() {
        this.send({ type: "stop" });
    }

    private sendMove(direction: Vector2) {
        this.send({ type: "move", x: direction.x, y: direction.y });
    }

    private send(payload: unknown) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(payload));
        }
    }
}

const canvas = document.createElement("canvas");
canvas.id = "gameCanvas";
canvas.width = 400;
canvas.height = 400;
document.getElementById("gamepad")?.append(canvas);

const joystick = new VirtualJoystick("gameCanvas");
const moveVectorSender = new MoveVectorSender(`ws://${location.hostname}:8000`);
joystick.onRelease = () => moveVectorSender.sendStop();
moveVectorSender.start(joystick);

function gameLoop() {
    joystick.render();
    requestAnimationFrame(gameLoop);
}

gameLoop();