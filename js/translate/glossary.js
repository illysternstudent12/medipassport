// Medical glossary for the simulated (offline) translation engine.
//
// Every phrase a doctor sees in simulated mode comes from this table, so the
// engine can never produce a term that wasn't written and reviewed here.
// Free text (anything not coded) is never machine-guessed: it is shown as
// written and marked "not translated" unless live AI is enabled.
//
// Column order for every TERMS entry:
export const SIM = ['en', 'es', 'fr', 'de', 'it', 'pt', 'he', 'ar', 'ja', 'zh', 'ko', 'ru'];

/* ---------------------------------------------------------------- Language catalog */
// sim: available offline from the glossary. Others need live AI.
const L = (code, name, native, opts = {}) => ({ code, name, native, rtl: !!opts.rtl, sim: SIM.includes(code), region: opts.region || '' });
export const LANGS = [
  L('en', 'English', 'English'), L('es', 'Spanish', 'Español'), L('fr', 'French', 'Français'),
  L('de', 'German', 'Deutsch'), L('it', 'Italian', 'Italiano'), L('pt', 'Portuguese', 'Português'),
  L('he', 'Hebrew', 'עברית', { rtl: true }), L('ar', 'Arabic', 'العربية', { rtl: true }),
  L('ja', 'Japanese', '日本語'), L('zh', 'Chinese (Simplified)', '简体中文'), L('ko', 'Korean', '한국어'),
  L('ru', 'Russian', 'Русский'),
  L('nl', 'Dutch', 'Nederlands'), L('pl', 'Polish', 'Polski'), L('el', 'Greek', 'Ελληνικά'),
  L('tr', 'Turkish', 'Türkçe'), L('sv', 'Swedish', 'Svenska'), L('da', 'Danish', 'Dansk'),
  L('nb', 'Norwegian', 'Norsk bokmål'), L('fi', 'Finnish', 'Suomi'), L('is', 'Icelandic', 'Íslenska'),
  L('cs', 'Czech', 'Čeština'), L('sk', 'Slovak', 'Slovenčina'), L('hu', 'Hungarian', 'Magyar'),
  L('ro', 'Romanian', 'Română'), L('bg', 'Bulgarian', 'Български'), L('uk', 'Ukrainian', 'Українська'),
  L('hr', 'Croatian', 'Hrvatski'), L('sr', 'Serbian', 'Српски'), L('sl', 'Slovenian', 'Slovenščina'),
  L('lt', 'Lithuanian', 'Lietuvių'), L('lv', 'Latvian', 'Latviešu'), L('et', 'Estonian', 'Eesti'),
  L('ca', 'Catalan', 'Català'), L('eu', 'Basque', 'Euskara'), L('gl', 'Galician', 'Galego'),
  L('ga', 'Irish', 'Gaeilge'), L('mt', 'Maltese', 'Malti'), L('sq', 'Albanian', 'Shqip'),
  L('mk', 'Macedonian', 'Македонски'), L('ka', 'Georgian', 'ქართული'), L('hy', 'Armenian', 'Հայերեն'),
  L('az', 'Azerbaijani', 'Azərbaycanca'), L('kk', 'Kazakh', 'Қазақ тілі'), L('uz', 'Uzbek', 'Oʻzbekcha'),
  L('fa', 'Persian', 'فارسی', { rtl: true }), L('ur', 'Urdu', 'اردو', { rtl: true }),
  L('hi', 'Hindi', 'हिन्दी'), L('bn', 'Bengali', 'বাংলা'), L('pa', 'Punjabi', 'ਪੰਜਾਬੀ'),
  L('gu', 'Gujarati', 'ગુજરાતી'), L('mr', 'Marathi', 'मराठी'), L('ta', 'Tamil', 'தமிழ்'),
  L('te', 'Telugu', 'తెలుగు'), L('kn', 'Kannada', 'ಕನ್ನಡ'), L('ml', 'Malayalam', 'മലയാളം'),
  L('ne', 'Nepali', 'नेपाली'), L('si', 'Sinhala', 'සිංහල'),
  L('th', 'Thai', 'ไทย'), L('vi', 'Vietnamese', 'Tiếng Việt'), L('id', 'Indonesian', 'Bahasa Indonesia'),
  L('ms', 'Malay', 'Bahasa Melayu'), L('tl', 'Filipino', 'Filipino'), L('km', 'Khmer', 'ខ្មែរ'),
  L('lo', 'Lao', 'ລາວ'), L('my', 'Burmese', 'မြန်မာ'), L('mn', 'Mongolian', 'Монгол'),
  L('zh-Hant', 'Chinese (Traditional)', '繁體中文'),
  L('sw', 'Swahili', 'Kiswahili'), L('am', 'Amharic', 'አማርኛ'), L('yo', 'Yoruba', 'Yorùbá'),
  L('ig', 'Igbo', 'Igbo'), L('ha', 'Hausa', 'Hausa'), L('zu', 'Zulu', 'isiZulu'), L('af', 'Afrikaans', 'Afrikaans'),
];
export const langInfo = (code) => LANGS.find((l) => l.code === code) || L(code, code, code);
export const isRtl = (code) => langInfo(code).rtl;

