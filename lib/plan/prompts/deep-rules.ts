// Locale-aware deep-rules for the plan AI user prompt.
// *_DE maps are byte-identical copies of the prior inline maps in
// app/api/plan/generate/route.ts. Other locales are full translations
// preserving the imperative MUSS / MUST register.

type Locale = "de" | "en" | "it" | "tr";

function normalize(locale: string | undefined): Locale {
  if (locale === "en" || locale === "it" || locale === "tr") return locale;
  return "de";
}

// ── Nutrition-painpoint map ─────────────────────────────────────────────────

const NP_MAP_DE: Record<string, string> = {
  cravings_evening: 'Mindestens 1 Block MUSS "Heißhunger abends" explizit adressieren — konkret mit Protein-Timing (z.B. 30 g Protein beim Abendessen stabilisiert Blutzucker → weniger Cravings in der Nacht).',
  low_protein: "Mindestens 1 Block MUSS Protein-Targets konkret machen (z.B. 1,6–2,2 g/kg KG/Tag → Portionen × Mahlzeit runterbrechen).",
  no_energy: "Mindestens 1 Block MUSS Energie-Timing adressieren (Frühstücks-Timing, Koffein-Cutoff, Blutzucker-Stabilisierung).",
  no_time: "Mindestens 1 Block MUSS Meal-Prep-Friction reduzieren (Sonntags 30-Min-Prep, 2–3 Protein-Quellen vorkochen).",
};

const NP_MAP_EN: Record<string, string> = {
  cravings_evening: 'At least 1 block MUST explicitly address evening cravings — concretely with protein timing (e.g. 30 g protein at dinner stabilises blood sugar → fewer cravings at night).',
  low_protein: "At least 1 block MUST make protein targets concrete (e.g. 1.6–2.2 g/kg body weight/day → break down portions × meal).",
  no_energy: "At least 1 block MUST address energy timing (breakfast timing, caffeine cutoff, blood-sugar stabilisation).",
  no_time: "At least 1 block MUST reduce meal-prep friction (Sunday 30-min prep, pre-cook 2–3 protein sources).",
};

const NP_MAP_IT: Record<string, string> = {
  cravings_evening: 'Almeno 1 blocco DEVE affrontare esplicitamente le voglie serali — concretamente con protein timing (es. 30 g di proteine a cena stabilizzano la glicemia → meno voglie di notte).',
  low_protein: "Almeno 1 blocco DEVE rendere concreti i target proteici (es. 1,6–2,2 g/kg peso corporeo/giorno → ripartire le porzioni × pasto).",
  no_energy: "Almeno 1 blocco DEVE affrontare l'energy timing (timing della colazione, cutoff della caffeina, stabilizzazione glicemica).",
  no_time: "Almeno 1 blocco DEVE ridurre la friction del meal-prep (prep di 30 min la domenica, pre-cuocere 2–3 fonti proteiche).",
};

const NP_MAP_TR: Record<string, string> = {
  cravings_evening: 'En az 1 blok akşam isteklerini açıkça ele ALMALIDIR — somut olarak protein zamanlamasıyla (örn. akşam yemeğinde 30 g protein kan şekerini dengeler → gece daha az istek).',
  low_protein: "En az 1 blok protein hedeflerini somutlaştırMALIDIR (örn. 1,6–2,2 g/kg vücut ağırlığı/gün → porsiyonları × öğüne böl).",
  no_energy: "En az 1 blok enerji zamanlamasını ele ALMALIDIR (kahvaltı zamanlaması, kafein cutoff'u, kan şekeri dengelenmesi).",
  no_time: "En az 1 blok meal-prep friksiyonunu azaltMALIDIR (pazar 30 dk prep, 2–3 protein kaynağını önceden pişir).",
};

// ── Stress-source map ───────────────────────────────────────────────────────

