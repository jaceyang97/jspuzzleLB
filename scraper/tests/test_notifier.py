import ssl
import unittest
from unittest.mock import patch

from scraper.jane.notifier import send_notification


class NotificationSecurityTests(unittest.TestCase):
    @patch.dict("os.environ", {"GMAIL_ADDRESS": "sender@example.com", "GMAIL_APP_PASSWORD": "fixture-password"}, clear=True)
    @patch("scraper.jane.notifier.smtplib.SMTP")
    def test_defaults_to_configured_sender_and_verifies_tls(self, smtp):
        self.assertTrue(send_notification({}))
        smtp.assert_called_once_with("smtp.gmail.com", 587, timeout=10)
        server = smtp.return_value.__enter__.return_value
        context = server.starttls.call_args.kwargs["context"]
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)
        self.assertEqual(server.sendmail.call_args.args[:2], ("sender@example.com", ["sender@example.com"]))

    @patch.dict("os.environ", {"GMAIL_ADDRESS": "sender@example.com", "GMAIL_APP_PASSWORD": "fixture-password", "NOTIFICATION_TO": "recipient@example.com"}, clear=True)
    @patch("scraper.jane.notifier.smtplib.SMTP")
    def test_recipient_can_be_configured_without_source_changes(self, smtp):
        self.assertTrue(send_notification({}))
        server = smtp.return_value.__enter__.return_value
        self.assertEqual(server.sendmail.call_args.args[1], ["recipient@example.com"])

    @patch.dict("os.environ", {}, clear=True)
    @patch("scraper.jane.notifier.smtplib.SMTP")
    def test_missing_credentials_do_not_connect(self, smtp):
        self.assertFalse(send_notification({}))
        smtp.assert_not_called()
