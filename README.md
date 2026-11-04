# MediPassport

**Your Medical History. Anywhere.** A digital medical passport for international travelers, offered B2B2C through travel insurers.

Batch 1: foundation, design system, and landing page. No build step and no dependencies: vanilla ES modules plus CSS.

## Run

```sh
cd medipassport
python -m http.server 5173
# open http://localhost:5173
```

ES modules need an HTTP server; opening `index.html` directly from disk won't work.

## Design system

| Token | Value |
|---|---|
| Black | `#000000` |
| Warm Gray | `#D4CBC5` |
| Peach | `#E7C4B1` |
| Cream | `#FBF3EB` (page background) |
| Mint | `#C1DEBA` |
| White | `#FFFFFF` |

- **Type:** Inter Tight (bold geometric grotesk, stand-in for Banana Grotesk) + Newsreader italic (editorial serif, stand-in for Noe Text). Both from Google Fonts (SIL OFL). Headlines are bold sans with serif-italic accents.
- **Texture/depth:** SVG fractal-noise grain, drifting blurred gradient blobs, tactile "stone" shapes, warm brown-tinted shadows, glassy floating widgets.
- **Motion:** line-by-line headline reveals, scroll reveals, pointer parallax in the hero, liquid-fill buttons, floating widgets. Everything respects `prefers-reduced-motion`.

## Structure

```
index.html              App shell (header / main outlet / footer)
assets/favicon.svg      Four-petal "bloom cross" mark
css/
  tokens.css            Palette, type scale, spacing, radii, shadows, motion, grain
  base.css              Reset, type utilities (.h1/.h2/.serif/.lead/.quote), reveals, keyframes
  components.css        Buttons, tags, eyebrow, cards, widgets, phone + passport mockups,
                        QR, segmented control, header, mobile menu, footer
  landing.css           Landing sections
  pages.css             Partners / 404
  onboarding.css        Onboarding flow
  app.css               Traveler dashboard
js/
  app/                  Traveler dashboard: data, shell, ui, emergency, screens
  app.js                Bootstraps header/footer and router
  router.js             Hash router (#/...) + data-scroll section links that work from any route
  components.js         Component library: Brand, Button, Tag, Eyebrow, SplitHeading, Widget,
                        Phone, PassportBooklet, QR, header, footer
  icons.js              Inline SVG icon set
  interactions.js       Scroll reveals, magnetic buttons
  pages/landing.js      Landing page + interactions (parallax, translator, map, QR countdown)
  pages/stubs.js        Partners, 404
  onboarding/           Onboarding flow + insurer/country data
```

## Routes

| Route            | Purpose                                   |
|------------------|-------------------------------------------|
| `#/`             | Landing page                              |
| `#/get-started`  | Onboarding flow ("Get Started" CTA) |
| `#/partners`     | Insurer partnership placeholder           |
| `#/app`          | Traveler dashboard · Home ("Explore Demo"; `#/demo` aliases here) |
| `#/app/passport` | Wallet-style Medical ID (`?share` opens the QR pass) |
| `#/app/documents`| Records with side-by-side translation (`?lang=xx` preselects) |
| `#/app/profile`  | Traveler details, demo traveler switcher, settings |
| `#/app/emergency`| "I need medical help": five emergency actions |
| `#/app/map`      | Medical map: nearby ERs, hospitals, clinics and doctors |
| `#/app/share`    | Secure sharing: QR codes, access links and codes, expiry, revocation, activity |
| `#/portal?s=…`   | Doctor portal opened from a share link or QR |
| `#/insurer`      | Insurer console (B2B, simulated sign-in) |
| `#/app/doctor`   | Doctor view: full record in the doctor's language, one-tap patient/doctor switch (`?lang=xx`) |

Landing sections use ids `problem`, `passport`, `translation`, `emergency`, and `insurers`. Link to them with `data-scroll="<id>"`.

## Traveler dashboard (Batch 2)

`js/app/` holds the app: `data.js` (three fictional travelers + helpers), `shell.js` (app shell, navigation, illustrated portraits and destination scenes), `ui.js` (sheets/dialogs, toasts, the desktop breakpoint), `emergency.js` (Emergency help panel), and one module per screen. Styles live in `css/app.css`.

