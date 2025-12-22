# utils/smtp_mailer.py
import os
import smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

class SMTPMailer:
    def __init__(self):
        self.host = os.getenv('SMTP_HOST')
        self.port = int(os.getenv('SMTP_PORT') or 587)
        self.user = os.getenv('SMTP_USER')
        self.passwd = os.getenv('SMTP_PASS')
        self.from_name = os.getenv('FROM_NAME') or self.user

    def send(self, to_email, subject, html_body, text_body=None):
        if text_body is None:
            text_body = (html_body or '').replace('<br>', '\n').replace('<[^>]+>', '')
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{self.from_name} <{self.user}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        context = ssl.create_default_context()
        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls(context=context)
            server.login(self.user, self.passwd)
            server.sendmail(self.user, to_email, msg.as_string())
