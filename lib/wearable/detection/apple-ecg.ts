// Detects Apple Health ECG raw-data CSV files (e.g. ecg_*.csv).
// These contain 500 Hz voltage samples — not useful health metrics —
// so dispatch.ts rejects them before sending to the AI parser.

const ECG_FILENAME_PATTERNS = [
  /^ecg_/i,
  /electrocardiogram/i,
  /elektrokardiogramm/i,
];

// Header fragments present in Apple Health ECG CSVs across locales.
const ECG_CONTENT_SIGNATURES = [
  "Sample Rate (Hz)",
  "Échantillonnage (Hz)",
  "Muestreo (Hz)",
  "Sample Rate",
];

export async function isAppleHealthEcgCsv(file: File): Promise<boolean> {
  const name = file.name.toLowerCase();

  // Fast path: filename match
  if (ECG_FILENAME_PATTERNS.some((p) => p.test(name))) return true;

  // Content check only for CSVs
  if (!name.endsWith(".csv")) return false;

  try {
    const slice = file.slice(0, 600);
    const text = await slice.text();
    return ECG_CONTENT_SIGNATURES.some((sig) => text.includes(sig));
  } catch {
    return false;
  }
}