### Mobile and desktop

One markup tree, two intentionally different layouts, switched automatically at **960px** (`DESKTOP_MQ` in `js/app/ui.js`, mirrored in `css/app.css`). Crossing the breakpoint re-renders the current screen.

| | Mobile (< 960px) | Desktop (≥ 960px) |
|---|---|---|
| Navigation | Floating bottom dock | Side navigation with traveler switcher |
| Emergency | Home card + floating SOS on every screen | Home card + always-visible sidebar button |
| Home | Single column, swipeable summary rail | Editorial grid (2 columns to 1279px, 3 columns above) |
| Passport | Wallet stack: tap a pass to open it | All passes open in a two-column grid |
| Documents | Card list → bottom sheet | Table + live preview pane (original and translation side by side from 1280px) |
| Profile | Single column | Two columns |
| Details, emergency | Bottom sheets (drag to dismiss) | Centered dialogs |

Tablets (600–959px) use the mobile layout with a wider, centered measure.

Documents supports real uploads on both layouts: **Upload** (files), **Scan** (camera on phones), and drag-and-drop on desktop. Sample PDFs are recognized and read with the same labeled simulation as onboarding. Upload metadata is stored per traveler in `localStorage` (`mp.uploads.<id>`); file contents are not stored.

| Traveler | From → To | Profile |
|---|---|---|
| Maya Stein | Israel → Barcelona | Type 1 diabetes, penicillin anaphylaxis, O+ |
| Kenji Watanabe | Japan → Lisbon | Asthma, peanut anaphylaxis, A+ |
| Amara Okafor | UK → Kyoto | Hypertension, hypothyroidism, sulfonamide + latex allergy, B− |

The selected traveler and settings toggles persist in `localStorage`. Calls, scanning, uploads and "Add to Apple Wallet" are labeled demo actions: nothing is dialed, uploaded or added to Wallet.

## Onboarding (Batch 3)

`#/get-started` runs `js/onboarding/flow.js` (styles in `css/onboarding.css`):

1. **Residence:** Israel, Japan or the UK (each maps to one demo traveler); three more countries are marked "coming soon".
2. **Insurer:** three illustrative, fictional insurers per country with their own logo marks (`js/onboarding/data.js`). No real companies or partnerships are shown.
3. **Connect:** simulated integration (app approval or prefilled policy number). Nothing is sent anywhere.
4. **Records:** PDF, camera or phone files, drag and drop, or one tap to add the traveler's sample documents.
5. **Extract:** labeled demo simulation. No AI model runs; the sample PDFs carry a `MPDEMO:<traveler>:<kind>` metadata tag that the demo reads, so extraction matches the documents exactly. Other files are stored but not read.
6. **Review:** edit, remove or add allergies, medications, conditions, test results and blood type.
7. **Permissions → Activate:** consent toggles (only secure storage is required; claims sharing is off by default), then the passport is activated and the dashboard uses the reviewed data and chosen insurer.

The result is saved in `localStorage` (`mp.onboard`). "Start over" on the final screen clears it.

### Sample documents

`assets/demo-docs/` holds nine fictional PDFs (prescription, lab report, medical history summary for each traveler). They're watermarked SAMPLE and generated by a dependency-free script. Values must match `js/app/data.js`:

```sh
python tools/make_demo_docs.py
```

## Medical translation (Batch 4)

`js/translate/` holds the translation system; styles are in `css/translate.css`.

| File | Role |
|---|---|
| `glossary.js` | Reviewed medical glossary in 12 languages (en, es, fr, de, it, pt, he, ar, ja, zh, ko, ru) plus a catalog of 75 languages |
| `records.js` | Records as coded facts matching the sample PDFs; renders layered cards, the summary and responder lines in any language |
| `ai.js` | Optional live AI engine (Claude Opus 5.5 via the official SDK) |
| `picker.js` | Searchable language picker and live-AI settings |
| `state.js` | Per-traveler target language; fills gaps with live AI when on |

