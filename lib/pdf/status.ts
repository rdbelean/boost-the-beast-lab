import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type PdfType =
  | "main_report"
  | "plan_activity"
  | "plan_metabolic"
  | "plan_recovery"
  | "plan_stress";

export type PdfGenStatus = "pending" | "generating" | "ready" | "failed";

export interface PdfStatusRow {
  id: string;
  assessment_id: string;
  pdf_type: PdfType;
  locale: string;
  status: PdfGenStatus;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export async function upsertStatus(
  assessmentId: string,
  pdfType: PdfType,
  locale: string,
  status: PdfGenStatus,
  storagePath?: string | null,
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("pdf_generation_status").upsert(
    {
      assessment_id: assessmentId,
      pdf_type: pdfType,
      locale,
      status,
      ...(storagePath !== undefined ? { storage_path: storagePath } : {}),
    },
    { onConflict: "assessment_id,pdf_type,locale" },
  );
  if (error) throw new Error(`upsertStatus failed: ${error.message}`);
}

export async function getStatus(
  assessmentId: string,
  pdfType: PdfType,
  locale: string,
): Promise<PdfStatusRow | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("pdf_generation_status")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("pdf_type", pdfType)
    .eq("locale", locale)
    .maybeSingle();
  if (error) throw new Error(`getStatus failed: ${error.message}`);
  return data as PdfStatusRow | null;
}

export async function getAllStatuses(
  assessmentId: string,
  locale: string,
): Promise<PdfStatusRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("pdf_generation_status")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("locale", locale);
  if (error) throw new Error(`getAllStatuses failed: ${error.message}`);
  return (data ?? []) as PdfStatusRow[];
}
