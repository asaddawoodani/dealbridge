// ---------------------------------------------------------------------------
// Resend email helper — uses raw fetch (no SDK) to keep deps minimal
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
export const ADMIN_EMAIL = "asadd1993@gmail.com";
export const FROM_EMAIL = "Dealbridge <onboarding@resend.dev>";

// ---- send helper ----------------------------------------------------------

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] Resend error ${res.status}: ${body}`);
  }
}

// ---- HTML template --------------------------------------------------------

export function emailTemplate({
  title,
  body,
  ctaText,
  ctaUrl,
}: {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const ctaBlock =
    ctaText && ctaUrl
      ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#fff;color:#000;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${ctaText}</a>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0a0a0a;border:1px solid #27272a;border-radius:12px;padding:40px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:22px;color:#fff;">${title}</h1>
          <div style="color:#a1a1aa;font-size:15px;line-height:1.6;">${body}</div>
          ${ctaBlock}
        </td></tr>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#52525b;">Dealbridge &mdash; Private deal flow for investors</p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- Matching helpers (mirrored from app/deals/page.tsx) -------------------

export const CATEGORY_SNAKE_TO_KEBAB: Record<string, string> = {
  small_business: "small-business",
  real_estate: "real-estate",
  energy_infra: "energy-infra",
  funds: "funds",
  tech_startups: "tech-startups",
  services: "services",
};

export function parseCheckToNumber(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "").toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m)?/);
  if (!match) return null;
  let num = parseFloat(match[1]);
  if (match[2] === "k") num *= 1_000;
  if (match[2] === "m") num *= 1_000_000;
  return num;
}

function investorCheckSizeToRange(
  checkSize: string | null
): { min: number; max: number } | null {
  if (!checkSize) return null;
  switch (checkSize) {
    case "<25k":
      return { min: 0, max: 25_000 };
    case "25-50k":
      return { min: 25_000, max: 50_000 };
    case "50-100k":
      return { min: 50_000, max: 100_000 };
    case "100-250k":
      return { min: 100_000, max: 250_000 };
    case "250-500k":
      return { min: 250_000, max: 500_000 };
    case "500k+":
      return { min: 500_000, max: Infinity };
    default:
      return null;
  }
}

function checkSizeAligns(
  dealMinCheck: string | null,
  investorCheckSize: string | null
): boolean {
  const dealNum = parseCheckToNumber(dealMinCheck);
  const range = investorCheckSizeToRange(investorCheckSize);
  if (dealNum === null || range === null) return false;
  return dealNum <= range.max && dealNum >= range.min * 0.5;
}

export interface InvestorRow {
  categories: string[];
  tags: string[];
  check_size: string | null;
  profiles: { email: string; full_name: string | null } | null;
}

export interface DealRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  min_check: string | null;
  location: string | null;
}

// ---- Investor deal alert (reusable) ----------------------------------------

export function sendDealAlertsToInvestors(
  deal: DealRow,
  appUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any
) {
  Promise.resolve(
    adminClient
      .from("investor_profiles")
      .select("categories, tags, check_size, profiles(email, full_name)")
  )
    .then(({ data: investors }: { data: InvestorRow[] | null }) => {
      if (!investors) return;
      for (const inv of investors as unknown as InvestorRow[]) {
        if (!inv.profiles?.email) continue;
        const score = scoreDealForInvestor(deal, inv);
        if (score < 2) continue;

        sendEmail({
          to: inv.profiles.email,
          subject: `New deal matches your interests: ${deal.title}`,
          html: emailTemplate({
            title: "New Deal Match",
            body: [
              `<strong>${deal.title}</strong>`,
              deal.category ? `Category: ${deal.category}` : "",
              deal.location ? `Location: ${deal.location}` : "",
              deal.min_check ? `Min check: ${deal.min_check}` : "",
            ]
              .filter(Boolean)
              .join("<br/>"),
            ctaText: "View Deal",
            ctaUrl: `${appUrl}/deals/${deal.id}`,
          }),
        }).catch((err: unknown) =>
          console.error("[email] deal alert failed:", err)
        );
      }
    })
    .catch((err: unknown) =>
      console.error("[email] investor query failed:", err)
    );
}

export function scoreDealForInvestor(
  deal: DealRow,
  investor: InvestorRow
): number {
  let score = 0;

  // +2 for category match
  const dealCat = deal.category ?? "";
  const investorCats = investor.categories.map(
    (c) => CATEGORY_SNAKE_TO_KEBAB[c] ?? c.replace(/_/g, "-")
  );
  if (dealCat && investorCats.includes(dealCat)) {
    score += 2;
  }

  // +1 for check size alignment
  if (checkSizeAligns(deal.min_check, investor.check_size)) {
    score += 1;
  }

  // +1 for tag keyword match in title or description
  if (investor.tags.length > 0) {
    const haystack = [deal.title, deal.description ?? ""]
      .join(" ")
      .toLowerCase();
    const matchedTag = investor.tags.find((tag) =>
      haystack.includes(tag.toLowerCase())
    );
    if (matchedTag) {
      score += 1;
    }
  }

  return score;
}