**Two engines, always labeled.**
- **Simulated (default, offline):** every term comes from the glossary. Cards say "Simulated translation"; no AI model is called.
- **Live AI (opt-in):** in the language picker → *Set up*, paste your own Anthropic API key. It is stored only in this browser and sent only to Anthropic, straight from the browser (`dangerouslyAllowBrowser`), so it's for demos and testing; a production build would keep the key on a server. Live AI unlocks the other 63 languages, translates text the glossary doesn't cover, writes an AI summary, and reads any uploaded PDF or photo. Output uses JSON-schema structured outputs and server-side refusal fallbacks. Results are labeled "Live AI · Claude" and cached locally.

**Never invents facts.** Records are coded facts; a term with no glossary entry and no live translation is shown in the source language and flagged "not translated". Items a traveler added or corrected during onboarding are never mapped back to the glossary (a changed dose stays as written). Every view carries the notice that medical translations need professional verification, in the target language and in English.

**RTL.** Hebrew, Arabic, Persian and Urdu cards render right-to-left with logical CSS properties; numbers, IDs and drug codes are isolated with `<bdi>`. Dates use the Gregorian calendar and Latin digits in every language for clinical clarity.

## Emergency & medical map (Batch 5)

`js/emergency/` (styles in `css/emergency.css`). **I need medical help** is in the desktop side navigation, on Home, and as a floating button on every mobile screen. It opens five large actions: *Find medical help* (map), *Show medical passport* (doctor view in the local language), *Share medical QR*, *Contact insurance* and *Call emergency services*.

