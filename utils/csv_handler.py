# utils/csv_handler.py
import pandas as pd

class CSVHandler:
    def __init__(self, filepath):
        self.filepath = filepath
        self.df = pd.read_csv(filepath)

    def get_pending_leads(self, mail_type='fresh'):
        """
        mail_type: 'fresh' -> leads with empty/NaN Status
                   'followup' -> leads with Status == 'SENT'
        """
        if mail_type == 'fresh':
            unprocessed = self.df[self.df['Status'].isna() | (self.df['Status'] == '')]
        elif mail_type == 'followup':
            unprocessed = self.df[self.df['Status'] == 'SENT']
        else:
            # default to fresh
            unprocessed = self.df[self.df['Status'].isna() | (self.df['Status'] == '')]

        return unprocessed.to_dict(orient='records')

    def update_status(self, email, status=None, message_id=None):
        """
        Update Status and/or MessageId for a lead identified by email.
        Pass status or message_id or both.
        """
        if status is not None:
            self.df.loc[self.df['Email'] == email, 'Status'] = status
        if message_id is not None:
            # store message id exactly as returned (including angle brackets)
            self.df.loc[self.df['Email'] == email, 'MessageId'] = message_id

        self.df.to_csv(self.filepath, index=False)
