-- =====================================================================
-- Migration: GDPR consent logging for health-data analysis
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard).
-- Idempotent: safe to run multiple times.
--
-- Two tables:
--   1. consent_text_versions — frozen snapshot of every text version the
--      user could have seen (heading, body, hint, buttons, privacy URL),
--      one row per (version_label, consent_type, locale). For DSGVO
--      Art. 7 Abs. 1 Nachweispflicht: we must be able to prove EXACTLY
--      which text the user consented to.
--   2. consent_log — one row per user decision (granted | declined),
--      immutable apart from revoked_at / revocation_reason. References
--      consent_text_versions to lock in which text version was shown.
--
-- RLS:
--   - consent_log: user can read + insert OWN rows only. UPDATE/DELETE
--     not allowed for clients (revocation done by service role).
--   - consent_text_versions: any authenticated user can read ACTIVE
--     versions (for render); writes only via service role.
--
-- IP address: column present (nullable) for future use, but the API
-- route does NOT populate it in this iteration (DSGVO-konservativ).
-- =====================================================================

-- ── consent_text_versions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_text_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('de','en','it','tr')),
  heading_text TEXT NOT NULL,
  body_text TEXT NOT NULL,
  hint_text TEXT NOT NULL,
  button_yes_text TEXT NOT NULL,
  button_no_text TEXT NOT NULL,
  privacy_policy_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  UNIQUE(version_label, consent_type, locale)
);

-- Partial unique index: only one active version per (consent_type, locale)
CREATE UNIQUE INDEX IF NOT EXISTS consent_text_versions_one_active_per_type_locale
  ON consent_text_versions (consent_type, locale)
  WHERE is_active = true;

-- ── consent_log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('granted','declined')),
  text_version_id UUID NOT NULL REFERENCES consent_text_versions(id),
  text_locale TEXT NOT NULL CHECK (text_locale IN ('de','en','it','tr')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_type
  ON consent_log (user_id, consent_type);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_text_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='consent_log_select_own') THEN
    CREATE POLICY consent_log_select_own ON consent_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='consent_log_insert_own') THEN
    CREATE POLICY consent_log_insert_own ON consent_log
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='consent_text_versions_select_active') THEN
    CREATE POLICY consent_text_versions_select_active ON consent_text_versions
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- ── Seed v1.0 für consent_type='health_data_analysis' (alle 4 Locales) ─
-- Idempotent via ON CONFLICT DO NOTHING auf (version_label, consent_type, locale).

INSERT INTO consent_text_versions (
  version_label, consent_type, locale,
  heading_text, body_text, hint_text,
  button_yes_text, button_no_text, privacy_policy_url, is_active
)
VALUES
  ('v1.0', 'health_data_analysis', 'de',
   'Einwilligung zur Auswertung deiner Gesundheitsdaten',
   'Ich willige ausdrücklich ein, dass meine hochgeladenen Fitness- und Gesundheitsdaten (z.B. Herzfrequenz, Herzfrequenz-Variabilität, Schlafdaten, körperliche Aktivität) zur Erstellung meines Performance-Reports und der individuellen Pläne ausgewertet werden. Die KI-Auswertung erfolgt über den Anbieter Anthropic in den USA, die Speicherung über Supabase und Vercel. Eine Weitergabe an andere Dritte erfolgt nicht. Die Daten werden bis zu 12 Monate gespeichert. Im Profil unter „Alte Reports" kann ich jeden Upload jederzeit einzeln per Klick löschen. Weitere Informationen finden sich in der Datenschutzerklärung.',
   'Ohne Einwilligung basiert dein Report nur auf dem Fragebogen und ist weniger präzise.',
   'Ja, ich willige ein', 'Nein, überspringen', '/de/datenschutz', true),

  ('v1.0', 'health_data_analysis', 'en',
   'Consent to the analysis of your health data',
   'I expressly consent to my uploaded fitness and health data (e.g. heart rate, heart rate variability, sleep data, physical activity) being analysed to create my performance report and individual plans. The AI analysis is performed by the provider Anthropic in the USA; storage is handled by Supabase and Vercel. The data will not be shared with any other third parties. The data is stored for up to 12 months. In my profile under „Past Reports" I can delete each upload individually at any time with a single click. Further information can be found in the Privacy Policy.',
   'Without consent, your report is based on the questionnaire only and is less precise.',
   'Yes, I consent', 'No, skip', '/en/datenschutz', true),

  ('v1.0', 'health_data_analysis', 'it',
   'Consenso al trattamento dei tuoi dati sulla salute',
   'Acconsento espressamente al trattamento dei miei dati su fitness e salute caricati (ad es. frequenza cardiaca, variabilità della frequenza cardiaca, dati sul sonno, attività fisica) ai fini della creazione del mio report sulle prestazioni e dei piani individuali. L''analisi tramite intelligenza artificiale viene effettuata tramite il fornitore Anthropic negli Stati Uniti; l''archiviazione avviene tramite Supabase e Vercel. I dati non saranno condivisi con altre terze parti. I dati vengono conservati per un massimo di 12 mesi. Nel mio profilo, alla voce „Report precedenti", posso eliminare ogni caricamento singolarmente in qualsiasi momento con un solo clic. Ulteriori informazioni si trovano nell''Informativa sulla privacy.',
   'Senza consenso, il tuo report si basa unicamente sul questionario ed è meno preciso.',
   'Sì, acconsento', 'No, salta', '/it/datenschutz', true),

  ('v1.0', 'health_data_analysis', 'tr',
   'Sağlık verilerinin değerlendirilmesine ilişkin onay',
   'Yüklediğim fitness ve sağlık verilerinin (örn. kalp atış hızı, kalp atış hızı değişkenliği, uyku verileri, fiziksel aktivite) performans raporumun ve bireysel planlarımın oluşturulması amacıyla değerlendirilmesine açıkça onay veriyorum. Yapay zeka değerlendirmesi ABD merkezli Anthropic sağlayıcısı üzerinden gerçekleştirilir; depolama ise Supabase ve Vercel üzerinden yapılır. Veriler başka üçüncü taraflarla paylaşılmaz. Veriler en fazla 12 ay saklanır. Profilimde „Geçmiş Raporlar" altında her yüklemeyi istediğim zaman tek tıkla ayrı ayrı silebilirim. Daha fazla bilgi Gizlilik Politikası''nda bulunabilir.',
   'Onay vermezsen raporun yalnızca anket temelinde oluşturulur ve daha az hassastır.',
   'Evet, onaylıyorum', 'Hayır, atla', '/tr/datenschutz', true)
ON CONFLICT (version_label, consent_type, locale) DO NOTHING;
