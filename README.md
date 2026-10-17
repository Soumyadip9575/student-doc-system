# Student Document Distribution System

Next.js 14 + Prisma/PostgreSQL + Auth.js + pdf-lib + Brevo transactional email API.

## Run locally
1. `npm install`
2. Open `.env`: set `DATABASE_URL`, `DIRECT_URL`, `ADMIN_EMAILS`, `BREVO_API_KEY`, `EMAIL_FROM` to a verified Brevo sender, and `AUTH_SECRET`. Google OAuth values are optional; email OTP is also supported.
3. Run `npx prisma db push` to create or update the database tables.
4. Run `npm run dev` and open http://localhost:3000.

With `DEMO_MODE=true`, no real email is sent and the OTP prints in the terminal. To send registration and login codes to users, set `DEMO_MODE=false` and configure a Brevo API key plus a verified sender address. Registration requires an active form invitation for the email address; the registration page will report if one is missing.

## Free-tier deployment (Vercel + Neon + Brevo)
This avoids Railway's paid-plan requirement. Free tiers have quotas, can sleep or scale to zero, and are not an uptime guarantee. Check provider terms before using this for university production data. Vercel Hobby is intended for personal, non-commercial use.

1. Create free accounts at [Vercel](https://vercel.com), [Neon](https://neon.com), and [Brevo](https://www.brevo.com). In Brevo, register and verify the sender email address you will use.
2. In Neon, create a PostgreSQL project and copy both connection strings: use the **pooled** URL (hostname contains `-pooler`) as `DATABASE_URL`; use the **direct** URL as `DIRECT_URL`.
3. In Brevo, create a transactional email API key. Keep it private; do not paste it into source code or commit it.
4. In PowerShell, open this project directory and link it to a new Vercel project:
   ```powershell
   npm install --global vercel
   vercel login
   vercel link
   ```
5. In Vercel project **Settings → Environment Variables**, add `DATABASE_URL`, `DIRECT_URL`, `BREVO_API_KEY`, `EMAIL_FROM` (the verified sender, e.g. `University Administration <your-verified-address@example.com>`), `AUTH_SECRET` (a newly generated random value), `AUTH_URL` (the HTTPS deployment URL), `ADMIN_EMAILS`, `UNIVERSITY_NAME`, `DEPARTMENT_NAME`, and `DEMO_MODE=false`. Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` only if Google sign-in is configured. Never deploy `.env`; it is excluded from Git.
6. After saving the production variables, create the production database tables with `vercel env run --environment production -- npx prisma db push`. Confirm that the linked Vercel project/environment and `DIRECT_URL` point to the new production database; this command changes its schema.
7. Run `vercel --prod`. Open the production URL, update `AUTH_URL` to that URL in Vercel, then redeploy. Test OTP delivery, admin login, registration, invitations, and document email delivery. If Google sign-in is enabled, add `https://<your-production-domain>/api/auth/callback/google` to the authorized redirect URIs in Google Cloud and redeploy.

The Neon database starts empty; local records are not copied. Back up and import any data needed before switching users. Don't put sensitive university records on third-party free tiers unless the university approves their data-protection terms. Vercel Hobby functions have a 300-second maximum duration, so large document-processing batches may time out. Configure usage alerts/limits where available; free plans can change or suspend service when quotas are reached.

## Admin and user workflow
- Add administrator emails to `ADMIN_EMAILS`.
- Admins create forms in **Form Builder**, then grant access by entering user email addresses.
- Invited users sign in with an authorized email and OTP, then submit assigned forms in **User Panel**.
- Admins review responses and generate/send PDFs from **Generate Documents**.
- Form definitions, access grants, and responses are stored in the application database; Google Sheets is not used.

## Duplicate prevention
`Delivery` has `UNIQUE(recordId, purpose)`; records are claimed atomically, so repeat or concurrent sends skip already-claimed records. Only FAILED deliveries are re-claimed on retry.

## Notes
Email delivery requires a valid Brevo API key and verified sender. User access is granted per active form and revoked when that form is paused.
