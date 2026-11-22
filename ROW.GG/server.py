from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        requested = (ROOT / self.path.lstrip("/").split("?", 1)[0]).resolve()
        try:
            requested.relative_to(ROOT)
        except ValueError:
            self.send_error(404)
            return
        if not requested.exists() or requested.is_dir() and not (requested / "index.html").exists():
            self.path = "/index.html"
        super().do_GET()

if __name__ == "__main__":
    print("ROW.GG running at http://localhost:3000")
    ThreadingHTTPServer(("127.0.0.1", 3000), SPAHandler).serve_forever()