**Map stack (no API keys):** [Leaflet](https://leafletjs.com) 1.9.4 from unpkg, standard OpenStreetMap tiles (light demo use with attribution, per the OSM tile policy), and facilities from OpenStreetMap via the public Overpass API. Google Maps would need a paid key, so it is used only for the "Navigate with" hand-off, alongside Apple Maps and Waze.

- **Demo scenario:** Maya (Israeli) slips at Park Güell, Barcelona. The map loads a bundled snapshot of 241 real facilities within 3 km (`assets/demo-data/barcelona-facilities.json`, captured from OSM on 2 Nov 2026), so the demo works even when Overpass is busy. Regenerate with `python tools/make_facility_snapshot.py <overpass.json>`.
- **Use my location** asks for permission and loads live facilities around you; **Search this area** queries wherever the map is. Live results are cached for 6 hours; busy servers are retried and then reported clearly.
- **Facility details** (address, phone, opening hours, specialities, website) are shown only when present in OSM. Opening hours are parsed for common formats; anything else is shown as written. Travel times are straight-line estimates and are labeled so.
- **Insurance network:** no facility is marked "in network". The fictional insurers have no verified network data, so every facility shows "Network not verified" and the insurance panel says to ask the 24/7 line.
- **Calls:** in the demo scenario, calls are disabled and the number is shown to dial manually (so testers never reach 112 or a real hospital). With your real location, facility phone numbers are real `tel:` links.

## Connected care (Batch 6)

`js/share/` (store + QR), `js/app/share.js`, `js/portal/` (doctor portal, insurer console); styles in `css/connected.css`.

- **Secure sharing:** the patient picks a recipient (a doctor, or their insurer for one claim), the documents, the summary sections (doctors always get allergies and blood type), the doctor's language and a duration (1 hour, 24 hours, 7 days). Each share gets a **real, scannable QR code** (qrcode-generator, MIT, from jsDelivr), a link and a 4-digit access code. Shares list their status and an activity history (created, opened, wrong code, language switched, documents viewed, revoked). "Share medical QR" in the emergency screen creates 1-hour doctor access in one tap.
- **Doctor portal:** opening the link or QR asks for the access code (**simulated authentication**). The clinician then sees identification, allergies, and only the sections and documents shared, with originals beside translations, language switching, and a live expiry countdown. It locks itself on expiry or revocation.
- **Insurer console:** simulated sign-in as one of three fictional insurers. It shows enrolled policyholders, active passports, connected policies, a monthly-active chart (with table view), emergency assistance requests (location and policy only), documents authorized for claims review (per claim, with expiry), and licensing (a fictional €3.90 per policyholder per year). Insurers never see medical histories, summaries or documents that weren't authorized; the console lists what it can and can't see.
- **Demo limits (stated in the UI):** there is no server. A share's scope and code travel inside the link, so links work on any device but enforce only their expiry there. Revocation, activity history, claim authorizations and assistance requests are stored in this browser. A production system would issue opaque tokens and check every request server-side. Share links point to the live site, or to the local server when running locally.

## Universal translation (Batch 6.5)

No language is treated as "the original". Four settings are independent per traveler (Profile → Languages): the **app interface** (English for now), the language the **patient reads** records in, the language **doctors read** in (default for Doctor view and new shares), and the **destination** language (emergency responders). Each **document** has its own original language.

- **Detection:** `js/translate/detect.js` detects a document's language offline, by writing system (Hebrew, Arabic, Japanese, Chinese, Korean, Cyrillic, Greek, Thai, Devanagari) and, for Latin-script text, by frequent words and characteristic letters. It reads text from PDFs that store it uncompressed (all sample PDFs); photos and other PDFs need live AI, which also reports the language. The result is shown on every document ("detected automatically · high confidence") with **Change**, so the patient can correct it; corrections are remembered per document and can be undone.
- **Any → any:** coded records render offline in any of the 12 glossary languages, as originals or translations; live AI covers every other pair. Originals are always shown with the translation (side by side when there's room, stacked otherwise).
- **Uncertainty:** live-AI translations come back with an "uncertain" flag and reason, highlighted for professional verification; low-confidence or unknown document languages are flagged too.
- **New samples (same facts, issued abroad):** `kenji-medikationsplan-de.pdf` (German medication plan, Berlin) and `amara-resume-medical-fr.pdf` (French medical summary, Paris). Uploaded samples can be shared and open in the doctor portal on any device.
- **Tested:** German → Japanese (Kenji, patient and doctor portal), Hebrew → Spanish (Maya, patient and doctor), English → Arabic (Amara, patient and doctor, RTL), French → English (Amara, patient).

## Mobile navigation (Batch 6.6)

`js/nav.js` makes every screen, sheet, map detail and onboarding step a real browser-history entry, so the in-app **Back** button, Android's system Back, swipe-back gestures and the browser's Back all behave the same.

- **Back goes to the actual previous screen** (`history.back()`); only when there's nothing behind you (a deep link or new tab) does it fall back to a sensible parent screen.
- **Overlays:** Back closes an open sheet, picker or dialog, or a facility's details on the map, instead of leaving the screen. Following a link from inside a sheet first removes the sheet's history step, so there are no dead Back presses.
- **State is kept** for the session: onboarding answers, insurer, uploads and review edits (it resumes where you left off); the half-built share; Documents filter, search, open document and view mode; map filter, search and open facility. Scroll position is restored when you go back.
- **Swipe:** browsers already map edge swipes to Back. When MediPassport runs as a home-screen app, an edge swipe from the left is added.
- **Headers:** main tabs (Home, Passport, Documents, Profile) show the avatar; every secondary screen shows Back. The emergency screen also has **Exit** (to Home); shares and insurer notifications are kept.
- **Usability pass at 360px:** no sideways scrolling (including during transitions), touch targets of at least 40–44px, and no text below about 11.5px.

## Real API integration (Batch 6.7)

Setup guide: [`docs/SETUP.md`](docs/SETUP.md). Live status in the app: **Profile → Connected services** (`#/app/setup`). Every status there comes from a real check.

**Connected now, no account needed**
- **Map:** OpenStreetMap tiles; hospitals, clinics and doctors come live from the Overpass API, with a saved Barcelona snapshot as a fallback. **Place search** uses Nominatim (submit-only, rate-limited to 1 request/s) for when location permission is denied or you want another area. Facility cards show distance, phone, opening hours and one-tap Google Maps / Apple Maps / Waze links. Facilities are never invented, and network status is never shown as verified.
- **Documents:** every upload is actually read on the device: the PDF text layer with pdf.js, scans and photos with Tesseract OCR (it detects the language and re-runs OCR with that language's model). Allergies, medicines, diagnoses and tests are matched against the 12-language glossary, and the rest of each line is copied as written. Nothing is invented. A **review sheet** shows the method, the detected language (which you can change), every item (edit, remove or add) and the raw text before anything is saved. Onboarding reads your own files the same way. Sample PDFs are still recognised by their tag.

**Needs your credentials (code included, not connected)**
- **Supabase** ([`supabase/`](supabase)): email/password auth, Postgres tables with owner-only Row Level Security, a private `medical-documents` storage bucket, and fictional profiles and simulated policies saved to your account.
- **Edge Functions** keep every secret on the server: `translate` (Google Cloud Translation, DeepL or Claude; any language the provider supports, with automatic source detection), `extract` and `summarize` (Claude), and `share-open` (server-verified shares).
- **Server-verified sharing:** when you're signed in, a share link holds only a random token. The 4-digit code, expiry and revocation are checked by `share-open` on every device, and only hashes are stored. Five wrong codes lock the link for 15 minutes, and every attempt is logged for the patient. The doctor's page re-checks every 20 s, so it locks soon after you revoke. Without a backend, shares remain clearly labelled **demo links**.

**Simulated by design:** insurers (fictional, with designed logos), policy connections, insurance-network verification and clinician identity.

**Tested (Nov 2026, local):** Barcelona (snapshot, 241 places) and Tokyo/Shinjuku (live Overpass, 167 places; took ~30 s while the server was busy, and the app shows a "still searching" state); navigation links; German PDF → 5 items, German detected; OCR of a French image (French detected, 3 items; OCR misread "µg" as "pg", which is why the review step exists); German → Japanese (glossary terms translated offline, German free text flagged "not translated"); demo QR share → portal. **Not tested:** Supabase storage, real translation providers and server-verified shares, because they need your project and keys.

## Guided demo (Batch 7): Berlin to Tokyo

Open **`#/tour`**, or press **Guided demo** on the landing page or in Profile. A floating guide card takes you through the real screens with fictional **Lukas Becker** (Berlin, insured with the fictional *Sternweg Reiseschutz*), who needs medical help in Tokyo:

1. Residence: Germany → 2. German insurer → 3. upload the German sample PDFs (Rezept, Laborbefund, Anamnese) → 4. extract and verify → 5. activate → 6. emergency at Shinjuku Station → 7. hospitals on the map → 8. German records in Japanese → 9. QR share → 10. doctor portal → 11. Japanese beside the German original → 12. insurance assistance request, then the Sternweg insurer console.

The card follows onboarding automatically, can be minimised, and is compact on phones (tap to expand). Starting the demo resets only the demo onboarding. On the map screen the guide moves out of the way of the zoom controls (desktop) and the bottom sheet (phones).

Data is consistent across the app, the PDFs (`tools/make_demo_docs.py`) and the coded records:
- Allergy: penicillin (anaphylaxis 2015).
- Conditions: hypertension and asthma.
- Medicines: amlodipine 5 mg and salbutamol 100 µg.
- Tests: creatinine and potassium.
- Blood type: A+.

The Tokyo map starts from a saved snapshot of real OpenStreetMap data (`assets/demo-data/tokyo-facilities.json`: 175 facilities around Shinjuku, captured 4 Nov 2026). **Search this area** or the place search loads live data.

### What is live and what is simulated

| Area | Status |
|---|---|
| Map tiles, hospital search (Overpass), place search (Nominatim), navigation links | **Live** (tested, Barcelona and Tokyo) |
| PDF text reading (pdf.js), OCR (Tesseract), language detection, glossary extraction | **Live, on the device** (tested) |
| Offline glossary translation, 12 languages (German → Japanese tested) | **Live** |
| QR code generation; demo share links with expiry | **Live** (revocation is per browser) |
| Supabase auth, database, private storage, server-verified shares | **Code included, not connected.** Needs your project (`docs/SETUP.md`); untested |
| Translation via Google, DeepL or Claude; AI extraction and summaries | **Code included, not connected.** Needs keys; untested |
| Sample-PDF extraction in onboarding | **Simulated:** samples are recognised by an embedded tag |
| Insurers, policy connection, network verification, insurer console figures, assistance requests | **Simulated** (fictional insurers) |
| Clinician identity in the doctor portal | **Not verified** |

## Notes

- Facility data on the map is real (© OpenStreetMap contributors, ODbL). Travelers, insurers, IDs, clinic names, medical record and QR code are sample/illustrative data. The QR is decorative, not scannable.
