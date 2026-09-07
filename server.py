import json
import os
import smtplib
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8000"))
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM = os.environ.get("SMTP_FROM")
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"


def send_email(recipient, subject, message, extras=None):
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        raise RuntimeError("SMTP credentials are not configured.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM or SMTP_USERNAME
    msg["To"] = recipient
    body_lines = [message]
    if extras:
        for key, value in extras.items():
            if value is not None and value != "":
                body_lines.append("")
                body_lines.append(f"{key}: {value}")
    msg.set_content("\n".join(body_lines))

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    if SMTP_USE_TLS:
        server.starttls()
    server.login(SMTP_USERNAME, SMTP_PASSWORD)
    server.send_message(msg)
    server.quit()


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/send":
            self.handle_send()
            return
        self.send_error(404, "Not found")

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/send":
            self.send_error(405, "Use POST to send form data.")
            return
        super().do_GET()

    def handle_send(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = self.rfile.read(content_length)
            data = json.loads(payload.decode("utf-8") or "{}")
        except Exception as exc:
            self.send_json({"success": False, "error": f"Invalid JSON payload: {exc}"}, 400)
            return

        subject = data.get("subject") or "New website inquiry"
        recipient = data.get("recipient") or SMTP_FROM or SMTP_USERNAME
        message = data.get("message") or "No message provided."
        extras = {k: v for k, v in data.items() if k not in {"subject", "message", "recipient"}}

        try:
            send_email(recipient, subject, message, extras)
            self.send_json({"success": True, "message": "Email sent successfully."}, 200)
        except Exception as exc:
            self.send_json({"success": False, "error": str(exc)}, 500)

    def send_json(self, payload, status_code):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        print("SMTP is not configured yet. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM in your environment before using /send.")

    print(f"Starting site server on http://localhost:{PORT}")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SiteHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()
