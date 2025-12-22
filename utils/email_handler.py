import os
import random
import base64
from email.mime.text import MIMEText

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request


# ---------------------- TEMPLATE ENGINE ----------------------

class GetMailContent:
    def __init__(self, base_folder='email-templates'):
        self.base_folder = base_folder

    def get_content(self, lead: dict, kind: str, template_file=None):
        folder = os.path.join(self.base_folder, kind)
        if template_file:
            chosen = template_file
        else:
            templates = [
                t for t in os.listdir(folder)
                if os.path.isfile(os.path.join(folder, t))
            ]
            if not templates:
                raise FileNotFoundError(f"No templates in {folder}")
            chosen = random.choice(templates)

        with open(os.path.join(folder, chosen), 'r', encoding='utf-8') as f:
            content = f.read()

        for key, value in lead.items():
            content = content.replace(f'{{{key}}}', '' if value is None else str(value))

        return content

# ---------------------- GMAIL SENDER ----------------------

class SendMail:
    def __init__(self, credentials_file='credentials.json', token_file='token.json'):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.scopes = ['https://www.googleapis.com/auth/gmail.send']
        self.service = self._get_gmail_service()

    def _get_gmail_service(self):
        creds = None

        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, self.scopes)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, self.scopes
                )
                creds = flow.run_local_server(port=0)

            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())

        return build('gmail', 'v1', credentials=creds)

    def create_message(self, to, subject, message_text):
        message = MIMEText(message_text)
        message['to'] = to
        message['subject'] = subject

        return {
            'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()
        }

    def send_message(self, message):
        try:
            sent = self.service.users().messages().send(
                userId='me',
                body=message
            ).execute()

            print("Message sent:", sent['id'])
            return sent

        except Exception as e:
            print("Send failed:", e)
            return None
