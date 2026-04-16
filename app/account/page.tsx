import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./account.module.css";
import BackButton from "@/components/ui/BackButton";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import AccountView, { type AccountReport } from "./AccountView";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
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
        svc.from("report_artifacts").select("assessment_id, file_url").in("assessment_id", assessmentIds),
      ])
    : [{ data: [] }, { data: [] }];

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

  const artifactByAssessment = new Map<string, string>();
  for (const a of artifactsRes.data ?? []) {
    if (!artifactByAssessment.has(a.assessment_id)) {
      artifactByAssessment.set(a.assessment_id, a.file_url);
    }
  }

  // Only include assessments that have score rows (filters out null/dummy entries).
  const reports: AccountReport[] = (assessments ?? [])
    .filter((a) => assessmentsWithScores.has(a.id))
    .map((a) => {
      const s = scoresByAssessment.get(a.id) ?? {};
      return {
        id: a.id,
        date: new Date(a.created_at).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        overall: Math.round(s.overall_score ?? 0),
        band: bandByAssessment.get(a.id) ?? "",
        scores: {
          activity: Math.round(s.activity_score ?? 0),
          sleep: Math.round(s.sleep_score ?? 0),
          vo2max: Math.round(s.vo2max_score ?? 0),
          metabolic: Math.round(s.metabolic_score ?? 0),
          stress: Math.round(s.stress_score ?? 0),
        },
        pdfUrl: artifactByAssessment.get(a.id) ?? null,
      };
    });

  return (
    <div className={styles.page}>
      <BackButton />
      <div className={styles.container}>
        <div className={styles.accountHeader}>
          <div>
            <div className={styles.accountTag}>MEIN ACCOUNT</div>
            <h1 className={styles.accountTitle}>REPORT-HISTORIE</h1>
            <p className={styles.accountSub}>
              Eingeloggt als <strong style={{ color: "#fff" }}>{user.email}</strong>
            </p>
          </div>
          <Link href="/kaufen" className={styles.newAnalysisBtn}>
            NEUE ANALYSE →
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
              NOCH KEINE REPORTS
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Sobald du deine erste Analyse durchführst, landet sie hier automatisch.
            </p>
            <Link href="/kaufen" className={styles.newAnalysisBtn}>
              ERSTE ANALYSE STARTEN →
            </Link>
          </div>
        ) : (
          <AccountView reports={reports} />
        )}

        <div className={styles.cta}>
          <Link href="/" className={styles.ctaSecondary}>
            ← STARTSEITE
          </Link>
          <form action="/api/auth/logout" method="post" style={{ display: "inline" }}>
            <button
              type="submit"
              className={styles.ctaSecondary}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              LOGOUT
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
