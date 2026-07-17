import io
import logging
import socketserver
from http import server
from threading import Condition

from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder, Quality
from picamera2.outputs import FileOutput

logger = logging.getLogger(__name__)

WIDTH = 640
HEIGHT = 480
FRAMERATE = 24
PORT = 8001
STREAM_PATH = "/stream.mjpg"


class _StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()


class _StreamingHandler(server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != STREAM_PATH:
            self.send_response(404)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Age", "0")
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=FRAME")
        self.end_headers()
        try:
            while True:
                with self.server.output.condition:
                    self.server.output.condition.wait()
                    frame = self.server.output.frame
                self.wfile.write(b"--FRAME\r\n")
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(frame)))
                self.end_headers()
                self.wfile.write(frame)
                self.wfile.write(b"\r\n")
        except (BrokenPipeError, ConnectionResetError):
            logger.info("Video client disconnected")

    def log_message(self, format, *args):
        pass


class _StreamingServer(socketserver.ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, address, handler, output):
        super().__init__(address, handler)
        self.output = output


def run() -> None:
    output = _StreamingOutput()

    picam2 = Picamera2()
    config = picam2.create_video_configuration(
        main={"size": (WIDTH, HEIGHT)},
        controls={"FrameRate": FRAMERATE},
    )
    picam2.configure(config)
    picam2.start_recording(MJPEGEncoder(), FileOutput(output), quality=Quality.MEDIUM)
    logger.info("Camera started (%dx%d @ %dfps)", WIDTH, HEIGHT, FRAMERATE)

    streaming_server = _StreamingServer(("0.0.0.0", PORT), _StreamingHandler, output)
    logger.info("Camera stream server started on http://0.0.0.0:%d%s", PORT, STREAM_PATH)
    try:
        streaming_server.serve_forever()
    finally:
        picam2.stop_recording()
