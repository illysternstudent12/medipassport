# Presenting the MediPassport demo

A 5–7 minute live demo: **Lukas Becker**, a fictional traveler from Berlin, gets medical help in **Tokyo**.
It covers travel insurance enrollment, a German medical record, an emergency, a hospital, a Japanese-speaking doctor, and the insurer.

Live site: <https://illysternstudent12.github.io/medipassport/>

---

## Before you present (5 minutes, once)

1. **Open the site on the device you'll present from**, and load it once while you're online. It then works offline too: passport, records, emergency screen and sample data. Maps and place search still need a connection.
2. **Reset the demo:** Profile → **Reset demo**, or on the stage, the **Reset demo** button. This clears earlier runs (onboarding, uploads, shares, insurer requests). Do it before every presentation.
3. **Turn sounds and haptics on or off:** Profile → Settings → *Sounds & haptics*. It's on by default; turn it off in a quiet room.
4. **Check the voice:** on the emergency screen, tap **Play in Japanese** once. If the device has no Japanese voice, the app says so. Show the card instead, or install the Japanese voice in system settings (*Spoken content* on iPhone, *Text-to-speech* on Android). On desktop Chrome, Japanese voices usually come with the browser.
5. **Optional, phone as an app:** in Safari choose Share → *Add to Home Screen*; in Chrome, ⋮ → *Install app*. It opens full-screen with its own icon.

## Three ways to run it

| Setting | Start here | Best for |
|---|---|---|
| **Laptop or projector** | `…/#/tour?present` or Profile → **Present mode** | Pitches. A phone frame, the doctor's screen beside it, and the guide on the right. Setup links are hidden. |
| **Your phone** | `…/#/tour`, or **Guided demo** on the landing page | One-on-one. The guide is a small card; tap *More about this step* for details, or minimise it to a pill. |
| **Free exploration** | `…/#/app` | Questions after the demo |

The guide highlights what to tap with a pulsing green ring. **Next** moves to the next screen, **Go to step** returns to the current one, and **Back** goes back a step. The first five steps follow you automatically while you fill in the sign-up.

## Script (12 steps)

| # | Do | Say (suggested) |
|---|---|---|
| 1 | Get started → **Germany** | “Lukas lives in Berlin. His travel insurer gives him MediPassport as part of his policy.” |
| 2 | **Sternweg Reiseschutz** → connect | “He picks his insurer and connects the policy. Insurers here are fictional, and the connection is simulated.” |
| 3 | **Add all 3 samples** | “He uploads his German records: a prescription, a lab report and his medical history.” |
| 4 | Next → watch extraction → **Looks right** | “MediPassport reads them and Lukas checks every item. Nothing is saved until he confirms, and nothing is invented.” |
| 5 | Permissions → **Activate** | “He chooses what doctors and his insurer may see. His passport is active and ready for Japan.” |
| 6 | Emergency screen; tap **Play in Japanese** | “In Tokyo he’s short of breath at Shinjuku Station. One calm screen: Japan’s number, what to do next, and his critical facts in Japanese, read aloud if needed.” |
| 7 | Map → **Emergency** filter → open a hospital → **Google Maps** | “These are real hospitals from OpenStreetMap, with one-tap navigation. We never claim a hospital is in-network; that needs the insurer.” |
| 8 | Documents → tap **Deutsch**, then **日本語** | “His German records, in Japanese. The medical terms come from a reviewed glossary, and every translation is flagged for professional verification.” |
| 9 | Share → **Create secure access** | “He gives the doctor one hour of access: a real QR code, a link and a 4-digit code.” |
| 10 | Doctor's screen → enter the code → tick the box → **Open record** | “The doctor opens it on her own computer. No app, no account.” |
| 11 | Point at the side-by-side view → on the phone, **Revoke now** | “German original beside Japanese. And when Lukas revokes access, the doctor’s screen locks immediately.” |
| 12 | Emergency → **Contact insurance** → **Notify my insurer** → *See the request in the insurer console* → **Finish** | “His insurer gets the location and policy, not his medical records. That’s the whole journey.” |

The finish screen recaps the 12 steps and has buttons for **Run it again**, **Explore freely**, **Insurer console** and **Reset demo**.

**On a single screen (not present mode):** at steps 10–11, use *Open the doctor’s screen in a second window* on desktop. You can then revoke in one window and watch the other lock.

## Be accurate about what's real

| Live (works now) | Simulated or not connected |
|---|---|
| Map tiles, hospital data (OpenStreetMap / Overpass), place search (Nominatim), navigation links | Insurers, policy connection, insurance-network status, assistance requests, insurer console figures |
| Reading PDFs and photos on the device (pdf.js, Tesseract OCR), language detection | Sample-PDF recognition during sign-up (the samples carry a tag) |
| Glossary translation in 12 languages; spoken phrases (the device's own voice) | AI translation and AI extraction (need API keys; see `SETUP.md`) |
| QR codes and demo share links with expiry and revocation | Server-verified shares, accounts and cloud storage (need Supabase; see `SETUP.md`) |
| Offline app shell, home-screen install | Clinician identity verification |

All people, insurers, clinics and medical data are fictional. Nothing here is clinically validated.

## If something goes wrong

| Problem | Fix |
|---|---|
| Hospitals take long to load after *Search this area* | The public OpenStreetMap server is busy, which can take up to a minute. The saved Shinjuku data loads instantly, so go back to it with **Go to step**. |
| The doctor step says “Create a doctor share first” | Go back one step and press **Create secure access**. |
| No sound on *Play in Japanese* | The device has no Japanese voice. Show the screen instead (see Before you present, step 4). |
| Leftovers from an earlier run | **Reset demo**. |
| The site looks out of date after an update | Reload once. The app checks for a new version when you're online. |
| Stuck in present mode on a phone | Finish the demo, or Profile → **Reset demo**. Both leave present mode. |
