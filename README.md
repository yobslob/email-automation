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