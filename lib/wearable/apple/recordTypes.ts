// Apple HealthKit record types we extract. Everything else in export.xml
// is dropped immediately in the SAX event handler to keep memory bounded.
//
// Reference: https://developer.apple.com/documentation/healthkit/data_types

export const APPLE_RECORD_TYPES = {
  heartRate: "HKQuantityTypeIdentifierHeartRate",
  restingHeartRate: "HKQuantityTypeIdentifierRestingHeartRate",
  hrvSdnn: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  sleepAnalysis: "HKCategoryTypeIdentifierSleepAnalysis",
  stepCount: "HKQuantityTypeIdentifierStepCount",
  activeEnergyBurned: "HKQuantityTypeIdentifierActiveEnergyBurned",
  bodyMass: "HKQuantityTypeIdentifierBodyMass",
  vo2Max: "HKQuantityTypeIdentifierVO2Max",
} as const;

export const APPLE_TYPE_SET = new Set<string>(Object.values(APPLE_RECORD_TYPES));

// Apple's sleep analysis uses category values. Only asleep states count
// toward duration; inBed but unasleep is excluded (Apple docs 2022+).
// HKCategoryValueSleepAnalysis:
//   0 = inBed, 1 = asleep (deprecated), 3 = awake,
//   4 = asleepCore, 5 = asleepDeep, 6 = asleepREM, 2 = asleepUnspecified
export const APPLE_ASLEEP_VALUES = new Set<string>([
  "HKCategoryValueSleepAnalysisAsleep",
  "HKCategoryValueSleepAnalysisAsleepCore",
  "HKCategoryValueSleepAnalysisAsleepDeep",
  "HKCategoryValueSleepAnalysisAsleepREM",
  "HKCategoryValueSleepAnalysisAsleepUnspecified",
]);
