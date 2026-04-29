import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sendReportEmail,
  displayName,
  safeFilenameStem,
  buildMainReportFilename,
  __setResendClient,
  type PlanAttachment,
  type ReportEmailInput,
} from "@/lib/email/sendReport";
import type { Resend } from "resend";

type SendArgs = Parameters<Resend["emails"]["send"]>[0];
type SendResult = Awaited<ReturnType<Resend["emails"]["send"]>>;

function makeFakeResend(): {
  client: Resend;
  calls: SendArgs[];
  setReturn(value: SendResult): void;
} {
  const calls: SendArgs[] = [];
  let nextReturn: SendResult = { data: { id: "fake-id" } as { id: string }, error: null, headers: null } as SendResult;
  const fake = {
    emails: {
      send: vi.fn(async (args: SendArgs) => {
        calls.push(args);
        return nextReturn;
      }),
    },
  } as unknown as Resend;
  return {
    client: fake,
    calls,
    setReturn(value: SendResult) {
      nextReturn = value;
    },
  };
}

const mainBuffer = Buffer.from("MAIN PDF BYTES");

function planBuffer(label: string): Buffer {
  return Buffer.from(`PLAN ${label}`);
}

function baseInput(overrides: Partial<ReportEmailInput> = {}): ReportEmailInput {
  return {
    email: "user@example.com",
    firstName: "Daniel",
    locale: "de",
    assessmentId: "00000000-0000-4000-8000-000000000001",
    mainReportBuffer: mainBuffer,
    scores: {
      overall: 78,
      activity: 71,
      sleep: 80,
      vo2max: 65,
      metabolic: 88,
      stress: 60,
    },
    planAttachments: [
      { type: "activity", buffer: planBuffer("a"), fallbackUrl: null },
      { type: "metabolic", buffer: planBuffer("m"), fallbackUrl: null },
      { type: "recovery", buffer: planBuffer("r"), fallbackUrl: null },
      { type: "stress", buffer: planBuffer("s"), fallbackUrl: null },
    ] as PlanAttachment[],
    ...overrides,
  };
}

describe("displayName", () => {
  it("returns the trimmed first name when present", () => {
    expect(displayName("Daniel", "user@example.com")).toBe("Daniel");
    expect(displayName("  Maja  ", "user@example.com")).toBe("Maja");
  });

  it("falls back to the email username when first_name is missing", () => {
    expect(displayName(null, "rdb@boostthebeast.com")).toBe("rdb");
    expect(displayName("", "rdb@boostthebeast.com")).toBe("rdb");
    expect(displayName("   ", "rdb@boostthebeast.com")).toBe("rdb");
  });

  it("returns the full email when there is no @ separator", () => {
    expect(displayName(null, "weird-no-at")).toBe("weird-no-at");
  });
});

