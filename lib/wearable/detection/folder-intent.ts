// Detects whether a batch of files looks like an Apple Health sub-folder
// (electrocardiograms or workout-routes) rather than a full export.
//
// Apple Health exports to iCloud contain sub-folders like:
//   electrocardiograms/  → ecg_*.csv  (raw voltage samples — not health metrics)
//   workout-routes/      → route_*.gpx  (GPS tracks — useful for activity data)
//
// When > 80 % of the incoming files match one of these patterns we surface a
// warning so the user knows they may want the full export.zip instead.

export type FolderIntentType =
  | "normal"
  | "apple_ecg_folder"
  | "apple_gpx_folder"
  | "apple_mixed_folder";

export interface FolderIntentResult {
  intent: FolderIntentType;
  ecgCount: number;
  gpxCount: number;
  totalCount: number;
}

const ECG_PATTERN = /^ecg_.*\.csv$/i;
const GPX_PATTERN = /\.(gpx)$/i;
// Apple workout-route GPX files are named route_YYYY-MM-DD_HH-mm-ss.gpx
const GPX_ROUTE_PATTERN = /^route_.*\.gpx$/i;

export function detectFolderIntent(files: File[]): FolderIntentResult {
  const totalCount = files.length;

  if (totalCount === 0) {
    return { intent: "normal", ecgCount: 0, gpxCount: 0, totalCount: 0 };
  }

  const ecgCount = files.filter((f) => ECG_PATTERN.test(f.name)).length;
  // Count GPX files — both generic .gpx and Apple's route_*.gpx pattern
  const gpxCount = files.filter(
    (f) => GPX_ROUTE_PATTERN.test(f.name) || GPX_PATTERN.test(f.name),
  ).length;

  const subfolderCount = ecgCount + gpxCount;
  const subfolderRatio = subfolderCount / totalCount;

  // Only warn when the vast majority of files are recognizable Apple sub-folder content
  if (subfolderRatio < 0.8) {
    return { intent: "normal", ecgCount, gpxCount, totalCount };
  }

  if (ecgCount > 0 && gpxCount > 0) {
    return { intent: "apple_mixed_folder", ecgCount, gpxCount, totalCount };
  }
  if (ecgCount > 0) {
    return { intent: "apple_ecg_folder", ecgCount, gpxCount, totalCount };
  }
  // gpxCount > 0 guaranteed by ratio check
  return { intent: "apple_gpx_folder", ecgCount, gpxCount, totalCount };
}
