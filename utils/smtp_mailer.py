import os
import re
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import make_msgid

class SMTPMailer:
    def __init__(self):
        self.host = os.getenv('SMTP_HOST')
        self.port = int(os.getenv('SMTP_PORT') or 587)
        self.user = os.getenv('SMTP_USER')
        self.passwd = os.getenv('SMTP_PASS')
        self.from_name = os.getenv('FROM_NAME') or self.user

    @staticmethod
    def _html_to_text(html_body: str) -> str:
        text = (html_body or '')
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
        return text

    def send(self, to_email, subject, html_body, text_body=None,
             in_reply_to=None, message_id=None):
        if text_body is None:
            text_body = self._html_to_text(html_body)

        msg = MIMEMultipart('alternative')
        msg['From'] = f"{self.from_name} <{self.user}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        mid = message_id or make_msgid(domain=self.user.split('@')[-1])
        msg['Message-ID'] = mid
        if in_reply_to:
            msg['In-Reply-To'] = in_reply_to
            msg['References'] = in_reply_to

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        context = ssl.create_default_context()
        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls(context=context)
            server.login(self.user, self.passwd)
            server.sendmail(self.user, to_email, msg.as_string())

        return mid