/* ---------------------------------------------------------------- Terms */
// [en, es, fr, de, it, pt, he, ar, ja, zh, ko, ru]
const TERMS = {
  /* --- labels --- */
  allergy: ['Allergy', 'Alergia', 'Allergie', 'Allergie', 'Allergia', 'Alergia', 'אלרגיה', 'حساسية', 'アレルギー', '过敏', '알레르기', 'Аллергия'],
  allergies: ['Allergies', 'Alergias', 'Allergies', 'Allergien', 'Allergie', 'Alergias', 'אלרגיות', 'الحساسية', 'アレルギー', '过敏史', '알레르기', 'Аллергии'],
  medications: ['Medications', 'Medicación', 'Traitements', 'Medikamente', 'Farmaci', 'Medicação', 'תרופות', 'الأدوية', '服用薬', '用药', '복용 약물', 'Лекарства'],
  diagnoses: ['Diagnoses', 'Diagnósticos', 'Diagnostics', 'Diagnosen', 'Diagnosi', 'Diagnósticos', 'אבחנות', 'التشخيصات', '診断', '诊断', '진단', 'Диагнозы'],
  tests: ['Test results', 'Resultados de pruebas', 'Résultats d’analyses', 'Befunde', 'Risultati degli esami', 'Resultados de exames', 'תוצאות בדיקות', 'نتائج الفحوصات', '検査結果', '检查结果', '검사 결과', 'Результаты анализов'],
  blood: ['Blood type', 'Grupo sanguíneo', 'Groupe sanguin', 'Blutgruppe', 'Gruppo sanguigno', 'Tipo sanguíneo', 'סוג דם', 'فصيلة الدم', '血液型', '血型', '혈액형', 'Группа крови'],
  dose: ['Dose', 'Dosis', 'Dose', 'Dosis', 'Dose', 'Dose', 'מינון', 'الجرعة', '用量', '剂量', '용량', 'Доза'],
  schedule: ['Schedule', 'Pauta', 'Fréquence', 'Einnahme', 'Posologia', 'Posologia', 'מתי', 'التوقيت', '服用時', '用法', '복용 시점', 'Режим приёма'],
  reaction: ['Reaction', 'Reacción', 'Réaction', 'Reaktion', 'Reazione', 'Reação', 'תגובה', 'رد الفعل', '反応', '反应', '반응', 'Реакция'],
  severity: ['Severity', 'Gravedad', 'Gravité', 'Schweregrad', 'Gravità', 'Gravidade', 'חומרה', 'الشدة', '重症度', '严重程度', '중증도', 'Тяжесть'],
  onset: ['Onset', 'Inicio', 'Début', 'Beginn', 'Esordio', 'Início', 'הופעה', 'البداية', '発症', '起病', '발병', 'Начало'],
  result: ['Result', 'Resultado', 'Résultat', 'Ergebnis', 'Risultato', 'Resultado', 'תוצאה', 'النتيجة', '結果', '结果', '결과', 'Результат'],
  reference: ['Reference', 'Referencia', 'Référence', 'Referenzbereich', 'Riferimento', 'Referência', 'טווח תקין', 'المعدل المرجعي', '基準値', '参考范围', '참고치', 'Норма'],
  advice: ['Advice', 'Indicación', 'Consigne', 'Hinweis', 'Indicazione', 'Indicação', 'הנחיה', 'إرشاد', '指示', '建议', '지시', 'Указание'],
  note: ['Note', 'Nota', 'Remarque', 'Hinweis', 'Nota', 'Nota', 'הערה', 'ملاحظة', '備考', '备注', '비고', 'Примечание'],
  patient: ['Patient', 'Paciente', 'Patient', 'Patient', 'Paziente', 'Paciente', 'מטופל', 'المريض', '患者', '患者', '환자', 'Пациент'],
  dob: ['Date of birth', 'Fecha de nacimiento', 'Date de naissance', 'Geburtsdatum', 'Data di nascita', 'Data de nascimento', 'תאריך לידה', 'تاريخ الميلاد', '生年月日', '出生日期', '생년월일', 'Дата рождения'],
  issued: ['Issued', 'Fecha de emisión', 'Date d’émission', 'Ausgestellt', 'Data di emissione', 'Data de emissão', 'תאריך הנפקה', 'تاريخ الإصدار', '発行日', '签发日期', '발행일', 'Дата выдачи'],
  issuer: ['Issued by', 'Emitido por', 'Émis par', 'Ausgestellt von', 'Emesso da', 'Emitido por', 'הונפק על ידי', 'صادر عن', '発行元', '签发机构', '발행 기관', 'Выдано'],
  original: ['Original', 'Original', 'Original', 'Original', 'Originale', 'Original', 'מקור', 'الأصل', '原文', '原文', '원문', 'Оригинал'],
  show_original: ['Show original', 'Ver original', 'Voir l’original', 'Original anzeigen', 'Mostra originale', 'Ver original', 'הצג מקור', 'عرض الأصل', '原文を表示', '显示原文', '원문 보기', 'Показать оригинал'],
  records: ['Source documents', 'Documentos de origen', 'Documents sources', 'Quelldokumente', 'Documenti di origine', 'Documentos de origem', 'מסמכי מקור', 'المستندات الأصلية', '元の文書', '原始文件', '원본 문서', 'Исходные документы'],
  doctor_title: ['Patient medical summary', 'Resumen médico del paciente', 'Résumé médical du patient', 'Medizinische Zusammenfassung des Patienten', 'Riepilogo medico del paziente', 'Resumo médico do paciente', 'סיכום רפואי של המטופל', 'الملخص الطبي للمريض', '患者の医療サマリー', '患者医疗摘要', '환자 의료 요약', 'Медицинская сводка пациента'],
  critical: ['Critical', 'Crítico', 'Critique', 'Kritisch', 'Critico', 'Crítico', 'קריטי', 'حرج', '重要', '关键', '중요', 'Важно'],
  key_result: ['Key result', 'Resultado clave', 'Résultat clé', 'Wichtiger Befund', 'Risultato chiave', 'Resultado-chave', 'תוצאה מרכזית', 'نتيجة رئيسية', '重要な結果', '关键结果', '주요 결과', 'Ключевой результат'],
  not_recorded: ['Not recorded', 'No consta', 'Non renseigné', 'Nicht dokumentiert', 'Non registrato', 'Não registado', 'לא תועד', 'غير مسجل', '記録なし', '未记录', '기록 없음', 'Не указано'],
  not_translated: ['Not translated · shown as written', 'No traducido · se muestra tal como está escrito', 'Non traduit · affiché tel quel', 'Nicht übersetzt · wie eingegeben', 'Non tradotto · mostrato come scritto', 'Não traduzido · apresentado como escrito', 'לא תורגם · מוצג כפי שנכתב', 'غير مترجم · معروض كما كُتب', '未翻訳 · 原文のまま', '未翻译 · 按原文显示', '번역되지 않음 · 원문 그대로', 'Не переведено · как в оригинале'],
  simulated: ['Simulated translation', 'Traducción simulada', 'Traduction simulée', 'Simulierte Übersetzung', 'Traduzione simulata', 'Tradução simulada', 'תרגום מדומה', 'ترجمة محاكاة', 'シミュレーション翻訳', '模拟翻译', '시뮬레이션 번역', 'Имитация перевода'],
  verify: [
    'Medical translation requires verification by a qualified professional.',
    'La traducción médica debe ser verificada por un profesional cualificado.',
    'La traduction médicale doit être vérifiée par un professionnel qualifié.',
    'Medizinische Übersetzungen müssen von einer Fachkraft überprüft werden.',
    'La traduzione medica deve essere verificata da un professionista qualificato.',
    'A tradução médica deve ser verificada por um profissional qualificado.',
    'תרגום רפואי מחייב אימות על ידי איש מקצוע מוסמך.',
    'تتطلب الترجمة الطبية التحقق منها من قبل مختص مؤهل.',
    '医療翻訳は資格を持つ専門家による確認が必要です。',
    '医疗翻译需经合格专业人员核实。',
    '의료 번역은 자격을 갖춘 전문가의 확인이 필요합니다.',
    'Медицинский перевод должен быть проверен квалифицированным специалистом.',
  ],
  results_ok: [
    'All recorded results are within the reference range or target.',
    'Todos los resultados registrados están dentro del rango de referencia o del objetivo.',
    'Tous les résultats enregistrés sont dans les normes ou dans l’objectif.',
    'Alle dokumentierten Werte liegen im Referenz- oder Zielbereich.',
    'Tutti i risultati registrati rientrano nell’intervallo di riferimento o nell’obiettivo.',
    'Todos os resultados registados estão dentro do intervalo de referência ou do alvo.',
    'כל התוצאות המתועדות נמצאות בטווח התקין או בטווח היעד.',
    'جميع النتائج المسجلة ضمن المعدل المرجعي أو الهدف.',
    '記録された結果はすべて基準範囲内または目標範囲内です。',
    '所有记录的结果均在参考范围或目标范围内。',
    '기록된 모든 결과가 참고 범위 또는 목표 범위 내에 있습니다.',
    'Все зарегистрированные результаты находятся в пределах нормы или целевого диапазона.',
  ],
  no_results: ['No test results recorded.', 'No hay resultados registrados.', 'Aucun résultat enregistré.', 'Keine Befunde dokumentiert.', 'Nessun risultato registrato.', 'Nenhum resultado registado.', 'לא תועדו תוצאות בדיקות.', 'لا توجد نتائج مسجلة.', '検査結果の記録なし。', '无检查结果记录。', '기록된 검사 결과 없음.', 'Результаты анализов не указаны.'],
  none_recorded: ['None recorded', 'Ninguna registrada', 'Aucune renseignée', 'Keine dokumentiert', 'Nessuna registrata', 'Nenhuma registada', 'לא תועדו', 'لا يوجد', '記録なし', '无记录', '기록 없음', 'Не указаны'],

  /* --- document titles --- */
  doc_rx: ['Prescription', 'Receta médica', 'Ordonnance', 'Rezept', 'Ricetta medica', 'Receita médica', 'מרשם', 'وصفة طبية', '処方箋', '处方', '처방전', 'Рецепт'],
  doc_lab: ['Laboratory report', 'Informe de laboratorio', 'Compte rendu de laboratoire', 'Laborbefund', 'Referto di laboratorio', 'Relatório laboratorial', 'דו״ח מעבדה', 'تقرير مختبر', '検査報告書', '化验报告', '검사 보고서', 'Лабораторный отчёт'],
  doc_spiro: ['Spirometry report', 'Informe de espirometría', 'Compte rendu de spirométrie', 'Spirometriebefund', 'Referto spirometrico', 'Relatório de espirometria', 'דו״ח ספירומטריה', 'تقرير قياس التنفس', '呼吸機能検査報告書', '肺功能检查报告', '폐기능 검사 보고서', 'Заключение спирометрии'],
  doc_history: ['Medical history summary', 'Resumen de historia clínica', 'Synthèse des antécédents médicaux', 'Zusammenfassung der Krankengeschichte', 'Sintesi dell’anamnesi', 'Resumo do historial clínico', 'סיכום היסטוריה רפואית', 'ملخص التاريخ الطبي', '病歴要約', '病史摘要', '병력 요약', 'Выписка из истории болезни'],

  /* --- allergens, reactions, severity, advice --- */
  penicillin: ['Penicillin', 'Penicilina', 'Pénicilline', 'Penicillin', 'Penicillina', 'Penicilina', 'פניצילין', 'البنسلين', 'ペニシリン', '青霉素', '페니실린', 'Пенициллин'],
  peanuts: ['Peanuts', 'Cacahuete', 'Arachide', 'Erdnüsse', 'Arachidi', 'Amendoim', 'בוטנים', 'الفول السوداني', 'ピーナッツ', '花生', '땅콩', 'Арахис'],
  sulfonamides: ['Sulfonamide antibiotics', 'Antibióticos sulfonamidas', 'Antibiotiques sulfamides', 'Sulfonamid-Antibiotika', 'Antibiotici sulfamidici', 'Antibióticos sulfonamidas', 'אנטיביוטיקה מסוג סולפונמידים', 'المضادات الحيوية السلفوناميدية', 'サルファ剤(抗菌薬)', '磺胺类抗生素', '설폰아마이드계 항생제', 'Сульфаниламидные антибиотики'],
  latex: ['Latex', 'Látex', 'Latex', 'Latex', 'Lattice', 'Látex', 'לטקס', 'اللاتكس', 'ラテックス', '乳胶', '라텍스', 'Латекс'],
  anaphylaxis: ['Anaphylaxis', 'Anafilaxia', 'Anaphylaxie', 'Anaphylaxie', 'Anafilassi', 'Anafilaxia', 'אנפילקסיס', 'التأق (صدمة تحسسية)', 'アナフィラキシー', '过敏性休克', '아나필락시스', 'Анафилаксия'],
  rash: ['Rash', 'Erupción cutánea', 'Éruption cutanée', 'Hautausschlag', 'Eruzione cutanea', 'Erupção cutânea', 'פריחה', 'طفح جلدي', '発疹', '皮疹', '발진', 'Сыпь'],
  contact_dermatitis: ['Contact dermatitis', 'Dermatitis de contacto', 'Dermatite de contact', 'Kontaktdermatitis', 'Dermatite da contatto', 'Dermatite de contacto', 'דרמטיטיס מגע', 'التهاب الجلد التماسي', '接触皮膚炎', '接触性皮炎', '접촉성 피부염', 'Контактный дерматит'],
  severe: ['Severe', 'Grave', 'Sévère', 'Schwer', 'Grave', 'Grave', 'חמורה', 'شديدة', '重度', '严重', '중증', 'Тяжёлая'],
  moderate: ['Moderate', 'Moderada', 'Modérée', 'Mittelschwer', 'Moderata', 'Moderada', 'בינונית', 'متوسطة', '中等度', '中度', '중등도', 'Средняя'],
  mild: ['Mild', 'Leve', 'Légère', 'Leicht', 'Lieve', 'Ligeira', 'קלה', 'خفيفة', '軽度', '轻度', '경증', 'Лёгкая'],
  avoid_penicillins: ['Avoid all penicillin-class antibiotics.', 'Evitar todos los antibióticos del grupo de la penicilina.', 'Éviter tous les antibiotiques de la famille des pénicillines.', 'Alle Antibiotika der Penicillin-Gruppe vermeiden.', 'Evitare tutti gli antibiotici della classe delle penicilline.', 'Evitar todos os antibióticos da classe das penicilinas.', 'יש להימנע מכל האנטיביוטיקה ממשפחת הפניצילין.', 'تجنب جميع المضادات الحيوية من فئة البنسلين.', 'ペニシリン系抗菌薬はすべて避けること。', '避免使用所有青霉素类抗生素。', '모든 페니실린계 항생제를 피할 것.', 'Избегать всех антибиотиков пенициллинового ряда.'],
  carries_epipen: ['Carries an adrenaline auto-injector (0.3 mg).', 'Lleva un autoinyector de adrenalina (0,3 mg).', 'Porte un auto-injecteur d’adrénaline (0,3 mg).', 'Trägt einen Adrenalin-Autoinjektor (0,3 mg) bei sich.', 'Porta con sé un autoiniettore di adrenalina (0,3 mg).', 'Transporta um autoinjetor de adrenalina (0,3 mg).', 'נושא מזרק אדרנלין אוטומטי (0.3 מ״ג).', 'يحمل حاقن أدرينالين تلقائي (0.3 ملغ).', 'アドレナリン自己注射薬(0.3 mg)を携帯。', '随身携带肾上腺素自动注射器(0.3 毫克)。', '아드레날린 자동주사기(0.3 mg)를 소지함.', 'Имеет при себе автоинжектор адреналина (0,3 мг).'],
  avoid_sulfa: ['Avoid sulfonamide antibiotics.', 'Evitar los antibióticos sulfonamidas.', 'Éviter les antibiotiques sulfamides.', 'Sulfonamid-Antibiotika vermeiden.', 'Evitare gli antibiotici sulfamidici.', 'Evitar antibióticos sulfonamidas.', 'יש להימנע מאנטיביוטיקה מסוג סולפונמידים.', 'تجنب المضادات الحيوية السلفوناميدية.', 'サルファ剤(抗菌薬)を避けること。', '避免使用磺胺类抗生素。', '설폰아마이드계 항생제를 피할 것.', 'Избегать сульфаниламидных антибиотиков.'],
  latex_free: ['Use latex-free gloves.', 'Usar guantes sin látex.', 'Utiliser des gants sans latex.', 'Latexfreie Handschuhe verwenden.', 'Usare guanti senza lattice.', 'Usar luvas sem látex.', 'יש להשתמש בכפפות ללא לטקס.', 'استخدم قفازات خالية من اللاتكس.', 'ラテックスフリーの手袋を使用すること。', '使用无乳胶手套。', '라텍스 없는 장갑을 사용할 것.', 'Использовать перчатки без латекса.'],

  /* --- diagnoses + notes --- */
  t1d: ['Type 1 diabetes', 'Diabetes tipo 1', 'Diabète de type 1', 'Typ-1-Diabetes', 'Diabete di tipo 1', 'Diabetes tipo 1', 'סוכרת סוג 1', 'داء السكري من النوع الأول', '1型糖尿病', '1型糖尿病', '제1형 당뇨병', 'Сахарный диабет 1 типа'],
  asthma: ['Asthma', 'Asma', 'Asthme', 'Asthma', 'Asma', 'Asma', 'אסתמה', 'الربو', '気管支喘息', '哮喘', '천식', 'Бронхиальная астма'],
  hypertension: ['Hypertension', 'Hipertensión arterial', 'Hypertension artérielle', 'Arterielle Hypertonie', 'Ipertensione arteriosa', 'Hipertensão arterial', 'יתר לחץ דם', 'ارتفاع ضغط الدم', '高血圧症', '高血压', '고혈압', 'Артериальная гипертензия'],
  hypothyroidism: ['Hypothyroidism', 'Hipotiroidismo', 'Hypothyroïdie', 'Hypothyreose', 'Ipotiroidismo', 'Hipotiroidismo', 'תת-פעילות של בלוטת התריס', 'قصور الغدة الدرقية', '甲状腺機能低下症', '甲状腺功能减退症', '갑상선기능저하증', 'Гипотиреоз'],
  cgm: ['Uses a continuous glucose monitor (CGM).', 'Usa un monitor continuo de glucosa (MCG).', 'Utilise un capteur de glucose en continu (CGM).', 'Nutzt ein kontinuierliches Glukosemesssystem (CGM).', 'Utilizza un sensore per il monitoraggio continuo del glucosio (CGM).', 'Usa um sensor de monitorização contínua da glicose (CGM).', 'משתמשת בחיישן לניטור רציף של גלוקוז (CGM).', 'تستخدم جهاز مراقبة مستمرة للغلوكوز (CGM).', '持続血糖測定器(CGM)を使用。', '使用持续葡萄糖监测仪(CGM)。', '연속혈당측정기(CGM)를 사용함.', 'Использует систему непрерывного мониторинга глюкозы (CGM).'],
  last_admission_2021: ['Last hospital admission: 2021.', 'Último ingreso hospitalario: 2021.', 'Dernière hospitalisation : 2021.', 'Letzter Krankenhausaufenthalt: 2021.', 'Ultimo ricovero ospedaliero: 2021.', 'Último internamento hospitalar: 2021.', 'אשפוז אחרון: 2021.', 'آخر دخول إلى المستشفى: 2021.', '最終入院:2021年。', '最近一次住院:2021年。', '최근 입원: 2021년.', 'Последняя госпитализация: 2021 г.'],
  well_controlled: ['Well controlled on medication.', 'Bien controlada con medicación.', 'Bien contrôlée sous traitement.', 'Unter Medikation gut eingestellt.', 'Ben controllata con la terapia.', 'Bem controlada com medicação.', 'מאוזן היטב בטיפול תרופתי.', 'مضبوط جيدًا بالأدوية.', '薬物療法で良好にコントロール。', '药物控制良好。', '약물로 잘 조절됨.', 'Хорошо контролируется медикаментозно.'],
  stable_replacement: ['Stable on daily replacement therapy.', 'Estable con tratamiento sustitutivo diario.', 'Stable sous traitement substitutif quotidien.', 'Stabil unter täglicher Substitutionstherapie.', 'Stabile con terapia sostitutiva quotidiana.', 'Estável com terapêutica de substituição diária.', 'יציב בטיפול תחליפי יומי.', 'مستقر على العلاج التعويضي اليومي.', '毎日の補充療法で安定。', '每日替代治疗下病情稳定。', '매일 보충요법으로 안정적임.', 'Стабильно на ежедневной заместительной терапии.'],
  since_year: ['Since {y}', 'Desde {y}', 'Depuis {y}', 'Seit {y}', 'Dal {y}', 'Desde {y}', 'מאז {y}', 'منذ {y}', '{y}年〜', '{y}年起', '{y}년부터', 'С {y} г.'],
  childhood: ['Since childhood', 'Desde la infancia', 'Depuis l’enfance', 'Seit der Kindheit', 'Dall’infanzia', 'Desde a infância', 'מאז הילדות', 'منذ الطفولة', '小児期から', '自幼', '소아기부터', 'С детства'],

  /* --- medications, units, schedules --- */
  insulin_glargine: ['Insulin glargine', 'Insulina glargina', 'Insuline glargine', 'Insulin glargin', 'Insulina glargine', 'Insulina glargina', 'אינסולין גלרגין', 'إنسولين غلارجين', 'インスリン グラルギン', '甘精胰岛素', '인슐린 글라진', 'Инсулин гларгин'],
  insulin_aspart: ['Insulin aspart', 'Insulina asparta', 'Insuline asparte', 'Insulin aspart', 'Insulina aspart', 'Insulina asparte', 'אינסולין אספרט', 'إنسولين أسبارت', 'インスリン アスパルト', '门冬胰岛素', '인슐린 아스파트', 'Инсулин аспарт'],
  budesonide_formoterol: ['Budesonide/formoterol', 'Budesonida/formoterol', 'Budésonide/formotérol', 'Budesonid/Formoterol', 'Budesonide/formoterolo', 'Budesonida/formoterol', 'בודסוניד/פורמוטרול', 'بوديزونيد/فورموتيرول', 'ブデソニド/ホルモテロール', '布地奈德/福莫特罗', '부데소니드/포르모테롤', 'Будесонид/формотерол'],
  salbutamol: ['Salbutamol', 'Salbutamol', 'Salbutamol', 'Salbutamol', 'Salbutamolo', 'Salbutamol', 'סלבוטמול', 'سالبوتامول', 'サルブタモール', '沙丁胺醇', '살부타몰', 'Сальбутамол'],
  adrenaline_ai: ['Adrenaline auto-injector', 'Autoinyector de adrenalina', 'Auto-injecteur d’adrénaline', 'Adrenalin-Autoinjektor', 'Autoiniettore di adrenalina', 'Autoinjetor de adrenalina', 'מזרק אדרנלין אוטומטי', 'حاقن أدرينالين تلقائي', 'アドレナリン自己注射薬', '肾上腺素自动注射器', '아드레날린 자동주사기', 'Автоинжектор адреналина'],
  levothyroxine: ['Levothyroxine', 'Levotiroxina', 'Lévothyroxine', 'Levothyroxin', 'Levotiroxina', 'Levotiroxina', 'לבותירוקסין', 'ليفوثيروكسين', 'レボチロキシン', '左甲状腺素', '레보티록신', 'Левотироксин'],
  amlodipine: ['Amlodipine', 'Amlodipino', 'Amlodipine', 'Amlodipin', 'Amlodipina', 'Amlodipina', 'אמלודיפין', 'أملوديبين', 'アムロジピン', '氨氯地平', '암로디핀', 'Амлодипин'],
  u_units: ['units', 'unidades', 'unités', 'Einheiten', 'unità', 'unidades', 'יחידות', 'وحدة', '単位', '单位', '단위', 'ЕД'],
  u_puffs: ['puffs', 'inhalaciones', 'bouffées', 'Hübe', 'erogazioni', 'inalações', 'שאיפות', 'بخات', '吸入', '吸', '회 흡입', 'ингаляции'],
  by_carb: ['By carbohydrate count', 'Según recuento de carbohidratos', 'Selon le comptage des glucides', 'Nach Kohlenhydratberechnung', 'In base al conteggio dei carboidrati', 'De acordo com a contagem de hidratos de carbono', 'לפי ספירת פחמימות', 'حسب حساب الكربوهيدرات', '糖質量に応じて', '根据碳水化合物计量', '탄수화물 계산에 따라', 'По подсчёту углеводов'],
  evening: ['In the evening', 'Por la noche', 'Le soir', 'Abends', 'La sera', 'À noite', 'בערב', 'مساءً', '夜', '晚上', '저녁', 'Вечером'],
  with_meals: ['With meals', 'Con las comidas', 'Aux repas', 'Zu den Mahlzeiten', 'Ai pasti', 'Às refeições', 'עם הארוחות', 'مع الوجبات', '食事時', '随餐', '식사와 함께', 'Во время еды'],
  twice_daily: ['Twice daily', 'Dos veces al día', 'Deux fois par jour', 'Zweimal täglich', 'Due volte al giorno', 'Duas vezes por dia', 'פעמיים ביום', 'مرتين يوميًا', '1日2回', '每日两次', '하루 2회', 'Два раза в день'],
  as_needed: ['As needed', 'Si es necesario', 'Si besoin', 'Bei Bedarf', 'Al bisogno', 'Em caso de necessidade', 'לפי הצורך', 'عند الحاجة', '頓用(必要時)', '按需', '필요 시', 'По необходимости'],
  emergency_only: ['Emergency use only', 'Solo en caso de emergencia', 'En cas d’urgence uniquement', 'Nur im Notfall', 'Solo in caso di emergenza', 'Apenas em emergência', 'לשימוש בחירום בלבד', 'للاستخدام في حالات الطوارئ فقط', '緊急時のみ', '仅限紧急情况', '응급 시에만', 'Только в экстренных случаях'],
  morning_before_breakfast: ['Every morning, before breakfast', 'Cada mañana, antes del desayuno', 'Chaque matin, avant le petit-déjeuner', 'Jeden Morgen vor dem Frühstück', 'Ogni mattina, prima di colazione', 'Todas as manhãs, antes do pequeno-almoço', 'כל בוקר, לפני ארוחת הבוקר', 'كل صباح قبل الإفطار', '毎朝 朝食前', '每天早上早餐前', '매일 아침 식전', 'Каждое утро перед завтраком'],
  once_daily: ['Once daily', 'Una vez al día', 'Une fois par jour', 'Einmal täglich', 'Una volta al giorno', 'Uma vez por dia', 'פעם ביום', 'مرة واحدة يوميًا', '1日1回', '每日一次', '하루 1회', 'Один раз в день'],

  /* --- tests --- */
  hba1c: ['HbA1c (glycated haemoglobin)', 'HbA1c (hemoglobina glicada)', 'HbA1c (hémoglobine glyquée)', 'HbA1c (glykiertes Hämoglobin)', 'HbA1c (emoglobina glicata)', 'HbA1c (hemoglobina glicada)', 'HbA1c (המוגלובין מסוכרר)', 'HbA1c (الهيموغلوبين السكري)', 'HbA1c(ヘモグロビンA1c)', '糖化血红蛋白(HbA1c)', '당화혈색소(HbA1c)', 'HbA1c (гликированный гемоглобин)'],
  creatinine: ['Creatinine', 'Creatinina', 'Créatinine', 'Kreatinin', 'Creatinina', 'Creatinina', 'קריאטינין', 'الكرياتينين', 'クレアチニン', '肌酐', '크레아티닌', 'Креатинин'],
  fev1: ['FEV1', 'FEV1 (VEF1)', 'VEMS (FEV1)', 'FEV1 (Einsekundenkapazität)', 'FEV1 (VEMS)', 'VEMS (FEV1)', 'FEV1', 'FEV1', '1秒量(FEV1)', 'FEV1(第一秒用力呼气量)', 'FEV1(1초간 강제호기량)', 'ОФВ1 (FEV1)'],
  fev1_fvc: ['FEV1/FVC ratio', 'Cociente FEV1/FVC', 'Rapport VEMS/CVF', 'FEV1/FVC-Verhältnis', 'Rapporto FEV1/FVC', 'Relação FEV1/CVF', 'יחס FEV1/FVC', 'نسبة FEV1/FVC', '1秒率(FEV1/FVC)', 'FEV1/FVC 比值', 'FEV1/FVC 비율', 'Индекс ОФВ1/ФЖЕЛ'],
  tsh: ['TSH (thyroid-stimulating hormone)', 'TSH (tirotropina)', 'TSH (thyréostimuline)', 'TSH (Thyreotropin)', 'TSH (tireotropina)', 'TSH (tirotropina)', 'TSH (הורמון מגרה בלוטת התריס)', 'TSH (الهرمون المنبه للدرقية)', 'TSH(甲状腺刺激ホルモン)', '促甲状腺激素(TSH)', '갑상선자극호르몬(TSH)', 'ТТГ (тиреотропный гормон)'],
  potassium: ['Potassium', 'Potasio', 'Potassium', 'Kalium', 'Potassio', 'Potássio', 'אשלגן', 'البوتاسيوم', 'カリウム', '钾', '칼륨', 'Калий'],
  pct_predicted: ['{n} % of predicted', '{n} % del valor teórico', '{n} % de la valeur prédite', '{n} % des Sollwerts', '{n} % del predetto', '{n} % do previsto', '{n}% מהצפוי', '{n}% من القيمة المتوقعة', '予測値の{n}%', '预计值的{n}%', '예측치의 {n}%', '{n}% от должного'],
  target: ['Target {x}', 'Objetivo {x}', 'Objectif {x}', 'Zielwert {x}', 'Obiettivo {x}', 'Alvo {x}', 'יעד {x}', 'الهدف {x}', '目標 {x}', '目标 {x}', '목표 {x}', 'Цель {x}'],
  in_range: ['In range', 'Dentro del rango', 'Dans les normes', 'Im Normbereich', 'Nella norma', 'Dentro do intervalo', 'בטווח התקין', 'ضمن المعدل الطبيعي', '基準値内', '在正常范围内', '정상 범위', 'В пределах нормы'],
  in_target: ['Within target', 'Dentro del objetivo', 'Dans l’objectif', 'Im Zielbereich', 'Nell’obiettivo', 'Dentro do alvo', 'בטווח היעד', 'ضمن الهدف', '目標範囲内', '达标', '목표 범위 내', 'В целевом диапазоне'],
};

const IDX = Object.fromEntries(SIM.map((c, i) => [c, i]));
export const hasTerm = (key) => key in TERMS;

/** Glossary lookup. Returns null if the language isn't in the offline glossary. */
export function term(key, lang, params = {}) {
  const row = TERMS[key];
  if (!row || !(lang in IDX)) return null;
  return row[IDX[lang]].replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}
/** English rendering, used as the source text for live AI. */
export const termEn = (key, params) => term(key, 'en', params);

/** Locale-aware number formatting with Latin digits (clinical clarity). */
export function fmtNum(n, lang) {
  const loc = lang === 'zh' ? 'zh-Hans' : lang;
  try {
    return new Intl.NumberFormat(`${loc}-u-nu-latn`, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
}