const SS_MAP_DE: Record<string, string> = {
  job: 'Mindestens 1 Block MUSS Arbeits-Stress-Recovery adressieren (z.B. 3-Min-Atem-Reset nach letztem Meeting, klare Feierabend-Transition, keine Arbeits-Mails nach 20 Uhr).',
  family: 'Mindestens 1 Block MUSS Familien-Transitionen adressieren (z.B. 10 Min Allein-Zeit nach Heimkommen, bevor in den Familien-Modus).',
  finances: 'Mindestens 1 Block MUSS Finanz-Stress-Cognitive-Load adressieren (z.B. 1× pro Woche 20-Min-Finanz-Check in festem Zeitslot — reduziert diffuse Dauer-Sorge).',
  health: 'Mindestens 1 Block MUSS Gesundheits-Unsicherheit kalibrieren (z.B. Abend-Journal: 3 kontrollierbare Dinge heute).',
  future: 'Mindestens 1 Block MUSS Zukunfts-Angst kalibrieren (z.B. Journaling auf "3 heute-kontrollierbare Dinge" fokussieren).',
};

const SS_MAP_EN: Record<string, string> = {
  job: 'At least 1 block MUST address work-stress recovery (e.g. 3-min breath reset after the last meeting, clear end-of-day transition, no work emails after 8 pm).',
  family: 'At least 1 block MUST address family transitions (e.g. 10 min alone time after arriving home, before switching into family mode).',
  finances: 'At least 1 block MUST address finance-stress cognitive load (e.g. 1× per week 20-min finance check in a fixed time slot — reduces diffuse background worry).',
  health: 'At least 1 block MUST calibrate health uncertainty (e.g. evening journal: 3 controllable things today).',
  future: 'At least 1 block MUST calibrate future-anxiety (e.g. focus journaling on "3 things controllable today").',
};

const SS_MAP_IT: Record<string, string> = {
  job: 'Almeno 1 blocco DEVE affrontare il recupero dallo stress lavorativo (es. reset respiratorio di 3 min dopo l\'ultimo meeting, transizione chiara a fine giornata, niente email di lavoro dopo le 20:00).',
  family: 'Almeno 1 blocco DEVE affrontare le transizioni familiari (es. 10 min da solo/a dopo essere tornato/a a casa, prima di passare in modalità famiglia).',
  finances: 'Almeno 1 blocco DEVE affrontare il carico cognitivo dello stress finanziario (es. 1× a settimana check finanziario di 20 min in uno slot fisso — riduce la preoccupazione diffusa).',
  health: 'Almeno 1 blocco DEVE calibrare l\'incertezza sulla salute (es. journal serale: 3 cose controllabili oggi).',
  future: 'Almeno 1 blocco DEVE calibrare l\'ansia da futuro (es. focalizzare il journaling su "3 cose controllabili oggi").',
};

const SS_MAP_TR: Record<string, string> = {
  job: 'En az 1 blok iş stresi iyileşmesini ele ALMALIDIR (örn. son toplantıdan sonra 3 dk nefes reseti, net mesai bitişi geçişi, saat 20:00\'den sonra iş maili yok).',
  family: 'En az 1 blok aile geçişlerini ele ALMALIDIR (örn. eve geldikten sonra aile moduna geçmeden 10 dk yalnız zaman).',
  finances: 'En az 1 blok finans stresinin bilişsel yükünü ele ALMALIDIR (örn. haftada 1× sabit zaman diliminde 20 dk finans kontrolü — yaygın sürekli endişeyi azaltır).',
  health: 'En az 1 blok sağlık belirsizliğini kalibre ETMELIDIR (örn. akşam journal: bugün kontrol edilebilen 3 şey).',
  future: 'En az 1 blok gelecek kaygısını kalibre ETMELIDIR (örn. journaling\'i "bugün kontrol edilebilen 3 şey"e odakla).',
};

// ── Recovery-ritual map ─────────────────────────────────────────────────────

