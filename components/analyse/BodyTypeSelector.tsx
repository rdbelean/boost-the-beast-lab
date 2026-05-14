"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BodyType } from "@/lib/scoring/body-composition-types";
import {
  BODY_TYPES_MALE,
  BODY_TYPES_FEMALE,
  bodyTypeNumber,
} from "@/lib/scoring/body-composition-types";
import styles from "./BodyTypeSelector.module.css";

interface BodyTypeSelectorProps {
  gender: "male" | "female" | "diverse" | "";
  value: BodyType | null;
  onChange: (bt: BodyType | null) => void;
}

// Image filenames on disk use dashes (male-1.png), DB/i18n use underscores
// (male_1). One small helper keeps this conversion local.
function imageFilename(bt: BodyType): string {
  return `/body-types/${bt.replace("_", "-")}.png`;
}

// Per-image object-position override. Most PNGs are well-centered in canvas;
// female_2..6 have the figure noticeably left of canvas center, so shift the
// cover-crop window further left to bring them back to visual center.
const OBJECT_POSITION_BY_BT: Partial<Record<BodyType, string>> = {
  female_2: "45% center",
  female_3: "45% center",
  female_4: "50% center",
  female_5: "45% center",
  female_6: "45% center",
};

function objectPositionFor(bt: BodyType): string {
  return OBJECT_POSITION_BY_BT[bt] ?? "center";
}

export default function BodyTypeSelector({
  gender,
  value,
  onChange,
}: BodyTypeSelectorProps) {
  const t = useTranslations("analyse.q.body_type");

  const [pickedSeries, setPickedSeries] = useState<"male" | "female">(
    gender === "female" ? "female" : "male",
  );

  if (!gender) {
    return (
      <p className={styles.gateNote}>{t("select_gender_first")}</p>
    );
  }

  const series: "male" | "female" =
    gender === "male" ? "male" : gender === "female" ? "female" : pickedSeries;

  const options: BodyType[] =
    series === "male" ? BODY_TYPES_MALE : BODY_TYPES_FEMALE;

  return (
    <div className={styles.wrapper}>
      {gender === "diverse" && (
        <div className={styles.seriesToggle}>
          <span className={styles.seriesLabel}>
            {t("gender_picker_label")}
          </span>
          <div className={styles.seriesButtons}>
            <button
              type="button"
              onClick={() => setPickedSeries("male")}
              className={`${styles.seriesBtn} ${
                pickedSeries === "male" ? styles.seriesBtnActive : ""
              }`}
            >
              {t("gender_picker_male")}
            </button>
            <button
              type="button"
              onClick={() => setPickedSeries("female")}
              className={`${styles.seriesBtn} ${
                pickedSeries === "female" ? styles.seriesBtnActive : ""
              }`}
            >
              {t("gender_picker_female")}
            </button>
          </div>
        </div>
      )}

      <div
        className={styles.grid}
        role="radiogroup"
        aria-label={t("label")}
      >
        {options.map((bt, idx) => {
          const num = bodyTypeNumber(bt);
          const optionLabel = t(`option_${num}`);
          const selected = value === bt;
          return (
            <button
              key={bt}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(bt)}
              className={`${styles.card} ${selected ? styles.cardActive : ""}`}
            >
              {selected && (
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
              )}
              <span className={styles.imageWrap}>
                <Image
                  src={imageFilename(bt)}
                  alt={optionLabel}
                  width={2816}
                  height={1536}
                  loading={idx < 2 ? "eager" : "lazy"}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                  className={styles.image}
                  style={{ objectPosition: objectPositionFor(bt) }}
                />
              </span>
              <span className={styles.label}>{optionLabel}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange(null)}
        className={styles.skipBtn}
        aria-label={t("skip")}
      >
        {t("skip")}
      </button>
    </div>
  );
}
