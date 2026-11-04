# Connecting MediPassport's real services

MediPassport runs without any account. Some services are live with no setup.
Others need credentials that only you can create. Secret keys never go into
the browser or this repository. They are stored as Supabase Edge Function secrets.

| Service | Status without setup | What you need |
|---|---|---|
| OpenStreetMap tiles, Overpass (facilities), Nominatim (place search) | **Live** | Nothing |
| pdf.js (PDF text), Tesseract.js (OCR) | **Live, on the device** | Nothing |
| Offline medical glossary (12 languages) | **Live** | Nothing |
| Accounts, database, private file storage | Not connected | Supabase project (free tier) |
| Server-verified, revocable QR shares | Demo links only | Supabase + `share-open` function |
| Translation into any language | Glossary only | Google Cloud Translation **or** DeepL **or** Anthropic key |
| AI extraction from OCR/PDF text, doctor summary | Glossary matching only | Anthropic key |
| Insurer policy connections, network verification | **Simulated by design** | Needs official insurer APIs (none connected) |

In the app, **Profile → Connected services** (`#/app/setup`) checks each service live and shows what's missing.

---

## 1. Create a Supabase project (about 5 minutes)

1. Sign up at <https://supabase.com> and create a project (free tier).
2. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key.
   Never use the `service_role` / secret key in the app. The app refuses it.

## 2. Create the tables, security rules and storage bucket

**SQL Editor → New query**: paste [`supabase/migrations/001_medipassport.sql`](../supabase/migrations/001_medipassport.sql) and run it.

This creates:

- `profiles`, `policies`, `documents`, `shares` and `share_events` tables with **Row Level Security**, so each user can read and write only their own rows.
- A **private** storage bucket `medical-documents`. Files live at `<user id>/<uuid>-<name>`, and policies allow access only to the owner's folder.
- Doctors never query tables directly. They go through the `share-open` function.

## 3. Turn on email sign-in

**Authentication → Providers → Email** is on by default. For a quick demo you can turn off
"Confirm email". Otherwise new accounts must click the confirmation email first.
Under **Authentication → URL Configuration**, add your site URL
(for example `https://illysternstudent12.github.io/medipassport/`) and `http://127.0.0.1:8000/`.

## 4. Deploy the four Edge Functions

The functions are in [`supabase/functions`](../supabase/functions):

| Function | Purpose | Secrets it reads |
|---|---|---|
| `translate` | Translates strings; detects the source language | `GOOGLE_TRANSLATE_API_KEY` or `DEEPL_API_KEY` or `ANTHROPIC_API_KEY` (first one set wins) |
| `extract` | Pulls allergies, medicines, diagnoses and tests from document text, copied verbatim | `ANTHROPIC_API_KEY` |
| `summarize` | Writes a 2–3 sentence doctor handover from recorded facts only | `ANTHROPIC_API_KEY` |
| `share-open` | Verifies share token and code, expiry, revocation and lockout; returns only the shared sections; logs every attempt | none (uses the built-in `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) |

**With the Supabase CLI:**

```sh
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy translate
supabase functions deploy extract
supabase functions deploy summarize
supabase functions deploy share-open --no-verify-jwt   # doctors open shares without an account
```

**Without the CLI:** go to **Edge Functions → Deploy a new function → Via editor**, name it exactly as above, paste the matching `index.ts`, and deploy. For `share-open`, turn off **Verify JWT** in the function's settings.

> If your project only has the new `sb_publishable_…` keys (not a JWT anon key), also turn off
> **Verify JWT** for `translate`, `extract` and `summarize`. Anyone with your site could then call
> them, so set a **spending limit** with each provider.

## 5. Add provider keys as secrets (optional, pick what you want)

**Edge Functions → Secrets** (or `supabase secrets set NAME=value`):

| Secret | Where to get it | Free tier |
|---|---|---|
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Console → enable *Cloud Translation API* → Credentials → API key (restrict it to that API) | 500,000 characters/month |
| `DEEPL_API_KEY` | <https://www.deepl.com/pro-api>, *DeepL API Free* (key ends in `:fx`) | 500,000 characters/month |
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com> → API keys | Paid per use; set a spend limit |

Translation uses Google if its key is set, then DeepL, then Claude. AI extraction and
summaries need the Anthropic key. Without it, documents are matched against the offline
glossary and the app says so.

## 6. Point the app at your project

Choose one:

- **For everyone who opens your site:** put the URL and anon key in [`js/config.js`](../js/config.js), then commit and push. The anon key is public by design. RLS protects the data.
- **Only on your device:** open **Profile → Connected services**, paste the URL and anon key, and press **Connect**. They are stored in this browser.

Then create an account or sign in on the same screen and press **Save … fictional profile**.
Store only the fictional demo travelers. This is a demo, not a medical records system.

## 7. Check it end to end

On **Connected services**, every row should be green. Then:

1. **Documents → Upload** a PDF or photo. The review sheet opens. Save it, and the file goes to your private bucket.
2. **Passport → Share**. The banner says *Server-verified sharing*. Create a share and open the link on another device. Enter the code, then revoke it from the app. Within about 20 seconds the doctor's page locks.
3. Switch your reading language to one outside the glossary (for example Thai). The provider translates it, and every machine translation is labelled.

## What stays simulated

- **Insurers** are fictional, with designed logos. No real insurer is a partner, and policies are sample data.
- **Insurance-network status** is never shown as verified. No insurer API is connected.
- **Clinician identity** isn't verified. The portal asks the doctor to confirm they are treating the patient; no licence registry is connected.
