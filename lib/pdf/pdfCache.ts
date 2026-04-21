// IndexedDB-basierter PDF-Cache — hält alle 5 Report-/Plan-PDFs direkt nach
// der Analyse lokal im Browser vor. Ziel: späterer Klick auf "Download" öffnet
// die Datei in <10 ms statt über Lambda + Supabase-Storage-Roundtrip.
//
// Warum IndexedDB statt sessionStorage?
// - sessionStorage ist String-only und auf ~5-10 MB begrenzt; base64-PDFs
//   kommen schnell auf 3-5 MB und werden bei Quota-Überschreitung ohne
//   Warnung weggeworfen.
// - IndexedDB speichert binäre Uint8Array direkt (keine base64-Umwandlung),
//   hat deutlich mehr Quota und überlebt Tab-Reload.
//
// API:
//   cachePdf(key, bytes)      — speichert Uint8Array unter key
//   getCachedPdf(key)         — gibt Uint8Array | null zurück
//   tryOpenCached(key)        — öffnet blob: URL in neuem Tab; true = hit
//   cacheKeyFor(id, type)     — einheitliche Key-Generierung

const DB_NAME = "btb-pdf-cache";
const STORE_NAME = "pdfs";
const DB_VERSION = 1;

export type CacheablePdfType = "report" | "plan_activity" | "plan_metabolic" | "plan_recovery" | "plan_stress";

/** Einheitliche Key-Struktur `${assessmentId}:${type}` — verhindert Kollisionen
 *  zwischen verschiedenen Assessments desselben Users. */
export function cacheKeyFor(assessmentId: string, type: CacheablePdfType): string {
  return `${assessmentId}:${type}`;
}

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIDB()) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

export async function cachePdf(key: string, bytes: Uint8Array): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(bytes, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
    });
    db.close();
  } catch {
    // Speichern ist best-effort — fällt Server-Download nicht kaputt.
  }
}

export async function getCachedPdf(key: string): Promise<Uint8Array | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDb();
    const bytes = await new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const v = req.result;
        resolve(v instanceof Uint8Array ? v : v ? new Uint8Array(v as ArrayBufferLike) : null);
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return bytes;
  } catch {
    return null;
  }
}

/** Öffnet cached Bytes als blob: URL in neuem Tab. Revoked nach 60 s damit
 *  das PDF-Viewer-Tab genug Zeit hatte, den Blob zu laden. */
export function openBytesInNewTab(bytes: Uint8Array): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Versucht, das PDF aus dem Cache zu öffnen. Returned true bei Cache-Hit. */
export async function tryOpenCached(key: string): Promise<boolean> {
  const bytes = await getCachedPdf(key);
  if (!bytes || bytes.byteLength === 0) return false;
  openBytesInNewTab(bytes);
  return true;
}

/** Konvertiert base64-String zu Uint8Array (chunked, damit große PDFs nicht
 *  die call-stack sprengen). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Fetched eine URL und returniert die rohen Bytes. Wenn die URL eine
 *  data:application/pdf;base64,... ist, wird direkt dekodiert (spart den
 *  Fetch-Overhead). */
export async function fetchPdfBytes(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith("data:")) {
      const [, b64] = url.split(",");
      if (!b64) return null;
      return base64ToBytes(b64);
    }
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
