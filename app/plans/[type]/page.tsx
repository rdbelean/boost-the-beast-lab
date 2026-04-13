"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./plan.module.css";

async function downloadPlanAsPDF(plan: PlanContent) {
  try {
    const res = await fetch("/api/plan/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("PDF generation failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `btb-${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Fallback to html2canvas if server PDF fails
    const content = document.getElementById("plan-content");
    if (!content) return;
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: "#0D0D0D" });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;
    let remaining = imgH;
    let placed = 0;
    while (remaining > 0) {
      pdf.addImage(imgData, "JPEG", 0, -placed, pageW, imgH);
      remaining -= pageH;
      placed += pageH;
      if (remaining > 0) pdf.addPage();
    }
    pdf.save(`btb-${plan.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  }
}

/* ─── Plan definitions ───────────────────────────────────────── */
type PlanType = "activity" | "metabolic" | "recovery" | "stress";

interface PlanBlock { heading: string; items: string[] }
interface PlanContent {
  title: string;
  subtitle: string;
  color: string;
  source: string;
  blocks: PlanBlock[];
}

function buildPlan(type: PlanType, scores: Record<string, unknown>): PlanContent {
  const s = scores as {
    activity: { activity_score_0_100: number; activity_category: string; total_met_minutes_week: number };
    sleep: { sleep_score_0_100: number; sleep_duration_band: string };
    metabolic: { metabolic_score_0_100: number; bmi: number; bmi_category: string };
    stress: { stress_score_0_100: number; stress_band: string };
    vo2max: { vo2max_estimated: number };
  };

  if (type === "activity") {
    const score = s.activity.activity_score_0_100;
    const met = s.activity.total_met_minutes_week;
    const level = score < 40 ? "niedrig" : score < 65 ? "moderat" : score < 80 ? "gut" : "hoch";
    const whoTarget = 600; // WHO minimum MET-min/week
    const gap = Math.max(0, whoTarget - met);
    return {
      title: "ACTIVITY-PLAN",
      subtitle: "Individueller Plan zur Verbesserung deiner Aktivitätswerte",
      color: "#E63222",
      source: "Basiert auf: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form",
      blocks: [
        {
          heading: "Deine Ausgangslage",
          items: [
            `Activity Score: ${score}/100 (${level})`,
            `MET-Minuten/Woche: ${met} (WHO-Ziel: ≥600 MET-min/Woche)`,
            `${gap > 0 ? `Lücke zum WHO-Minimum: ${gap} MET-min/Woche` : "WHO-Mindestempfehlung bereits erfüllt."}`,
          ],
        },
        {
          heading: "Wochenziel (WHO/ACSM-Standard)",
          items: [
            "≥150 Min moderate Aktivität ODER ≥75 Min intensive Aktivität pro Woche",
            "≥2× Krafttraining pro Woche (alle Hauptmuskelgruppen)",
            "Sitzzeit auf max. 8 h/Tag begrenzen — jede Stunde kurze Bewegungspause",
            score < 40
              ? "Einstieg: 3×/Woche 30 Min zügiges Gehen (3,3 MET)"
              : score < 65
              ? "Aufbau: 4×/Woche Mischtraining (Kraft + Ausdauer), progressive Steigerung"
              : "Performance: 5×/Woche strukturiertes Training, Periodisierung einführen",
          ],
        },
        {
          heading: "Wochenplan (Beispiel)",
          items: [
            "Montag: 30–45 Min Ausdauer (Laufen/Radfahren) — moderate Intensität",
            "Dienstag: 30 Min Krafttraining (Ganzkörper)",
            "Mittwoch: Aktive Erholung — 20–30 Min Gehen oder Yoga",
            "Donnerstag: 30–45 Min Ausdauer — höhere Intensität (Intervalle)",
            "Freitag: 30 Min Krafttraining (Ganzkörper)",
            "Samstag: 45–60 Min Sport deiner Wahl",
            "Sonntag: Erholung — leichte Bewegung optional",
          ],
        },
        {
          heading: "Monitoring & Progression",
          items: [
            "Schrittziel: ≥8.000 Schritte/Tag als Basis (Basisaktivität)",
            "MET-Minuten pro Woche mit Fitness-App tracken",
            "Alle 4 Wochen: Trainingsvolumen um 5–10 % steigern (progressive Überladung, ACSM)",
            "Alle 8 Wochen: Neue Analyse durchführen um Fortschritt zu messen",
          ],
        },
      ],
    };
  }

  if (type === "metabolic") {
    const score = s.metabolic.metabolic_score_0_100;
    const bmi = s.metabolic.bmi;
    const cat = s.metabolic.bmi_category;
    return {
      title: "METABOLIC-PLAN",
      subtitle: "Individueller Plan zur Optimierung deiner metabolischen Performance",
      color: "#F59E0B",
      source: "Basiert auf: WHO BMI-Klassifikation, EFSA Nährwertempfehlungen, DGE Ernährungskreis",
      blocks: [
        {
          heading: "Deine Ausgangslage",
          items: [
            `Metabolic Score: ${score}/100`,
            `BMI: ${bmi} kg/m² — Kategorie: ${cat} (WHO-Klassifikation)`,
            `WHO-Normalbereich: 18,5–24,9 kg/m²`,
          ],
        },
        {
          heading: "Ernährungs-Protokoll",
          items: [
            "Mahlzeitenfrequenz: 3 Hauptmahlzeiten, 1–2 Snacks — gleichmäßige Energieverteilung",
            "Proteinzufuhr: 1,6–2,2 g/kg Körpergewicht/Tag (ISSN-Empfehlung für aktive Personen)",
            "Kohlenhydrate: komplex und ballaststoffreich (Vollkorn, Hülsenfrüchte, Gemüse)",
            "Fett: ≥20 % der Gesamtenergie, Schwerpunkt ungesättigte Fettsäuren",
            "Gemüse & Obst: ≥400 g/Tag (WHO-Mindestempfehlung)",
          ],
        },
        {
          heading: "Hydrations-Protokoll",
          items: [
            "Wasserbedarf: ca. 35 ml × Körpergewicht (kg) pro Tag als Richtwert",
            "Bei intensivem Training: +500–750 ml pro Trainingsstunde",
            "Morgens: 300–500 ml Wasser direkt nach dem Aufstehen",
            "Zuckerhaltige Getränke vollständig durch Wasser oder ungesüßten Tee ersetzen",
          ],
        },
        {
          heading: "Monitoring",
          items: [
            "Mahlzeiten für 2 Wochen tracken (App) — Muster erkennen",
            "Körpergewicht 1×/Woche (gleiche Uhrzeit, nüchtern) messen",
            "Ziel: nachhaltiger Gewichtsverlust max. 0,5–1 kg/Woche (WHO-Empfehlung)",
          ],
        },
      ],
    };
  }

  if (type === "recovery") {
    const score = s.sleep.sleep_score_0_100;
    const band = s.sleep.sleep_duration_band;
    return {
      title: "RECOVERY-PLAN",
      subtitle: "Individueller Plan zur Verbesserung deiner Regeneration",
      color: "#3B82F6",
      source: "Basiert auf: NSF Sleep Guidelines, PSQI-Skala, ACSM Recovery Protocols",
      blocks: [
        {
          heading: "Deine Ausgangslage",
          items: [
            `Sleep & Recovery Score: ${score}/100`,
            `Schlafdauer-Band: ${band}`,
            "NSF-Empfehlung für Erwachsene (18–64 J.): 7–9 Stunden/Nacht",
          ],
        },
        {
          heading: "Schlaf-Hygiene-Protokoll",
          items: [
            "Feste Schlafenszeit und Aufwachzeit — auch am Wochenende (±30 min Toleranz)",
            "Schlafzimmer: 16–18 °C, vollständig abgedunkelt, keine Bildschirme",
            "Letzte Mahlzeit ≥2 h vor dem Schlafen",
            "Koffein: kein Konsum nach 14:00 Uhr",
            "Bildschirme (Blaulicht): ≥60 Min vor dem Schlafen abschalten oder Blaulichtfilter",
          ],
        },
        {
          heading: "Trainings-Recovery-Protokoll",
          items: [
            "Nach intensivem Training: ≥48 h Regenerationszeit für gleiche Muskelgruppe",
            "Aktive Erholung: 20 Min leichtes Ausdauertraining oder Spaziergang an Ruhetagen",
            "Kälteanwendung (Kältebad 10–15 °C, 10–15 Min): nachgewiesen entzündungshemmend",
            "Schlaf als primäres Recovery-Tool: jede Stunde zusätzlicher Schlaf reduziert Cortisol",
          ],
        },
        {
          heading: "Wochenstruktur",
          items: [
            "Mindestens 1 vollständiger Ruhetag pro Woche ohne strukturiertes Training",
            "Deload-Woche alle 4–6 Trainingswochen: Volumen um 40–50 % reduzieren",
            "Schlafqualität täglich bewerten (1–10) — Muster über 2 Wochen tracken",
          ],
        },
      ],
    };
  }

  // stress
  const score = s.stress.stress_score_0_100;
  const band = s.stress.stress_band;
  return {
    title: "STRESS & LIFESTYLE-PLAN",
    subtitle: "Individueller Plan zur Optimierung von Stress und Lifestyle",
    color: "#22C55E",
    source: "Basiert auf: WHO Mental Health Guidelines, APA Stress Management, Mindfulness-Based Stress Reduction (MBSR)",
    blocks: [
      {
        heading: "Deine Ausgangslage",
        items: [
          `Stress & Lifestyle Score: ${score}/100`,
          `Stress-Band: ${band}`,
          "Chronischer Stress erhöht Cortisol → beeinträchtigt Schlaf, Metabolismus und Immunsystem",
        ],
      },
      {
        heading: "Tägliches Stress-Protokoll",
        items: [
          "Morgenroutine: 10 Min strukturierte Entspannung (Atemübung, Meditation oder Journaling)",
          "Atemtechnik 4-7-8: 4 s einatmen, 7 s halten, 8 s ausatmen — aktiviert Parasympathikus",
          "Mittagspause: 15–20 Min ohne Bildschirm und ohne Arbeitsbezug",
          "Abendroutine: To-do-Liste für morgen schreiben → Gedanken aus dem Kopf auslagern",
        ],
      },
      {
        heading: "Lifestyle-Optimierung",
        items: [
          "Digitale Auszeiten: 1–2 h/Tag komplett offline (kein Smartphone, kein Social Media)",
          "Soziale Kontakte: regelmäßige Face-to-Face-Interaktionen — nachgewiesen stressreduzierend",
          "Natur: 20 Min in natürlicher Umgebung senken Cortisol messbar (Studie: Univ. Michigan)",
          "Alkohol limitieren: >14 Einheiten/Woche erhöhen Stressachse und verschlechtern Schlaf",
        ],
      },
      {
        heading: "Sport als Stress-Tool",
        items: [
          "Moderate Ausdauerbelastung (65–75 % HFmax) 3×/Woche senkt Cortisolspiegel langfristig",
          "Yoga/Pilates: 2×/Woche — kombiniert Bewegung und Entspannung",
          "KEIN intensives Training bei akutem Stress >8/10 — erhöht Verletzungsrisiko",
        ],
      },
    ],
  };
}

/* ─── Plan Page ─────────────────────────────────────────────── */
export default function PlanPage() {
  const { type } = useParams() as { type: string };
  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const COLORS: Record<string, string> = { activity: "#E63222", metabolic: "#F59E0B", recovery: "#3B82F6", stress: "#22C55E" };
    try {
      const raw = sessionStorage.getItem("btb_results");
      if (!raw) { setError("Keine Analyse-Daten gefunden. Bitte starte die Analyse neu."); return; }
      const data = JSON.parse(raw);
      if (!data?.scores) { setError("Scores nicht verfügbar."); return; }
      const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
      if (!validTypes.includes(type as PlanType)) { setError("Unbekannter Plan-Typ."); return; }

      // Show immediately with local content
      const initial = buildPlan(type as PlanType, data.scores);
      setPlan({ ...initial, color: COLORS[type] ?? "#E63222" });

      // Optionally enhance with AI in background — does not block display
      fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scores: data.scores }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((ai) => {
          if (ai?.blocks?.length) {
            setPlan((prev) => prev ? { ...prev, blocks: ai.blocks, source: ai.source ?? prev.source } : prev);
          }
        })
        .catch(() => {}); // silent — local content already shown
    } catch {
      setError("Plan konnte nicht geladen werden.");
    }
  }, [type]);

  if (error) return (
    <div className={styles.page}>
      <div className={styles.errorBox}>
        <p>{error}</p>
        <Link href="/results" className={styles.backLink}>← Zurück zum Report</Link>
      </div>
    </div>
  );

  if (!plan) return (
    <div className={styles.page} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase" }}>
        Wird geladen…
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/results" className={styles.backLink}>← ZURÜCK ZUM REPORT</Link>
        <div className={styles.headerTitle} style={{ color: plan.color }}>{plan.title}</div>
        <button onClick={() => downloadPlanAsPDF(plan)} className={styles.printBtn}>
          PDF DOWNLOAD ↓
        </button>
      </div>

      <div className={styles.container} id="plan-content">
        <div className={styles.hero}>
          <span className={styles.tag} style={{ color: plan.color, borderColor: plan.color }}>INDIVIDUELLER PLAN</span>
          <h1 className={styles.title}>{plan.title}</h1>
          <p className={styles.subtitle}>{plan.subtitle}</p>
          <p className={styles.source}>{plan.source}</p>
        </div>

        {plan.blocks.map((block) => (
          <section key={block.heading} className={styles.block}>
            <h2 className={styles.blockHeading}>{block.heading}</h2>
            <ul className={styles.blockList}>
              {block.items.map((item) => (
                <li key={item} className={styles.blockItem}>
                  <span className={styles.bullet} style={{ color: plan.color }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className={styles.actions}>
          <button onClick={() => downloadPlanAsPDF(plan)} className={styles.btnPrimary} style={{ background: plan.color }}>
            PLAN ALS PDF HERUNTERLADEN
          </button>
          <Link href="/results" className={styles.btnSecondary}>
            ← ZURÜCK ZUM REPORT
          </Link>
        </div>

        <p className={styles.disclaimer}>
          Alle Empfehlungen basieren auf publizierten Leitlinien (WHO, ACSM, NSF, EFSA) und den individuell berechneten Scores.
          Kein Ersatz für medizinische oder sportmedizinische Beratung.
        </p>
      </div>
    </div>
  );
}
