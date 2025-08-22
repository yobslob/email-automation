import os
import random
import base64
from email.mime.text import MIMEText
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

class GetMailContent:
    PLATFORM_MAP = {
        'ig': 'Instagram',
        'yt': 'YouTube'
    }

    @classmethod
    def _expand_platform(cls, code):
        """Return full platform name for short code (ig/yt). If unknown, return the original value or empty string."""
        if code is None:
            return ''
        key = str(code).strip().lower()
        return cls.PLATFORM_MAP.get(key, code)

    @classmethod
    def _opposite_platform(cls, code):
        """Return the opposite platform full name. e.g. if code is 'yt' -> 'Instagram'"""
        if code is None:
            return ''
        key = str(code).strip().lower()
        if key == 'yt':
            return cls.PLATFORM_MAP.get('ig')  # 'Instagram'
        if key == 'ig':
            return cls.PLATFORM_MAP.get('yt')  # 'YouTube'
        return ''

    def __init__(self, template_folder='email-formats'):
        self.template_folder = template_folder
        self.templates = [f for f in os.listdir(template_folder) if os.path.isfile(os.path.join(template_folder, f))]

    def get_content(self, lead, template_file=None):
        if template_file:
            chosen_template = template_file
        else:
            chosen_template = random.choice(self.templates)
        with open(os.path.join(self.template_folder, chosen_template), 'r', encoding='utf-8') as f:
            content = f.read()

        # Make a shallow copy and expand platform shortcodes to full names
        expanded = dict(lead)

        # Normalize keys existence (handles missing keys gracefully)
        primary_raw = lead.get('PrimaryPlatform') or ''
        secondary_raw = lead.get('SecondaryPlatform') or ''

        # Expand explicit values
        if primary_raw:
            expanded['PrimaryPlatform'] = self._expand_platform(primary_raw)
        if secondary_raw:
            expanded['SecondaryPlatform'] = self._expand_platform(secondary_raw)

        # If one is missing, infer the other (useful fallback)
        if not primary_raw and secondary_raw:
            # infer primary from secondary
            inferred = self._opposite_platform(secondary_raw)
            if inferred:
                expanded['PrimaryPlatform'] = inferred
        if not secondary_raw and primary_raw:
            inferred = self._opposite_platform(primary_raw)
            if inferred:
                expanded['SecondaryPlatform'] = inferred

        # Safety: ensure keys exist so replacement won't crash
        if 'PrimaryPlatform' not in expanded:
            expanded['PrimaryPlatform'] = ''
        if 'SecondaryPlatform' not in expanded:
            expanded['SecondaryPlatform'] = ''

        # Replace placeholders like {Name}, {VideoName}, {PrimaryPlatform}, etc.
        for key, value in expanded.items():
            # convert None to empty string and cast to str
            safe_val = '' if value is None else str(value)
            content = content.replace(f'{{{key}}}', safe_val)

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
