import logging

from camera_stream_service.camera_stream_service import run

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
