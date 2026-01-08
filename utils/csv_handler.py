import pandas as pd
from datetime import datetime, timezone, timedelta


class CSVHandler:
    def __init__(self, filepath):
        self.filepath = filepath
        self.df = pd.read_csv(filepath)

        # Ensure columns exist (helps when upgrading an existing leads.csv)
        for col in ["Status", "MessageId", "LastSentAt"]:
            if col not in self.df.columns:
                self.df[col] = pd.NA

    @staticmethod
    def _is_empty(value):
        return pd.isna(value) or str(value).strip() == ''

    @staticmethod
    def _parse_iso_utc(value):
        """
        Accepts:
          - 2026-01-08T14:05:33Z
          - 2026-01-08T14:05:33+00:00
        Returns a timezone-aware datetime in UTC, or None.
        """
        if pd.isna(value):
            return None
        s = str(value).strip()
        if not s:
            return None

        try:
            # Handle Zulu suffix
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                # assume UTC if timestamp was naive
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            return None

    def get_fresh_leads(self):
        mask = self.df['Status'].apply(self._is_empty)
        return self.df[mask].to_dict(orient='records')

    def get_followup_leads_due(self, days: int = 4):
        """
        Eligible for ONE follow-up total:
          - Status == 'SENT'
          - MessageId present
          - LastSentAt present and <= now - days
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=days)

        def row_is_due(row):
            if str(row.get("Status", "")).strip() != "SENT":
                return False

            mid = row.get("MessageId")
            if self._is_empty(mid):
                return False

            last_sent = self._parse_iso_utc(row.get("LastSentAt"))
            if last_sent is None:
                return False

            return last_sent <= cutoff

        mask = self.df.apply(row_is_due, axis=1)
        return self.df[mask].to_dict(orient='records')

    def update_status(self, email, status, message_id=None, last_sent_at=None):
        idx = self.df['Email'] == email
        self.df.loc[idx, 'Status'] = status

        if message_id is not None:
            self.df.loc[idx, 'MessageId'] = message_id

        if last_sent_at is not None:
            self.df.loc[idx, 'LastSentAt'] = last_sent_at

        self.df.to_csv(self.filepath, index=False)