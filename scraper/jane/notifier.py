from __future__ import annotations

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List

from loguru import logger

GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587


def build_email_body(notification: Dict[str, Any]) -> str:
    """Build a plain-text email body from notification info."""
    puzzle_name = notification.get("puzzle_name", "Unknown")
    puzzle_date = notification.get("puzzle_date", "")
    new_solvers: List[str] = notification.get("new_solvers", [])
    total_solvers: int = notification.get("total_solvers", 0)

    lines = [f"Jane Street Puzzle: {puzzle_name} ({puzzle_date})", ""]

    if new_solvers:
        lines.append(f"{len(new_solvers)} new solver(s) added today:")
        for name in new_solvers:
            lines.append(f"  - {name}")
    else:
        lines.append("No new solvers added today.")

    lines.append("")
    lines.append(f"Total solvers on leaderboard: {total_solvers}")
    return "\n".join(lines)


def send_notification(
    notification: Dict[str, Any],
    recipient: str = "jaceyang8@gmail.com",
) -> bool:
    """
    Send email notification about new solvers via Gmail SMTP.

    Requires environment variables:
      GMAIL_ADDRESS       - sender Gmail address
      GMAIL_APP_PASSWORD  - Gmail App Password (not account password)

    Returns True if sent successfully, False otherwise.
    """
    sender = os.environ.get("GMAIL_ADDRESS", "")
    app_password = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not sender or not app_password:
        logger.warning(
            "Email credentials not configured "
            "(set GMAIL_ADDRESS and GMAIL_APP_PASSWORD env vars). "
            "Skipping notification."
        )
        return False

    new_solvers = notification.get("new_solvers", [])
    puzzle_name = notification.get("puzzle_name", "Unknown")
    puzzle_date = notification.get("puzzle_date", "")

    if new_solvers:
        subject = f"[JS Puzzle] {len(new_solvers)} new solver(s) - {puzzle_name} ({puzzle_date})"
    else:
        subject = f"[JS Puzzle] No new solvers - {puzzle_name} ({puzzle_date})"

    body = build_email_body(notification)

    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(sender, app_password)
            server.sendmail(sender, [recipient], msg.as_string())
        logger.info(f"Notification email sent to {recipient}: {subject}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send notification email: {exc}")
        return False