const RR_MAP_DE: Record<string, string> = {
  sport: "Baue auf dem Ritual SPORT auf — keine komplett neue Routine aufzwingen.",
  nature: 'Integriere NATUR-Exposure explizit (z.B. "5 Min draußen zwischen 2 Meetings" statt nur "Atem-Pause").',
  cooking: "KOCHEN als Regenerations-Anker nutzen — z.B. 1× pro Woche Meal-Prep als bewusste Down-Time framen.",
  reading: "LESEN als Abend-Cutoff-Ritual framen (letzte 30 Min vor Schlaf: Papier-Buch, kein Screen).",
  meditation: "MEDITATION ausbauen statt komplett neu einführen — Dauer langsam steigern.",
  social: 'Soziale Interaktion als Regenerations-Tool framen (z.B. "1× pro Woche ungestörte Zeit mit wichtiger Person").',
};

const RR_MAP_EN: Record<string, string> = {
  sport: "Build on the user's existing SPORT ritual — do not impose a completely new routine.",
  nature: 'Integrate NATURE exposure explicitly (e.g. "5 min outside between two meetings" instead of just a "breath break").',
  cooking: "Use COOKING as a recovery anchor — e.g. frame weekly meal-prep as deliberate down-time.",
  reading: "Frame READING as an evening cutoff ritual (last 30 min before sleep: paper book, no screen).",
  meditation: "Expand existing MEDITATION rather than introducing it from scratch — raise duration gradually.",
  social: 'Frame social interaction as a recovery tool (e.g. "1× per week uninterrupted time with an important person").',
};

const RR_MAP_IT: Record<string, string> = {
  sport: "Costruisci sul rituale esistente dello SPORT — non imporre una routine completamente nuova.",
  nature: 'Integra l\'esposizione alla NATURA in modo esplicito (es. "5 min all\'aperto tra due meeting" invece di una semplice "pausa respirazione").',
  cooking: "Usa la CUCINA come ancora di recupero — es. inquadra il meal-prep settimanale come down-time consapevole.",
  reading: "Inquadra la LETTURA come rituale di cutoff serale (ultimi 30 min prima del sonno: libro cartaceo, niente schermo).",
  meditation: "Espandi la MEDITAZIONE già esistente invece di introdurla da zero — aumenta la durata gradualmente.",
  social: 'Inquadra l\'interazione sociale come strumento di recupero (es. "1× a settimana tempo indisturbato con una persona importante").',
};

const RR_MAP_TR: Record<string, string> = {
  sport: "Kullanıcının mevcut SPOR ritüeli üzerine inşa et — tamamen yeni bir rutin dayatma.",
  nature: 'DOĞA teması olarak açıkça entegre et (örn. sadece "nefes molası" değil, "iki toplantı arasında 5 dk dışarıda").',
  cooking: "YEMEK PİŞİRMEYİ iyileşme çapası olarak kullan — örn. haftalık meal-prep\'i bilinçli down-time olarak çerçevele.",
  reading: "OKUMAYI akşam cutoff ritüeli olarak çerçevele (uykudan önceki son 30 dk: kâğıt kitap, ekran yok).",
  meditation: "Mevcut MEDİTASYONU sıfırdan başlatmak yerine genişlet — süreyi kademeli olarak artır.",
  social: 'Sosyal etkileşimi iyileşme aracı olarak çerçevele (örn. "haftada 1× önemli bir kişiyle kesintisiz zaman").',
};

export function getDeepRules(locale: string | undefined) {
  const loc = normalize(locale);
  return {
    np: loc === "en" ? NP_MAP_EN : loc === "it" ? NP_MAP_IT : loc === "tr" ? NP_MAP_TR : NP_MAP_DE,
    ss: loc === "en" ? SS_MAP_EN : loc === "it" ? SS_MAP_IT : loc === "tr" ? SS_MAP_TR : SS_MAP_DE,
    rr: loc === "en" ? RR_MAP_EN : loc === "it" ? RR_MAP_IT : loc === "tr" ? RR_MAP_TR : RR_MAP_DE,
  };
}
