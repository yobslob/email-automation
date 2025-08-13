# send_one.py
import random, sys
from utils.csv_handler import CSVHandler
from utils.email_handler import GetMailContent  # keep your templating
from utils.smtp_mailer import SMTPMailer

def main():
    csv = CSVHandler('leads.csv')
    leads = csv.get_unprocessed_leads()
    if not leads:
        print("No unprocessed leads.")
        return 0

    lead = random.choice(leads)
    mailer = SMTPMailer()
    mail_content = GetMailContent()
    body = mail_content.get_content(lead)
    subject = f"{lead.get('Name', '')} doesn't deserve {lead.get('LessSubs', '')} followers."
    try:
        mailer.send(lead['Email'], subject, body)
        csv.update_status(lead['Email'], 'SENT')
        print(f"SENT -> {lead['Email']}")
    except Exception as e:
        print(f"FAILED -> {lead['Email']}: {e}")
        csv.update_status(lead['Email'], 'FAILED')
    return 0

if __name__ == '__main__':
    sys.exit(main())
