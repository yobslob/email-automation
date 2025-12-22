import random
import sys
from datetime import datetime, timedelta, timezone

from utils.csv_handler import CSVHandler
from utils.email_handler import GetMailContent
from utils.smtp_mailer import SMTPMailer


def get_ist_hour():
    # IST = UTC + 5:30
    ist = datetime.now(timezone.utc).astimezone(
        timezone(timedelta(hours=5, minutes=30))
    )
    return ist.hour


def main():
    csv = CSVHandler('leads.csv')
    mailer = SMTPMailer()
    mail_content = GetMailContent()

    hour = get_ist_hour()

    # ---------------- EVEN HOURS → FRESH MAIL ----------------
    if hour % 2 == 0:
        leads = csv.get_pending_leads(mail_type='fresh')  # empty Status only

        if not leads:
            print("Even hour: No fresh leads available. Skipping.")
            return 0

        lead = random.choice(leads)
        body = mail_content.get_content(lead, mail_type='fresh')
        subject = f"{lead.get('Name', '')}, This is a collaboration request."

        try:
            message_id = mailer.send(lead['Email'], subject, body)
            # Save message id and set status to SENT
            csv.update_status(lead['Email'], status='SENT', message_id=message_id)
            print(f"FRESH mail sent to {lead['Email']} (Message-ID: {message_id})")
        except Exception as e:
            print(f"FAILED sending fresh mail to {lead['Email']}: {e}")
            csv.update_status(lead['Email'], status='FAILED')

        return 0

    # ---------------- ODD HOURS → FOLLOW-UP MAIL ----------------
    else:
        leads = csv.get_pending_leads(mail_type='followup')  # Status == SENT

        if not leads:
            print("Odd hour: No follow-up leads available. Skipping.")
            return 0

        lead = random.choice(leads)
        body = mail_content.get_content(lead, mail_type='followup')

        # Determine In-Reply-To header value
        prev_msg_id = lead.get('MessageId')
        # normalize empty strings / NaN
        if isinstance(prev_msg_id, float):
            prev_msg_id = None
        if prev_msg_id:
            prev_msg_id = str(prev_msg_id).strip()
            # ensure angle brackets present
            if not (prev_msg_id.startswith('<') and prev_msg_id.endswith('>')):
                prev_msg_id = f'<{prev_msg_id}>'

        # Compose subject for follow-up — prefer 'Re:' to help threading
        base_subject = f"{lead.get('Name', '')}, This is a collaboration request."
        subject = f"Re: {base_subject}"

        try:
            if prev_msg_id:
                # send as reply (In-Reply-To)
                message_id = mailer.send(lead['Email'], subject, body, in_reply_to=prev_msg_id)
                # update status to follow-up done (f1) — keep original MessageId (thread root)
                csv.update_status(lead['Email'], status='f1')
                print(f"FOLLOW-UP mail (reply) sent to {lead['Email']} (In-Reply-To: {prev_msg_id})")
            else:
                # No previous message id — fallback to sending fresh and capture message id
                message_id = mailer.send(lead['Email'], subject, body)
                csv.update_status(lead['Email'], status='f1', message_id=message_id)
                print(f"FOLLOW-UP mail sent as fresh (no prev MessageId) to {lead['Email']} (Message-ID: {message_id})")
        except Exception as e:
            print(f"FAILED sending follow-up mail to {lead['Email']}: {e}")
            csv.update_status(lead['Email'], 'FAILED')

        return 0


if __name__ == '__main__':
    sys.exit(main())
