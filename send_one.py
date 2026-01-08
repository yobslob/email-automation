import random
import sys
from datetime import datetime, timezone

from utils.csv_handler import CSVHandler
from utils.email_handler import GetMailContent
from utils.smtp_mailer import SMTPMailer


def build_subject(lead, kind):
    base = f"{lead.get('Name', '')}, This is a collaboration request."
    if kind == 'followup' and not base.lower().startswith('re:'):
        return f"Re: {base}"
    return base


def now_utc_iso():
    # Example: 2026-01-08T14:05:33Z
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def main():
    csv = CSVHandler('leads.csv')
    mail_content = GetMailContent(base_folder='email-templates')
    mailer = SMTPMailer()

    # 1) Prefer follow-ups that are due (>= 4 days since fresh mail)
    followups = csv.get_followup_leads_due(days=4)
    if followups:
        lead = random.choice(followups)

        msg_id = lead.get('MessageId')
        if not msg_id:
            # Shouldn't happen because selector filters it out, but keep safe.
            print(f"SKIP followup (missing MessageId) -> {lead.get('Email')}")
            return 0

        body = mail_content.get_content(lead, 'followup')
        subject = build_subject(lead, 'followup')

        mailer.send(
            lead['Email'],
            subject,
            body,
            in_reply_to=msg_id,
            message_id=None,  # let SMTPMailer generate a new Message-ID for the reply
        )

        csv.update_status(lead['Email'], 'f1', last_sent_at=now_utc_iso())
        print(f"FOLLOWUP SENT -> {lead['Email']} (reply to {msg_id})")
        return 0

    # 2) Otherwise send one fresh email (if any)
    fresh = csv.get_fresh_leads()
    if fresh:
        lead = random.choice(fresh)

        body = mail_content.get_content(lead, 'fresh')
        subject = build_subject(lead, 'fresh')

        msg_id = mailer.send(lead['Email'], subject, body)
        csv.update_status(lead['Email'], 'SENT', message_id=msg_id, last_sent_at=now_utc_iso())
        print(f"FRESH SENT -> {lead['Email']} ({msg_id})")
        return 0

    print("No eligible leads (no fresh leads, and no follow-ups due).")
    return 0


if __name__ == '__main__':
    sys.exit(main())