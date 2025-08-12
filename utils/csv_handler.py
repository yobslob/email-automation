
import pandas as pd

class CSVHandler:
    def __init__(self, filepath):
        self.filepath = filepath
        self.df = pd.read_csv(filepath)

    def get_unprocessed_leads(self):
        unprocessed = self.df[self.df['Status'].isna() | (self.df['Status'] == '')]
        return unprocessed.to_dict(orient='records')

    def update_status(self, email, status):
        self.df.loc[self.df['Email'] == email, 'Status'] = status
        self.df.to_csv(self.filepath, index=False)
