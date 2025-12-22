import pandas as pd

class CSVHandler:
    def __init__(self, filepath):
        self.filepath = filepath
        self.df = pd.read_csv(filepath)

    @staticmethod
    def _is_empty(value):
        return pd.isna(value) or str(value).strip() == ''

    def get_fresh_leads(self):
        mask = self.df['Status'].apply(self._is_empty)
        return self.df[mask].to_dict(orient='records')

    def get_followup_leads(self):
        def has_message_id(row):
            mid = row.get('MessageId')
            return not self._is_empty(mid)
        mask = (self.df['Status'] == 'SENT') & self.df.apply(has_message_id, axis=1)
        return self.df[mask].to_dict(orient='records')

    def update_status(self, email, status, message_id=None):
        idx = self.df['Email'] == email
        self.df.loc[idx, 'Status'] = status
        if message_id is not None:
            self.df.loc[idx, 'MessageId'] = message_id
        self.df.to_csv(self.filepath, index=False)