describe("sendReportEmail", () => {
  let fake: ReturnType<typeof makeFakeResend>;

  beforeEach(() => {
    fake = makeFakeResend();
    __setResendClient(fake.client);
  });

  afterEach(() => {
    __setResendClient(null);
    vi.restoreAllMocks();
  });

  it("attaches the main report and all 4 ready plans (5 total) with clean filenames", async () => {
    await sendReportEmail(baseInput());
    expect(fake.calls).toHaveLength(1);
    const call = fake.calls[0];
    expect(call?.attachments).toBeDefined();
    expect(call?.attachments).toHaveLength(5);
    const filenames = (call?.attachments ?? []).map((a) => a.filename);
    expect(filenames).toContain("Daniel-Performance-Report.pdf");
    expect(filenames).toContain("Activity-Plan.pdf");
    expect(filenames).toContain("Metabolic-Plan.pdf");
    expect(filenames).toContain("Recovery-Plan.pdf");
    expect(filenames).toContain("Stress-Plan.pdf");
    // No assessmentId leaks into filenames anymore.
    for (const fn of filenames) {
      expect(fn).not.toMatch(/00000000-0000-4000-8000-000000000001/);
    }
  });

  it("only attaches the main when all plans have buffer=null", async () => {
    const input = baseInput({
      planAttachments: [
        { type: "activity", buffer: null, fallbackUrl: "https://example.com/a" },
        { type: "metabolic", buffer: null, fallbackUrl: null },
        { type: "recovery", buffer: null, fallbackUrl: null },
        { type: "stress", buffer: null, fallbackUrl: null },
      ],
    });
    await sendReportEmail(input);
    const call = fake.calls[0];
    expect(call?.attachments).toHaveLength(1);
    expect(call?.attachments?.[0]?.filename).toBe("Daniel-Performance-Report.pdf");
  });

  it("falls back to the neutral main-report filename when firstName is missing", async () => {
    await sendReportEmail(baseInput({ firstName: null, email: "rdb@example.com" }));
    const call = fake.calls[0];
    expect(call?.attachments?.[0]?.filename).toBe("Performance-Report.pdf");
  });

  it("renders the fallback link in HTML when a plan buffer is null but URL is set", async () => {
    const input = baseInput({
      planAttachments: [
        { type: "activity", buffer: planBuffer("a"), fallbackUrl: null },
        { type: "metabolic", buffer: null, fallbackUrl: "https://signed.example.com/metabolic.pdf" },
        { type: "recovery", buffer: planBuffer("r"), fallbackUrl: null },
        { type: "stress", buffer: planBuffer("s"), fallbackUrl: null },
      ],
    });
    await sendReportEmail(input);
    const call = fake.calls[0];
    expect(call?.html).toContain("https://signed.example.com/metabolic.pdf");
    expect(call?.html).toContain("wird noch erstellt");
    // 4 attachments = main + 3 ready plans
    expect(call?.attachments).toHaveLength(4);
  });

  it("personalizes greeting + subject per locale", async () => {
    for (const locale of ["de", "en", "it", "tr"] as const) {
      fake = makeFakeResend();
      __setResendClient(fake.client);
      await sendReportEmail(baseInput({ locale }));
      const call = fake.calls[0];
      expect(call?.subject).toContain("Daniel");
      const greetings: Record<string, string> = {
        de: "Hallo Daniel,",
        en: "Hi Daniel,",
        it: "Ciao Daniel,",
        tr: "Merhaba Daniel,",
      };
      expect(call?.html).toContain(greetings[locale]);
    }
  });

  it("falls back to the email username in greeting when firstName is null", async () => {
    await sendReportEmail(baseInput({ firstName: null, email: "maja@example.com" }));
    const call = fake.calls[0];
    expect(call?.subject).toContain("maja");
    expect(call?.html).toContain("Hallo maja,");
  });

  it("strips diacritics + non-alphanumerics for the filename stem", () => {
    expect(safeFilenameStem("Daniel")).toBe("Daniel");
    expect(safeFilenameStem("Müller")).toBe("Muller");
    expect(safeFilenameStem("José-María")).toBe("JoseMaria");
    expect(safeFilenameStem("    ")).toBe(null);
    expect(safeFilenameStem(null)).toBe(null);
    expect(safeFilenameStem("")).toBe(null);
    // Only emojis collapse to nothing → null fallback
    expect(safeFilenameStem("🔥")).toBe(null);
  });

  it("buildMainReportFilename adds the name when present, omits it otherwise", () => {
    expect(buildMainReportFilename("Daniel")).toBe("Daniel-Performance-Report.pdf");
    expect(buildMainReportFilename(null)).toBe("Performance-Report.pdf");
    expect(buildMainReportFilename("    ")).toBe("Performance-Report.pdf");
  });

  it("forces dark backgrounds via bgcolor + color-scheme meta", async () => {
    await sendReportEmail(baseInput());
    const call = fake.calls[0];
    const html = call?.html ?? "";
    // Both meta tags so light-mode-only clients still render dark.
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain('name="supported-color-schemes" content="dark"');
    // Outer table must carry both bgcolor attribute AND inline background.
    expect(html).toMatch(/bgcolor="#0D0D0F"/i);
    expect(html).toMatch(/background-color:#0D0D0F/i);
  });

  it("throws when Resend reports an error", async () => {
    fake.setReturn({ data: null, error: { message: "rate limited", name: "rate_limit_exceeded" } as { message: string; name: string }, headers: null } as SendResult);
    await expect(sendReportEmail(baseInput())).rejects.toThrow(/rate limited/);
  });
});
