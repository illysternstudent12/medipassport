"""Generate the fictional sample medical documents used in onboarding.

Run from the project root:  python tools/make_demo_docs.py
Writes assets/demo-docs/<traveler>-<kind>.pdf

No dependencies: a tiny PDF writer using the standard 14 fonts (WinAnsi).
Each PDF carries a `MPDEMO:<traveler>:<kind>` keyword in its metadata. The
onboarding demo reads that tag to "extract" the matching record, so the
values printed here MUST match js/app/data.js.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "demo-docs"

PEACH = (0.906, 0.769, 0.694)
MINT = (0.757, 0.871, 0.729)
CREAM = (0.984, 0.953, 0.922)
GRAY = (0.831, 0.796, 0.773)
BLACK = (0, 0, 0)
ALERT = (0.659, 0.263, 0.165)

# --------------------------------------------------------------------------- data
PEOPLE = {
    "maya": {
        "name": "Maya Stein", "dob": "14 Mar 1994", "sex": "Female", "nat": "Israeli", "pno": "IL-883104",
        "clinic": "Carmel Family Health Clinic", "city": "Haifa, Israel", "doctor": "Dr. Noa Levi, MD",
        "lab": "Carmel Medical Laboratory",
        "rx": {"date": "12 Aug 2026", "flag": "ALLERGY: PENICILLIN (ANAPHYLAXIS)", "items": [
            ("Insulin glargine", "20 units", "Subcutaneous, once daily in the evening", "5 pens (100 units/mL)"),
            ("Insulin aspart", "By carb count", "Subcutaneous with meals, 1 unit per 10 g carbohydrate", "5 pens (100 units/mL)"),
        ]},
        "lab_doc": {"date": "3 Sep 2026", "title": "Laboratory report", "items": [
            ("HbA1c (glycated haemoglobin)", "6.8 %", "Target < 7.0"),
            ("Creatinine", "0.8 mg/dL", "0.5 - 1.1"),
        ]},
        "history": {"date": "1 Jan 2026", "blood": "O RhD positive",
            "conditions": [("Type 1 diabetes", "Since 2009", "Uses a continuous glucose monitor (CGM).")],
            "allergies": [("Penicillin", "Severe", "Anaphylaxis (2019). Avoid all penicillin-class antibiotics.")]},
    },
    "kenji": {
        "name": "Kenji Watanabe", "dob": "2 Jul 1987", "sex": "Male", "nat": "Japanese", "pno": "JP-20419",
        "clinic": "Setagaya Respiratory Clinic", "city": "Tokyo, Japan", "doctor": "Dr. Hiroshi Mori",
        "lab": "Setagaya Respiratory Clinic, Pulmonary Function Lab",
        "rx": {"date": "18 Jun 2026", "flag": "ALLERGY: PEANUTS (ANAPHYLAXIS)", "items": [
            ("Budesonide/formoterol", "2 puffs", "Inhaler 160/4.5 micrograms, twice daily", "1 inhaler, 120 doses"),
            ("Salbutamol", "100 µg", "Inhaler, 1-2 puffs as needed during an attack", "1 inhaler, 200 doses"),
            ("Adrenaline auto-injector", "0.3 mg", "Intramuscular, emergency use in anaphylaxis", "2 devices"),
        ]},
        "lab_doc": {"date": "18 Jun 2026", "title": "Spirometry report", "items": [
            ("FEV1", "82 % of predicted", "> 80 %"),
            ("FEV1/FVC ratio", "0.74", "> 0.70"),
        ]},
        "history": {"date": "1 Mar 2026", "blood": "A RhD positive",
            "conditions": [("Asthma", "Since childhood", "Last hospital admission in 2021.")],
            "allergies": [("Peanuts", "Severe", "Anaphylaxis. Carries an adrenaline auto-injector (0.3 mg).")]},
    },
    "amara": {
        "name": "Amara Okafor", "dob": "23 Nov 1979", "sex": "Female", "nat": "British", "pno": "GB-4471-0932",
        "clinic": "Elmfield GP Surgery", "city": "Bristol, United Kingdom", "doctor": "Dr. Sarah Whitfield, MRCGP",
        "lab": "Avon Vale Hospital Pathology",
        "rx": {"date": "2 Oct 2026", "flag": "ALLERGIES: SULFONAMIDE ANTIBIOTICS, LATEX", "items": [
            ("Levothyroxine", "75 µg", "One tablet every morning, before breakfast", "28 tablets"),
            ("Amlodipine", "5 mg", "One tablet once daily", "28 tablets"),
        ]},
        "lab_doc": {"date": "22 Sep 2026", "title": "Blood test results", "items": [
            ("TSH (thyroid stimulating hormone)", "2.1 mIU/L", "0.4 - 4.0"),
            ("Potassium", "4.2 mmol/L", "3.5 - 5.3"),
        ]},
        "history": {"date": "10 Jan 2026", "blood": "B RhD negative",
            "conditions": [("Hypertension", "Since 2020", "Well controlled on medication."),
                           ("Hypothyroidism", "Since 2018", "Stable on daily replacement.")],
            "allergies": [("Sulfonamide antibiotics", "Moderate", "Rash. Avoid sulfa antibiotics."),
                          ("Latex", "Mild", "Contact dermatitis. Use latex-free gloves.")]},
    },
}

# --------------------------------------------------------------------------- pdf
def esc(s):
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class Page:
    def __init__(self):
        self.ops = []

    def rect(self, x, y, w, h, rgb):
        self.ops.append(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} rg {x} {y} {w} {h} re f")

    def line(self, x1, y1, x2, y2, rgb=GRAY, w=0.8):
        self.ops.append(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} RG {w} w {x1} {y1} m {x2} {y2} l S")

    def text(self, x, y, s, font="F1", size=10, rgb=BLACK):
        self.ops.append(f"BT {rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} rg /{font} {size} Tf {x} {y} Td ({esc(s)}) Tj ET")

    def text_rot(self, x, y, s, font, size, rgb, cos, sin):
        self.ops.append(f"BT {rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} rg /{font} {size} Tf {cos:.4f} {sin:.4f} {-sin:.4f} {cos:.4f} {x} {y} Tm ({esc(s)}) Tj ET")

    def stream(self):
        return "\n".join(self.ops).encode("cp1252")


def write_pdf(path, page, title, keywords):
    content = page.stream()
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>",
        ("<< /Title (" + esc(title) + ") /Author (MediPassport demo) /Subject (Fictional sample medical document) "
         "/Keywords (" + esc(keywords) + ") /Creator (tools/make_demo_docs.py) >>").encode("cp1252"),
    ]
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    path.write_bytes(bytes(out))


# --------------------------------------------------------------------------- layout
# Every printed label is localised so a German or French sample reads as a
# genuinely German or French document (the app detects the language from text).
LABELS = {
    "en": {"wm": "SAMPLE", "fict": "Fictional sample clinic", "demo": "demo document", "issued": "Date issued",
           "cols": ("PATIENT", "DATE OF BIRTH", "SEX", "NATIONALITY"), "pno": "Patient no.", "sig": "Signature (sample)",
           "f1": "FICTIONAL SAMPLE DOCUMENT  |  Created for the MediPassport demo",
           "f2": "Not a real medical record. Not for clinical use. All names, clinics and values are invented."},
    "de": {"wm": "MUSTER", "fict": "Fiktive Musterpraxis", "demo": "Demo-Dokument", "issued": "Ausgestellt am",
           "cols": ("PATIENT", "GEBURTSDATUM", "GESCHLECHT", "STAATSANGEHÖRIGKEIT"), "pno": "Patienten-Nr.", "sig": "Unterschrift (Muster)",
           "f1": "FIKTIVES MUSTERDOKUMENT  |  Erstellt für die MediPassport-Demo",
           "f2": "Keine echte Krankenakte. Nicht für die klinische Verwendung. Alle Namen, Praxen und Werte sind erfunden."},
    "fr": {"wm": "EXEMPLE", "fict": "Cabinet fictif", "demo": "document de démonstration", "issued": "Date d’émission",
           "cols": ("PATIENTE", "DATE DE NAISSANCE", "SEXE", "NATIONALITÉ"), "pno": "N° de patiente", "sig": "Signature (exemple)",
           "f1": "DOCUMENT FICTIF  |  Créé pour la démonstration MediPassport",
           "f2": "Ce n’est pas un vrai dossier médical. Ne pas utiliser en clinique. Noms, cabinets et valeurs sont inventés."},
}


def frame(p, person, issuer, title, date, lang="en", who=None, city=None):
    L = LABELS[lang]
    who = who or person
    pg = Page()
    # watermark
    pg.text_rot(110, 250, L["wm"], "F2", 130, (0.95, 0.92, 0.89), 0.866, 0.5)
    # header band
    pg.rect(0, 752, 595, 90, PEACH)
    pg.text(40, 806, issuer, "F2", 17)
    pg.text(40, 789, f"{city or person['city']}  |  {L['fict']}", "F1", 9, (0.25, 0.2, 0.18))
    pg.text(430, 806, "MediPassport", "F2", 10)
    pg.text(430, 792, L["demo"], "F3", 10)
    # title
    pg.text(40, 700, title, "F3", 34)
    pg.text(40, 680, f"{L['issued']}: {date}", "F1", 10, (0.35, 0.35, 0.35))
    # patient block
    pg.rect(40, 590, 515, 72, CREAM)
    cols = list(zip(L["cols"], (who["name"], who["dob"], who["sex"], who["nat"])))
    for i, (k, v) in enumerate(cols):
        x = 54 + i * 126
        pg.text(x, 640, k, "F2", 7, (0.4, 0.4, 0.4))
        pg.text(x, 624, v, "F2", 11)
    pg.text(54, 602, f"{L['pno']} {who['pno']}", "F1", 8.5, (0.4, 0.4, 0.4))
    # footer
    pg.rect(0, 0, 595, 46, MINT)
    pg.text(40, 26, L["f1"], "F2", 8)
    pg.text(40, 14, L["f2"], "F1", 7.5)
    return pg


def signature(pg, doctor, y=150, lang="en"):
    pg.line(40, y, 230, y, BLACK, 0.6)
    pg.text(40, y - 14, doctor, "F2", 9.5)
    pg.text(40, y - 26, LABELS[lang]["sig"], "F1", 8, (0.4, 0.4, 0.4))


def table(pg, y, headers, xs, rows, size=10.5):
    for h, x in zip(headers, xs):
        pg.text(x, y, h, "F2", 7.5, (0.4, 0.4, 0.4))
    y -= 10
    pg.line(40, y, 555, y, BLACK, 0.8)
    y -= 22
    for row in rows:
        for i, (cell, x) in enumerate(zip(row, xs)):
            pg.text(x, y, cell, "F2" if i == 0 else "F1", size if i == 0 else size - 1)
        y -= 12
        pg.line(40, y, 555, y)
        y -= 22
    return y


def make_rx(tid, p):
    d = p["rx"]
    pg = frame(p, p, p["clinic"], "Prescription", d["date"])
    pg.rect(40, 548, 515, 26, (0.95, 0.85, 0.81))
    pg.text(52, 557, d["flag"], "F2", 10, ALERT)
    y = table(pg, 520, ["MEDICATION", "DOSE", "SUPPLY"], [40, 260, 400],
              [(n, dose, qty) for n, dose, _, qty in d["items"]])
    pg.text(40, y, "Full directions", "F2", 9)
    y -= 16
    for n, dose, dirs, _ in d["items"]:
        pg.text(40, y, f"{n} {dose}: {dirs}.", "F1", 9.5)
        y -= 15
    signature(pg, p["doctor"])
    write_pdf(OUT / f"{tid}-prescription.pdf", pg, f"Prescription - {p['name']} (sample)", f"MPDEMO:{tid}:rx")


def make_lab(tid, p):
    d = p["lab_doc"]
    pg = frame(p, p, p["lab"], d["title"], d["date"])
    y = table(pg, 560, ["TEST", "RESULT", "REFERENCE"], [40, 300, 430], d["items"], 11)
    pg.text(40, y, f"Requested by {p['doctor']}. Results verified by laboratory staff (sample).", "F1", 9)
    signature(pg, f"{p['lab']}")
    write_pdf(OUT / f"{tid}-lab-report.pdf", pg, f"{d['title']} - {p['name']} (sample)", f"MPDEMO:{tid}:lab")


def make_history(tid, p):
    d = p["history"]
    pg = frame(p, p, p["clinic"], "Medical history summary", d["date"])
    pg.text(40, 560, "BLOOD GROUP", "F2", 7.5, (0.4, 0.4, 0.4))
    pg.text(40, 542, d["blood"], "F2", 14)
    y = table(pg, 505, ["CONDITION", "ONSET", "NOTES"], [40, 200, 300], d["conditions"])
    y = table(pg, y - 6, ["ALLERGY", "SEVERITY", "REACTION AND ADVICE"], [40, 200, 300],
              [(n, s, r if len(r) < 48 else r[:46] + "...") for n, s, r in d["allergies"]])
    for n, _, r in d["allergies"]:
        pg.text(40, y, f"{n}: {r}", "F1", 9.5, ALERT)
        y -= 15
    pg.text(40, y - 6, "Current medication: see the prescription issued by this clinic.", "F1", 9.5)
    signature(pg, p["doctor"])
    write_pdf(OUT / f"{tid}-medical-history.pdf", pg, f"Medical history summary - {p['name']} (sample)", f"MPDEMO:{tid}:history")


def make_medplan_de():
    """Kenji: German medication plan from a stay in Berlin. Same medicines as his prescription."""
    who = {"name": "Kenji Watanabe", "dob": "02.07.1987", "sex": "männlich", "nat": "japanisch", "pno": "B-77310"}
    pg = frame(None, who, "Hausarztpraxis Dr. med. Lena Hoffmann", "Medikationsplan", "05.05.2026", "de", who, "Berlin, Deutschland")
    pg.rect(40, 548, 515, 26, (0.95, 0.85, 0.81))
    pg.text(52, 557, "ALLERGIEN: ERDNÜSSE (ANAPHYLAXIE)", "F2", 10, ALERT)
    y = table(pg, 520, ["WIRKSTOFF", "DOSIS", "EINNAHME", "HINWEIS"], [40, 200, 300, 430], [
        ("Budesonid/Formoterol", "2 Hübe", "2-mal täglich", "Inhalation"),
        ("Salbutamol", "100 µg", "bei Bedarf", "bei Atemnot"),
        ("Adrenalin-Autoinjektor", "0,3 mg", "nur im Notfall", "bei Anaphylaxie"),
    ])
    pg.text(40, y, "Erläuterungen", "F2", 9)
    y -= 16
    for line in ("Budesonid/Formoterol 160/4,5 Mikrogramm: morgens und abends je 2 Hübe inhalieren.",
                 "Salbutamol 100 µg: bei Atemnot 1-2 Hübe.",
                 "Adrenalin-Autoinjektor 0,3 mg: nur bei einer schweren allergischen Reaktion verwenden.",
                 "Diagnose: Asthma bronchiale seit der Kindheit."):
        pg.text(40, y, line, "F1", 9.5)
        y -= 15
    signature(pg, "Dr. med. Lena Hoffmann", lang="de")
    write_pdf(OUT / "kenji-medikationsplan-de.pdf", pg, "Medikationsplan - Kenji Watanabe (Muster)", "MPDEMO:kenji:medplan")


def make_summary_fr():
    """Amara: French medical summary from a Paris practice. Same facts as her records."""
    who = {"name": "Amara Okafor", "dob": "23/11/1979", "sex": "féminin", "nat": "britannique", "pno": "P-20871"}
    pg = frame(None, who, "Cabinet médical Dr Claire Moreau", "Résumé médical", "14/08/2025", "fr", who, "Paris, France")
    pg.text(40, 560, "GROUPE SANGUIN", "F2", 7.5, (0.4, 0.4, 0.4))
    pg.text(40, 542, "B Rhésus négatif", "F2", 14)
    y = table(pg, 505, ["ANTÉCÉDENT", "DEPUIS", "REMARQUE"], [40, 230, 330], [
        ("Hypertension artérielle", "2020", "Bien contrôlée sous traitement."),
        ("Hypothyroïdie", "2018", "Stable sous traitement substitutif."),
    ])
    y = table(pg, y - 6, ["ALLERGIE", "GRAVITÉ", "RÉACTION"], [40, 230, 330], [
        ("Antibiotiques sulfamides", "Modérée", "Éruption cutanée"),
        ("Latex", "Légère", "Dermatite de contact"),
    ])
    y = table(pg, y - 6, ["TRAITEMENT EN COURS", "DOSE", "POSOLOGIE"], [40, 230, 330], [
        ("Lévothyroxine", "75 µg", "Chaque matin, avant le petit-déjeuner"),
        ("Amlodipine", "5 mg", "Une fois par jour"),
    ])
    pg.text(40, y, "Éviter les antibiotiques sulfamides. Utiliser des gants sans latex.", "F1", 9.5, ALERT)
    signature(pg, "Dr Claire Moreau", y=110, lang="fr")
    write_pdf(OUT / "amara-resume-medical-fr.pdf", pg, "Résumé médical - Amara Okafor (exemple)", "MPDEMO:amara:summary")


def make_lukas_de():
    """Lukas (guided demo): German originals from Berlin. Values MUST match js/app/data.js and records.js."""
    who = {"name": "Lukas Becker", "dob": "11.04.1985", "sex": "männlich", "nat": "deutsch", "pno": "B-40518"}
    clinic, city, doc = "Hausarztpraxis Dr. med. Jonas Krüger", "Berlin, Deutschland", "Dr. med. Jonas Krüger"
    pg = frame(None, who, clinic, "Rezept", "08.10.2026", "de", who, city)
    pg.rect(40, 548, 515, 26, (0.95, 0.85, 0.81))
    pg.text(52, 557, "ALLERGIE: PENICILLIN (ANAPHYLAXIE)", "F2", 10, ALERT)
    y = table(pg, 520, ["WIRKSTOFF", "DOSIS", "EINNAHME", "HINWEIS"], [40, 200, 300, 430], [
        ("Amlodipin", "5 mg", "Einmal täglich", "morgens"),
        ("Salbutamol", "100 µg", "Bei Bedarf", "bei Atemnot 1-2 Hübe"),
    ])
    signature(pg, doc, lang="de")
    write_pdf(OUT / "lukas-prescription.pdf", pg, "Rezept - Lukas Becker (Muster)", "MPDEMO:lukas:rx")

    pg = frame(None, who, "Spree-Labor Diagnostik", "Laborbefund", "01.10.2026", "de", who, city)
    y = table(pg, 560, ["UNTERSUCHUNG", "ERGEBNIS", "REFERENZBEREICH"], [40, 300, 430], [
        ("Kreatinin", "0,9 mg/dl", "0,7 - 1,3"),
        ("Kalium", "4,4 mmol/l", "3,5 - 5,1"),
    ], 11)
    pg.text(40, y, f"Angefordert von {doc}. Befund vom Labor freigegeben (Muster).", "F1", 9)
    signature(pg, "Spree-Labor Diagnostik", lang="de")
    write_pdf(OUT / "lukas-lab-report.pdf", pg, "Laborbefund - Lukas Becker (Muster)", "MPDEMO:lukas:lab")

    pg = frame(None, who, clinic, "Anamnese", "15.01.2026", "de", who, city)
    pg.text(40, 560, "BLUTGRUPPE", "F2", 7.5, (0.4, 0.4, 0.4))
    pg.text(40, 542, "A Rh positiv", "F2", 14)
    y = table(pg, 505, ["DIAGNOSE", "SEIT", "BEMERKUNG"], [40, 230, 330], [
        ("Arterielle Hypertonie", "2021", "Unter Medikation gut eingestellt."),
        ("Asthma bronchiale", "Kindheit", ""),
    ])
    y = table(pg, y - 6, ["ALLERGIE", "SCHWEREGRAD", "REAKTION"], [40, 230, 330], [
        ("Penicillin", "Schwer", "Anaphylaxie (2015)"),
    ])
    pg.text(40, y, "Alle Antibiotika der Penicillin-Gruppe vermeiden.", "F1", 9.5, ALERT)
    signature(pg, doc, lang="de")
    write_pdf(OUT / "lukas-medical-history.pdf", pg, "Anamnese - Lukas Becker (Muster)", "MPDEMO:lukas:history")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for tid, person in PEOPLE.items():
        make_rx(tid, person)
        make_lab(tid, person)
        make_history(tid, person)
    make_medplan_de()
    make_summary_fr()
    make_lukas_de()
    for f in sorted(OUT.glob("*.pdf")):
        print(f.name, f.stat().st_size)
