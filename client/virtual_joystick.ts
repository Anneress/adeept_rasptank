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

    public direction: Vector2 = { x: 0, y: 0 };

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error("Canvas element not found");
        }
        this.context = this.canvas.getContext("2d")!;
        this.addEventListeners();
    }

    private addEventListeners() {
        this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), false);
        this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), false);
        this.canvas.addEventListener("touchend", () => this.onTouchEnd(), false);
    }

    private onTouchStart(event: TouchEvent) {
        const touch = event.touches[0];
        this.touchStart = this.getTouchPosition(touch);
        this.touchMove = this.touchStart;
    }

    private onTouchMove(event: TouchEvent) {
        if (this.touchStart) {
            const touch = event.touches[0];
            this.touchMove = this.getTouchPosition(touch);
            this.updateDirection();
        }
    }

    private onTouchEnd() {
        this.touchStart = null;
        this.touchMove = null;
        this.direction = { x: 0, y: 0 };
    }

    private getTouchPosition(touch: Touch): Vector2 {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    }

    private updateDirection() {
        if (this.touchStart && this.touchMove) {
            const dx = this.touchMove.x - this.touchStart.x;
            const dy = this.touchMove.y - this.touchStart.y;
            const magnitude = Math.sqrt(dx * dx + dy * dy);

            if (magnitude > this.radius) {
                this.direction = {
                    x: dx / magnitude,
                    y: dy / magnitude,
                };
            } else {
                this.direction = { x: dx / this.radius, y: dy / this.radius };
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

// Example of using the joystick in a game loop
const canvas = document.createElement("canvas");
canvas.id = "gameCanvas";
canvas.width = 400;
canvas.height = 400;
//document.body.appendChild(canvas);
document.getElementById("gamepad")?.append(canvas);
const joystick = new VirtualJoystick("gameCanvas");

function gameLoop() {
    joystick.render();

    // Example: Logging the joystick direction
    // console.log("Direction:", joystick.direction);

    requestAnimationFrame(gameLoop);
}

gameLoop();