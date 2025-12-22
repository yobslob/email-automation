# Email Automation

This project is a Python application that automates sending personalized emails to a list of leads from a CSV file.

## Features

- Reads leads from a CSV file.
- Sends personalized emails using Gmail API.
- Uses email templates to generate email content.
- Updates the status of the lead in the CSV file after sending the email.

## Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up Gmail API credentials:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project.
   - Enable the Gmail API.
   - Create credentials for a "Desktop app".
   - Download the `credentials.json` file and place it in the root directory of the project.

## Usage

1. **Add your leads to the `leads.csv` file.** The file should have the following columns: `Name`, `Email`, `PrimaryPlatform`, `SecondaryPlatform`, `LessSubs`, `VideoName`, `Status`.

2. **Run the application:**
   ```bash
   python app.py
   ```

   The first time you run the application, it will open a browser window to authenticate with your Google account. After successful authentication, it will create a `token.json` file in the root directory.

3. **Check the output:** The application will log the status of each email sent in the console. The `Status` column in the `leads.csv` file will be updated to `DONE` for each lead that successfully receives an email.
