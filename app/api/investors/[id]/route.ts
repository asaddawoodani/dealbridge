import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: investorId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    // Current viewer
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch investor profile + public profile
    const { data: investorProfile } = await admin
      .from("investor_profiles")
      .select("*")
      .eq("user_id", investorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!investorProfile) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, role, verification_status, created_at")
      .eq("id", investorId)
      .single();

    if (!profile || profile.role !== "investor") {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Determine disclosure level
    let level: "self" | "full" | "limited" = "limited";

    if (user) {
      if (user.id === investorId) {
        level = "self";
      } else {
        // Check if admin
        const { data: viewerProfile } = await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (viewerProfile?.role === "admin") {
          level = "full";
        } else if (viewerProfile?.role === "operator") {
          // Check if operator has an accepted intro with this investor
          const { data: operatorDeals } = await admin
            .from("deals")
            .select("id")
            .eq("operator_id", user.id);

          const dealIds = (operatorDeals ?? []).map((d) => d.id);

          if (dealIds.length > 0) {
            const { data: acceptedInterest } = await admin
              .from("deal_interests")
              .select("id")
              .eq("user_id", investorId)
              .eq("status", "accepted")
              .in("deal_id", dealIds)
              .limit(1)
              .maybeSingle();

            if (acceptedInterest) {
              level = "full";
            }
          }
        }
      }
    }

    // Build response based on disclosure level
    const anonymousName = `Investor #${investorId.slice(-4).toUpperCase()}`;

    if (level === "limited") {
      return NextResponse.json({
        level: "limited",
        investor: {
          id: investorId,
          name: anonymousName,
          verified: profile.verification_status === "verified",
          member_since: profile.created_at,
          check_size: investorProfile.check_size,
          timeline: investorProfile.timeline,
          involvement: investorProfile.involvement,
          categories: investorProfile.categories ?? [],
          subcategories: investorProfile.subcategories ?? [],
          tags: investorProfile.tags ?? [],
        },
      });
    }

    // Full or self: query commitment stats
    const { data: commitments } = await admin
      .from("investment_commitments")
      .select("amount, status")
      .eq("investor_id", investorId)
      .in("status", ["committed", "funded", "completed"]);

    const dealCount = commitments?.length ?? 0;
    const totalInvested = (commitments ?? []).reduce(
      (sum, c) => sum + (Number(c.amount) || 0),
      0
    );

    const fullData = {
      id: investorId,
      name: profile.full_name ?? anonymousName,
      headline: investorProfile.headline,
      bio: investorProfile.bio,
      verified: profile.verification_status === "verified",
      member_since: profile.created_at,
      check_size: investorProfile.check_size,
      timeline: investorProfile.timeline,
      involvement: investorProfile.involvement,
      categories: investorProfile.categories ?? [],
      subcategories: investorProfile.subcategories ?? [],
      tags: investorProfile.tags ?? [],
      verified_only: investorProfile.verified_only,
      deals_committed: dealCount,
      total_invested: totalInvested,
    };

    return NextResponse.json({
      level,
      investor: fullData,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
