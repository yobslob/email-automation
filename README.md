<<<<<<< HEAD
# Email Scheduler Web Application

A professional-grade, human-like email automation platform that sends personalized emails from CSV/Excel while randomizing send times, varying content, and tracking results — **without bot-like fingerprints**.

## About

This project builds an **intelligent email scheduling and personalization system** designed to:

* Replace unprofessional “automation stamps” like n8n’s footer.
* Reduce spam-flag risks through timing randomness, content variation, and gradual sending.
* Update recipient status dynamically in the source sheet.
* Support research-driven deliverability optimization.

> Target audience: freelancers, agencies, marketers, and researchers looking for **high-deliverability personalized outreach**.

<br>

## Execution Roadmap

### Phase 1 – Core MVP (Weeks 1–2)

**Focus:** A working end-to-end system without automation footprints.

* **Input Processing:** Upload & validate CSV/Excel, normalize columns.
* **Mail Personalization:** Support placeholders like `[name]`, `[company]`, `[video_name]`, with multiple template variants.
* **Randomized Scheduling:** 1 mail/hour at a random minute; queue-based execution.
* **Sending:** Gmail API/SMTP (OAuth2), proper `From` and `Reply-To`.
* **Tracking:** Live status updates (`SENT` / `FAILED`) written back to CSV.

<br>

### Phase 2 – Anti-Spam & Deliverability Boost (Weeks 3–4)

**Focus:** Move beyond a script into research-worthy territory.

* **Content Variation Engine:** Synonym swap, sentence shuffle, LLM paraphrasing.
* **Smart Cadence:** Human-like gaps, warm-up mode for new accounts.
* **Email Health Monitoring:** Open rate, CTR, bounce tracking.

<br>

### Phase 3 – Full Web App (Weeks 4–6)

**Focus:** Client-facing professional tool.

**Frontend (React + Tailwind)**

* File upload & mapping UI.
* Template manager with previews & test sends.
* Dashboard for queue, logs, analytics.

**Backend (FastAPI / Node.js)**

* Template parser.
* Email scheduler & queue.
* API endpoints for upload, campaign control, export.

**Infra**

* Dockerized, CI/CD integrated, deployed on free-tier hosting.
* Background job workers for send scheduling.

<br>

### Phase 4 – Research & Paper (Weeks 6–8)

**Potential Topics:**

* Impact of send-time jitter on deliverability.
* Effect of template diversity on spam detection.
* Human behavior simulation for outreach.
* Optimal account rotation strategies.

**Data Collection:** Open/click rates, spam scores, bounce rates — ready for statistical analysis.

<br>

## Extra Enhancements

* Multi-provider support (Gmail, Outlook, SMTP).
* Auto-retry failed sends in the next slot.
* Spam score checker before sending.

<br>

## Tech Stack

* **Frontend:** Next.js / React + TailwindCSS
* **Backend:** FastAPI (Python) or Node.js (Express)
* **Queue/Scheduler:** Redis + BullMQ / Celery
* **Email Providers:** Gmail API (OAuth2), SMTP, transactional APIs
* **Deployment:** Docker + CI/CD → Render / Railway / Cloud Run

<br>

## Research Impact

By combining engineering with measured deliverability experiments, this project can form the basis for:

* Conference papers.
* Portfolio showcase for engineering judgment.
* A production-ready SaaS.
=======
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
>>>>>>> 3905e7c (Replace JS code with Python implementation)
