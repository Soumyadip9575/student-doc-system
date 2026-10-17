# Student Document Distribution System

A web application for **Brainware University (CSE-AIML)** that lets administrators create forms, collect student responses, and generate and email personalised PDF documents.

**Live demo:** https://student-doc-system.vercel.app

## Features

- Email OTP authentication (Google sign-in optional)
- Admin Form Builder with per-user access control
- Invitation-based student registration
- Student panel for submitting assigned forms
- PDF generation and email delivery to students
- Duplicate-send prevention (one delivery per record and purpose)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14, TypeScript |
| Database | PostgreSQL (Neon) with Prisma ORM |
| Authentication | Auth.js |
| PDF | pdf-lib |
| Email | Brevo transactional email API |
| Hosting | Vercel |

## Getting Started (Local Development)

1. Clone the repository and install dependencies:
```bash
   git clone https://github.com/Soumyadip9575/student-doc-system.git
   cd student-doc-system
   npm install
```
2. Copy `.env.example` to `.env` and fill in the values (see the table below).
3. Create the database tables:
```bash
   npx prisma db push
```
4. Start the development server:
```bash
   npm run dev
```
5. Open http://localhost:3000.

With `DEMO_MODE=true`, no real email is sent and the OTP is printed in the terminal.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (host contains `-pooler`) |
| `DIRECT_URL` | Neon direct connection string |
| `AUTH_SECRET` | Random secret, generate with `openssl rand -hex 32` |
| `AUTH_URL` | Public HTTPS URL of the deployment |
| `ADMIN_EMAILS` | Comma-separated administrator emails |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `EMAIL_FROM` | Verified Brevo sender, e.g. `University Administration <name@example.com>` |
| `UNIVERSITY_NAME` | Name shown in the interface and documents |
| `DEPARTMENT_NAME` | Department name |
| `DEMO_MODE` | `true` for local testing, `false` in production |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional, only for Google sign-in |

Never commit `.env`. It is excluded through `.gitignore`.

## Deployment (Free Tier: Vercel + Neon + Brevo)

1. Create free accounts on Vercel, Neon and Brevo, and verify a sender email in Brevo.
2. In Neon, create a project. Use the pooled URL as `DATABASE_URL` and the direct URL as `DIRECT_URL`.
3. Run `npx prisma db push` once with these values to create the tables.
4. In Brevo, create an API key with the Transactional email permission.
5. Push the code to GitHub and import the repository in Vercel.
6. Add all environment variables in Vercel under Settings, then Environment Variables.
7. Deploy, then set `AUTH_URL` to the production URL and redeploy.
8. If Google sign-in is enabled, add `https://<your-domain>/api/auth/callback/google` to the authorised redirect URIs in Google Cloud.

## Usage

1. An administrator signs in with an email listed in `ADMIN_EMAILS`.
2. The administrator creates a form in **Form Builder** and grants access to user emails.
3. Invited users register, sign in with OTP and submit the form in **User Panel**.
4. The administrator reviews responses and sends PDFs from **Generate Documents**.

## Limitations

- Free tiers have quotas and may sleep, scale to zero or change terms.
- Vercel Hobby is for personal, non-commercial use, and functions time out after 300 seconds.
- Brevo free plan allows about 300 emails per day.
- Emails from a free Gmail sender may land in spam, so ask recipients to check their Spam folder.
- Do not store sensitive university records on third-party free tiers without institutional approval.

## Author

**Soumyadip Karak** — Brainware University, CSE-AIML
GitHub: [@Soumyadip9575](https://github.com/Soumyadip9575)