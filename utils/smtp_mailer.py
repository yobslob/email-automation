# utils/smtp_mailer.py
import os
import smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import make_msgid, formataddr

class SMTPMailer:
    def __init__(self):
        self.host = os.getenv('SMTP_HOST')
        self.port = int(os.getenv('SMTP_PORT') or 587)
        self.user = os.getenv('SMTP_USER')
        self.passwd = os.getenv('SMTP_PASS')
        self.from_name = os.getenv('FROM_NAME') or self.user

    # utils/smtp_mailer.py  (replace send method)
    def send(self, to_email, subject, html_body, text_body=None, in_reply_to=None):
        """
        Sends an email and returns the Message-ID used for the sent message (string).
        If `in_reply_to` is provided it will be set in both 'In-Reply-To' and 'References'.
        """
        if text_body is None:
            text_body = (html_body or '').replace('<br>', '\n').replace('<[^>]+>', '')

        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr((self.from_name, self.user))
        msg['To'] = to_email

        # Ensure subject is plain str
        msg['Subject'] = str(subject)

        # Normalize in_reply_to: ensure angle brackets
        if in_reply_to:
            in_reply_to = str(in_reply_to).strip()
            if not (in_reply_to.startswith('<') and in_reply_to.endswith('>')):
                in_reply_to = f'<{in_reply_to}>'
            msg['In-Reply-To'] = in_reply_to
            msg['References'] = in_reply_to

        # Generate a Message-ID we control (storeable)
        try:
            domain = self.user.split('@', 1)[1]
        except Exception:
            domain = None

        if domain:
            message_id = make_msgid(domain=domain)
        else:
            message_id = make_msgid()

        msg['Message-ID'] = message_id

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        context = ssl.create_default_context()
        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls(context=context)
            server.login(self.user, self.passwd)
            server.sendmail(self.user, to_email, msg.as_string())

        return message_id