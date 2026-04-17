import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./account.module.css";
import BackButton from "@/components/ui/BackButton";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import AccountView, { type AccountReport } from "./AccountView";
import WearablePanel, { type WearableUploadRow } from "./WearablePanel";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login?next=/account", locale });
    return null;
  }

  const svc = getSupabaseServiceClient();

  // 1. Resolve all `users` rows linked to this auth account (linked via
  //    auth_user_id, OR matched by email for pre-link legacy rows).
  const { data: userRows } = await svc
    .from("users")
    .select("id, email")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`);

  const userIds = (userRows ?? []).map((u) => u.id);

  // 2. Fetch assessments for those user_ids (most recent first).
  const { data: assessments } = userIds.length
    ? await svc
        .from("assessments")
        .select("id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const assessmentIds = (assessments ?? []).map((a) => a.id);

  // 3. Scores + artifacts for those assessments.
  const [scoresRes, artifactsRes] = assessmentIds.length
    ? await Promise.all([
        svc.from("scores").select("assessment_id, score_code, score_value, band").in("assessment_id", assessmentIds),
        svc.from("report_artifacts").select("assessment_id, file_url, file_type").in("assessment_id", assessmentIds),
      ])
    : [{ data: [] }, { data: [] }];

  // 3b. Wearable uploads for those users.
  const { data: wearableRows } = userIds.length
    ? await svc
        .from("wearable_uploads")
        .select("id, source, window_start, window_end, days_covered, assessment_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const wearableUploads = (wearableRows ?? []) as WearableUploadRow[];

  // Score codes saved by /api/assessment: "activity_score", "sleep_score",
  // "vo2max_score", "metabolic_score", "stress_score", "overall_score".
  const scoresByAssessment = new Map<string, Record<string, number>>();
  const bandByAssessment = new Map<string, string>();
  const assessmentsWithScores = new Set<string>();
  for (const s of scoresRes.data ?? []) {
    const map = scoresByAssessment.get(s.assessment_id) ?? {};
    map[s.score_code] = Number(s.score_value);
    scoresByAssessment.set(s.assessment_id, map);
    assessmentsWithScores.add(s.assessment_id);
    if (s.score_code === "overall_score" && s.band) bandByAssessment.set(s.assessment_id, s.band);
  }

  // Group all artifacts by assessment + file_type (first row wins per type).
  const artifactsByAssessment = new Map<string, Record<string, string>>();
  for (const a of artifactsRes.data ?? []) {
    const map = artifactsByAssessment.get(a.assessment_id) ?? {};
    const key = a.file_type ?? "pdf";
    if (!map[key]) map[key] = a.file_url;
    artifactsByAssessment.set(a.assessment_id, map);
  }

  // Only include assessments that have score rows (filters out null/dummy entries).
  const reports: AccountReport[] = (assessments ?? [])
    .filter((a) => assessmentsWithScores.has(a.id))
    .map((a) => {
      const s = scoresByAssessment.get(a.id) ?? {};
      const arts = artifactsByAssessment.get(a.id) ?? {};
      return {
        id: a.id,
        date: new Date(a.created_at).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Europe/Berlin",
        }),
        isoDate: new Date(a.created_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }),
        overall: Math.round(s.overall_score ?? 0),
        band: bandByAssessment.get(a.id) ?? "",
        scores: {
          activity: Math.round(s.activity_score ?? 0),
          sleep: Math.round(s.sleep_score ?? 0),
          vo2max: Math.round(s.vo2max_score ?? 0),
          metabolic: Math.round(s.metabolic_score ?? 0),
          stress: Math.round(s.stress_score ?? 0),
        },
        pdfUrl: arts["pdf"] ?? null,
        planUrls: {
          activity: arts["plan_activity"] ?? null,
          metabolic: arts["plan_metabolic"] ?? null,
          recovery: arts["plan_recovery"] ?? null,
          stress: arts["plan_stress"] ?? null,
        },
      };
    });

  return (
    <div className={styles.page}>
      <BackButton />
      <div className={styles.container}>
        <div className={styles.accountHeader}>
          <div>
            <div className={styles.accountTag}>{t("tag")}</div>
            <h1 className={styles.accountTitle}>{t("title")}</h1>
            <p className={styles.accountSub}>
              {t("subtitle_loggedin_as")} <strong style={{ color: "#fff" }}>{user.email}</strong>
            </p>
          </div>
          <Link href="/kaufen" className={styles.newAnalysisBtn}>
            {t("new_analysis_btn")}
          </Link>
        </div>

        {reports.length === 0 ? (
          <div
            style={{
              padding: "40px 32px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #333",
              textAlign: "center",
              color: "#999",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              {t("empty_title")}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              {t("empty_text")}
            </p>
            <Link href="/kaufen" className={styles.newAnalysisBtn}>
              {t("empty_cta")}
            </Link>
          </div>
        ) : (
          <AccountView reports={reports} />
        )}

        <WearablePanel uploads={wearableUploads} />

        <div className={styles.cta}>
          <Link href="/" className={styles.ctaSecondary}>
            {t("back_home")}
          </Link>
          <form action="/api/auth/logout" method="post" style={{ display: "inline" }}>
            <button
              type="submit"
              className={styles.ctaSecondary}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {t("logout")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
