"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./prepare.module.css";
import { parseWhoopZip, WhoopParseError } from "@/lib/wearable/whoop/parser";
import {
  parseAppleHealthZip,
  AppleHealthParseError,
} from "@/lib/wearable/apple/parser";
import type { WearableParseResult } from "@/lib/wearable/types";

function PrepareContent() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const product = params.get("product") ?? "complete-analysis";

  const [paymentChecked, setPaymentChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [whoopOpen, setWhoopOpen] = useState(false);
  const [appleOpen, setAppleOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsingLabel, setParsingLabel] = useState("Datei wird gelesen...");

  const whoopInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stripe verify — same guard as /analyse to prevent deep-links without payment.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) {
        if (!cancelled) router.replace("/kaufen");
        return;
      }
      try {
        const res = await fetch(
          `/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`,
        );
        const data = await res.json();
        if (!cancelled && data.paid) {
          setPaymentChecked(true);
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) router.replace("/kaufen");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  function goToAnalyse(extra?: string) {
    const qs = new URLSearchParams();
    if (sessionId) qs.set("session_id", sessionId);
    qs.set("product", product);
    if (extra) qs.set("wearable", extra);
    router.push(`/analyse?${qs.toString()}`);
  }

  async function handleSkip() {
    // Clear any stale wearable state from a prior attempt.
    try {
      sessionStorage.removeItem("btb_wearable");
    } catch {
      /* ignore */
    }
    goToAnalyse();
  }

  async function runParse(
    source: "whoop" | "apple_health",
    file: File,
  ) {
    setErrorMsg(null);
    setParsing(true);
    setProgress(5);
    setParsingLabel("ZIP wird gelesen...");

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      let result: WearableParseResult;

      if (source === "whoop") {
        const rampTimer = setInterval(() => {
          setProgress((p) => Math.min(75, p + 3));
        }, 120);
        try {
          result = await parseWhoopZip(file);
        } finally {
          clearInterval(rampTimer);
        }
      } else {
        // Apple Health — worker parses with real progress events.
        setParsingLabel("Apple Health Export wird gestreamt...");
        result = await parseAppleHealthZip(file, {
          signal,
          onProgress: (pct) => {
            setProgress(Math.max(5, pct));
          },
        });
      }

      if (signal.aborted) return;

      setProgress(85);
      setParsingLabel("Daten werden gespeichert...");

      const persistRes = await fetch("/api/wearable/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
        signal,
      });
      const persistJson = (await persistRes.json().catch(() => null)) as {
        uploadId?: string;
        error?: string;
      } | null;
      if (!persistRes.ok || !persistJson?.uploadId) {
        throw new Error(
          persistJson?.error ?? `Server-Fehler (${persistRes.status})`,
        );
      }

      setProgress(100);

      // Stash parse result + uploadId in sessionStorage so /analyse can
      // hydrate prefills and badges without re-fetching.
      try {
        sessionStorage.setItem(
          "btb_wearable",
          JSON.stringify({
            uploadId: persistJson.uploadId,
            source: result.source,
            days_covered: result.days_covered,
            metrics: result.metrics,
          }),
        );
      } catch {
        /* ignore storage errors */
      }

      goToAnalyse(persistJson.uploadId);
    } catch (err) {
      if (signal.aborted) {
        setParsing(false);
        return;
      }
      const msg =
        err instanceof WhoopParseError || err instanceof AppleHealthParseError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unbekannter Fehler beim Parsen der Datei.";
      setErrorMsg(msg);
      setParsing(false);
      setProgress(0);
    }
  }

  const handleWhoopFile = (file: File) => runParse("whoop", file);
  const handleAppleFile = (file: File) => runParse("apple_health", file);

  function handleCancel() {
    abortRef.current?.abort();
    setParsing(false);
    setProgress(0);
  }

  if (!paymentChecked) {
    return null; // loading guard — redirect is in flight
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.label}>OPTIONAL · WEARABLE DATEN</div>
        <h1 className={styles.headline}>Nutze deine echten Daten.</h1>
        <p className={styles.subtitle}>
          Hast du Daten von WHOOP oder Apple Health? Dann berechnen wir deine
          Scores noch präziser. Überspringe diesen Schritt, wenn du keine
          Wearables hast — der Fragebogen liefert auch ohne Messdaten starke
          Ergebnisse.
        </p>

        <div className={styles.privacyBanner}>
          <svg
            className={styles.shieldIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <strong>Deine Daten bleiben bei dir.</strong> Die ZIP-Datei wird
            ausschließlich in deinem Browser verarbeitet. An unseren Server
            wandern nur anonyme Durchschnittswerte — keine Messpunkte, kein
            Zeitverlauf, keine Geräte-IDs.
          </div>
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <div className={styles.grid}>
          {/* ── WHOOP Card ──────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.logoBox} aria-hidden>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="#E63222" strokeWidth="1.5" />
                <path
                  d="M9 13l2.4 7 2.4-5.5L16.2 20l2.4-7"
                  stroke="#E63222"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.2 13l2.4 7"
                  stroke="#E63222"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className={styles.cardTitle}>WHOOP</div>
            <div className={styles.cardDesc}>
              Upload deines WHOOP Export-ZIP der letzten 30 Tage.
            </div>

            <div className={styles.tutorial}>
              <button
                className={styles.tutorialToggle}
                onClick={() => setWhoopOpen((v) => !v)}
                aria-expanded={whoopOpen}
              >
                <span className={`${styles.chevron} ${whoopOpen ? styles.chevronOpen : ""}`}>
                  ▾
                </span>
                Anleitung
              </button>
              {whoopOpen && (
                <div className={styles.tutorialContent}>
                  <ol>
                    <li>Öffne die WHOOP App</li>
                    <li>Profil → Einstellungen → Data Export</li>
                    <li>Wähle &quot;Last 90 days&quot; → Export</li>
                    <li>Du bekommst eine E-Mail mit der ZIP-Datei</li>
                    <li>Lade die ZIP hier hoch</li>
                  </ol>
                </div>
              )}
            </div>

            <label
              className={styles.uploadZone}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add(styles.uploadZoneActive);
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove(styles.uploadZoneActive);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove(styles.uploadZoneActive);
                const file = e.dataTransfer.files?.[0];
                if (file) handleWhoopFile(file);
              }}
            >
              <div className={styles.uploadLabel}>ZIP hochladen</div>
              <div className={styles.uploadHint}>
                Klicken oder Datei hierher ziehen
              </div>
              <input
                ref={whoopInputRef}
                type="file"
                accept=".zip,application/zip"
                className={styles.uploadInput}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleWhoopFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* ── Apple Health Card ───────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.logoBox} aria-hidden>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 26s-9-5.5-9-12.5A5.5 5.5 0 0 1 16 10a5.5 5.5 0 0 1 9 3.5C25 20.5 16 26 16 26z"
                  stroke="#E63222"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 16h3l1.5-3 2.5 6 1.5-3h4"
                  stroke="#E63222"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.cardTitle}>Apple Health</div>
            <div className={styles.cardDesc}>
              Upload deines Health Export aus der iOS Health App — inklusive
              HRV, Schritte und VO2max.
            </div>

            <div className={styles.tutorial}>
              <button
                className={styles.tutorialToggle}
                onClick={() => setAppleOpen((v) => !v)}
                aria-expanded={appleOpen}
              >
                <span className={`${styles.chevron} ${appleOpen ? styles.chevronOpen : ""}`}>
                  ▾
                </span>
                Anleitung
              </button>
              {appleOpen && (
                <div className={styles.tutorialContent}>
                  <ol>
                    <li>Öffne die Health App auf deinem iPhone</li>
                    <li>Tippe dein Profil (oben rechts)</li>
                    <li>Scroll runter → &quot;Alle Gesundheitsdaten exportieren&quot;</li>
                    <li>Warte 2-5 Minuten (kann länger dauern)</li>
                    <li>Teile die ZIP-Datei mit dir selbst (AirDrop/E-Mail)</li>
                    <li>Lade sie hier hoch</li>
                  </ol>
                  <div className={styles.tutorialNote}>
                    Große Dateien möglich (bis 2 GB) — die Verarbeitung kann
                    einige Minuten dauern und läuft komplett in deinem Browser.
                  </div>
                </div>
              )}
            </div>

            <label
              className={styles.uploadZone}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add(styles.uploadZoneActive);
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove(styles.uploadZoneActive);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove(styles.uploadZoneActive);
                const file = e.dataTransfer.files?.[0];
                if (file) handleAppleFile(file);
              }}
            >
              <div className={styles.uploadLabel}>ZIP hochladen</div>
              <div className={styles.uploadHint}>
                Klicken oder Datei hierher ziehen
              </div>
              <input
                type="file"
                accept=".zip,application/zip"
                className={styles.uploadInput}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAppleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* ── Skip Card ───────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.logoBox} aria-hidden>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M6 9h16M6 16h16M6 23h10"
                  stroke="#E63222"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="23" cy="23" r="3" stroke="#E63222" strokeWidth="1.5" />
                <path
                  d="M23 21v2l1.3 1.3"
                  stroke="#E63222"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.cardTitle}>Nur Fragebogen</div>
            <div className={styles.cardDesc}>
              Kein Wearable? Kein Problem — der Fragebogen liefert auch
              präzise Scores auf Basis validierter Methoden (WHO, IPAQ,
              NSF/AASM).
            </div>
            <button className={styles.skipBtn} onClick={handleSkip}>
              Ohne Wearable fortfahren →
            </button>
          </div>
        </div>

        <button className={styles.skipLink} onClick={handleSkip}>
          Diesen Schritt überspringen →
        </button>
      </div>

      {parsing && (
        <div className={styles.overlay}>
          <div className={styles.overlayInner}>
            <div className={styles.overlayLabel}>WEARABLE-DATEN · LOKAL VERARBEITET</div>
            <div className={styles.overlayTitle}>
              DEINE DATEN<br />WERDEN ANALYSIERT.
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {Math.floor(progress)}% · {parsingLabel}
            </div>
            <div className={styles.overlayReassurance}>
              Alles läuft lokal in deinem Browser — die ZIP wird nicht
              hochgeladen, nur die Durchschnittswerte.
            </div>
            <button className={styles.overlayCancel} onClick={handleCancel}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreparePage() {
  return (
    <Suspense fallback={null}>
      <PrepareContent />
    </Suspense>
  );
}
