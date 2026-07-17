const STREAM_URL = `http://${location.hostname}:8001/stream.mjpg`;

const videoElement = document.getElementById("videoStream") as HTMLImageElement;
const toggleButton = document.getElementById("videoToggle") as HTMLButtonElement;

let streaming = false;

function setStreaming(next: boolean) {
    streaming = next;
    if (streaming) {
        videoElement.src = STREAM_URL;
        videoElement.style.display = "block";
        toggleButton.textContent = "Video: An";
        toggleButton.setAttribute("aria-pressed", "true");
    } else {
        videoElement.removeAttribute("src");
        videoElement.style.display = "none";
        toggleButton.textContent = "Video: Aus";
        toggleButton.setAttribute("aria-pressed", "false");
    }
}

toggleButton.addEventListener("click", () => setStreaming(!streaming));

setStreaming(false);
