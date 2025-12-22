import json
import random
import sys
from pathlib import Path

from utils.csv_handler import CSVHandler
from utils.email_handler import GetMailContent
from utils.smtp_mailer import SMTPMailer

STATE_FILE = '.send_state.json'

def load_state():
    path = Path(STATE_FILE)
    if path.exists():
        return json.loads(path.read_text())
    return {'next_kind': 'fresh'}

def save_state(state):
    Path(STATE_FILE).write_text(json.dumps(state, indent=2))

def pick_leads(csv: CSVHandler, kind: str):
    return csv.get_fresh_leads() if kind == 'fresh' else csv.get_followup_leads()

def build_subject(lead, kind):
    base = f"{lead.get('Name', '')}, This is a collaboration request."
    if kind == 'followup' and not base.lower().startswith('re:'):
        return f"Re: {base}"
    return base

def main():
    csv = CSVHandler('leads.csv')
    mail_content = GetMailContent(base_folder='email-templates')
    mailer = SMTPMailer()

    state = load_state()
    first_choice = state.get('next_kind', 'fresh')
    second_choice = 'followup' if first_choice == 'fresh' else 'fresh'
    tried = []

    for kind in (first_choice, second_choice):
        tried.append(kind)
        leads = pick_leads(csv, kind)
        if not leads:
            continue

        lead = random.choice(leads)
        body = mail_content.get_content(lead, kind)
        subject = build_subject(lead, kind)

        if kind == 'fresh':
            msg_id = mailer.send(lead['Email'], subject, body)
            csv.update_status(lead['Email'], 'SENT', message_id=msg_id)
            print(f"FRESH SENT -> {lead['Email']} ({msg_id})")
        else:
            msg_id = lead.get('MessageId')
            if not msg_id:
                print(f"SKIP followup (missing MessageId) -> {lead['Email']}")
                continue
            mailer.send(lead['Email'], subject, body, in_reply_to=msg_id, message_id=None)
            csv.update_status(lead['Email'], 'f1', message_id=msg_id)
            print(f"FOLLOWUP SENT -> {lead['Email']} (reply to {msg_id})")

        next_kind = 'followup' if kind == 'fresh' else 'fresh'
        save_state({'next_kind': next_kind})
        return 0

    print(f"No eligible leads for kinds tried: {tried}")
    return 0

if __name__ == '__main__':
    sys.exit(main())
