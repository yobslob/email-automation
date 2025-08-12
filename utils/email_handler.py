import os
import random
import base64
from email.mime.text import MIMEText
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

class GetMailContent:
    def __init__(self, template_folder='email-formats'):
        self.template_folder = template_folder
        self.templates = [f for f in os.listdir(template_folder) if os.path.isfile(os.path.join(template_folder, f))]

    def get_content(self, lead, template_file=None):
        if template_file:
            chosen_template = template_file
        else:
            chosen_template = random.choice(self.templates)
        with open(os.path.join(self.template_folder, chosen_template), 'r') as f:
            content = f.read()

        for key, value in lead.items():
            content = content.replace(f'{{{key}}}', str(value))

        return content

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
                # You need to have a credentials.json file from Google Cloud Console
                # See: https://developers.google.com/gmail/api/quickstart/python
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, self.scopes)
                creds = flow.run_local_server(port=0)
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())
        return build('gmail', 'v1', credentials=creds)

    def create_message(self, to, subject, message_text):
        message = MIMEText(message_text)
        message['to'] = to
        message['subject'] = subject
        return {'raw': base64.urlsafe_b64encode(message.as_bytes()).decode()}

    def send_message(self, message):
        try:
            message = (self.service.users().messages().send(userId='me', body=message)
                       .execute())
            print(f"Message Id: {message['id']}")
            return message
        except Exception as e:
            print(f'An error occurred: {e}')
            return None