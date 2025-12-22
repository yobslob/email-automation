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
    def __init__(self, template_folder='email-formats'):
        """
        Expects:
         - email-formats/fresh/  (optional)
         - email-formats/followup/ (optional)
        If subfolders do not exist, falls back to files inside template_folder.
        """
        self.template_folder = template_folder
        # list top-level templates as fallback
        self.templates = []
        if os.path.isdir(template_folder):
            try:
                self.templates = os.listdir(template_folder)
            except Exception:
                self.templates = []

    def _list_templates_for_type(self, mail_type):
        # Prefer subfolder e.g. email-formats/fresh
        folder = os.path.join(self.template_folder, mail_type)
        if os.path.isdir(folder):
            files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
            return [os.path.join(folder, f) for f in files]
        # fallback: try top-level templates (no subfolders)
        if self.templates:
            return [os.path.join(self.template_folder, f) for f in self.templates if os.path.isfile(os.path.join(self.template_folder, f))]
        return []

    def get_content(self, lead: dict, mail_type: str = None, template_file: str = None):
        """
        mail_type: 'fresh' or 'followup' (optional)
        template_file: full path to a specific template file (optional)
        """
        chosen_path = None

        if template_file and os.path.isfile(template_file):
            chosen_path = template_file
        else:
            if mail_type:
                candidates = self._list_templates_for_type(mail_type)
            else:
                # no mail_type requested, use any top-level templates
                candidates = [os.path.join(self.template_folder, f) for f in self.templates if os.path.isfile(os.path.join(self.template_folder, f))]

            if candidates:
                chosen_path = random.choice(candidates)

        if not chosen_path:
            raise FileNotFoundError(f"No email templates found for mail_type='{mail_type}' in '{self.template_folder}'")

        with open(chosen_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace {placeholders} with lead values
        for key, value in lead.items():
            content = content.replace(f'{{{key}}}', '' if value is None else str(value))

        return content


# ---------------------- GMAIL SENDER ----------------------
# (unchanged) Keep your existing Gmail sender if you use it

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

def send_message(self, message, thread_id=None):
    try:
        body = {"raw": message}

        # 👇 THIS is what enables Gmail threading
        if thread_id:
            body["threadId"] = thread_id

        sent = self.service.users().messages().send(
            userId='me',
            body=body
        ).execute()

        print("Message sent:", sent["id"], "Thread:", sent["threadId"])
        return sent

    except Exception as e:
        print("Send failed:", e)
        return None
