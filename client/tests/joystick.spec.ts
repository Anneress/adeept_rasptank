import { test, expect, type Page } from "@playwright/test";

type Message = { type: string; x?: number; y?: number; direction?: string };

async function captureMoveVectorMessages(page: Page): Promise<Message[]> {
    const messages: Message[] = [];
    // The client always connects to ws://<hostname>:8000, regardless of the
    // port it was served from. Mock that socket so the test doesn't need a
    // real server.
    await page.routeWebSocket(/:8000\/?$/, (ws) => {
        ws.onMessage((message) => messages.push(JSON.parse(message.toString())));
    });
    return messages;
}

async function dragJoystick(page: Page, dx: number, dy: number) {
    const canvas = page.locator("#gameCanvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no bounding box");

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + dx, centerY + dy, { steps: 5 });
}

test.describe("Virtual joystick", () => {
    test("dragging right sends a MoveVector with positive x", async ({ page }) => {
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        await dragJoystick(page, 100, 0);
        await expect
            .poll(() => messages.some((m) => m.type === "move" && (m.x ?? 0) > 0.5 && Math.abs(m.y ?? 0) < 0.1))
            .toBe(true);

        await page.mouse.up();
        await expect.poll(() => messages.some((m) => m.type === "stop")).toBe(true);
    });

    test("dragging up sends a MoveVector with positive y (forward)", async ({ page }) => {
        // Screen y grows downward, so dragging up (negative dy) must map to
        // positive MoveVector.y.
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        await dragJoystick(page, 0, -100);
        await expect
            .poll(() => messages.some((m) => m.type === "move" && (m.y ?? 0) > 0.5 && Math.abs(m.x ?? 0) < 0.1))
            .toBe(true);

        await page.mouse.up();
    });

    test("releasing the joystick resets direction to zero", async ({ page }) => {
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        await dragJoystick(page, 100, 100);
        await expect.poll(() => messages.some((m) => m.type === "move" && (m.x ?? 0) > 0)).toBe(true);

        await page.mouse.up();
        await expect.poll(() => messages.some((m) => m.type === "stop")).toBe(true);

        messages.length = 0;
        await expect
            .poll(() => messages.some((m) => m.type === "move" && ((m.x ?? 0) !== 0 || (m.y ?? 0) !== 0)))
            .toBe(false);
    });

    test("small movements within the deadzone are ignored", async ({ page }) => {
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        // Deadzone is 10% of the 150px radius, i.e. 15px.
        await dragJoystick(page, 5, 5);
        await page.waitForTimeout(200);

        expect(messages.some((m) => m.type === "move" && ((m.x ?? 0) !== 0 || (m.y ?? 0) !== 0))).toBe(false);
    });
});

test.describe("Camera tilt buttons", () => {
    test("pressing up sends a tilt-up message", async ({ page }) => {
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        const upButton = page.locator("#tiltUp");
        await upButton.dispatchEvent("pointerdown");
        await expect
            .poll(() => messages.some((m) => m.type === "tilt" && m.direction === "up"))
            .toBe(true);
        await upButton.dispatchEvent("pointerup");
    });

    test("pressing down sends a tilt-down message", async ({ page }) => {
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        const downButton = page.locator("#tiltDown");
        await downButton.dispatchEvent("pointerdown");
        await expect
            .poll(() => messages.some((m) => m.type === "tilt" && m.direction === "down"))
            .toBe(true);
        await downButton.dispatchEvent("pointerup");
    });

    test("holding the button repeats the tilt message", async ({ page }) => {
        const messages = await captureMoveVectorMessages(page);
        await page.goto("/");

        const upButton = page.locator("#tiltUp");
        await upButton.dispatchEvent("pointerdown");
        await expect
            .poll(() => messages.filter((m) => m.type === "tilt" && m.direction === "up").length)
            .toBeGreaterThan(2);
        await upButton.dispatchEvent("pointerup");

        const countAfterRelease = messages.filter((m) => m.type === "tilt").length;
        await page.waitForTimeout(300);
        expect(messages.filter((m) => m.type === "tilt").length).toBe(countAfterRelease);
    });
});
