import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, stripe } from "@/lib/stripe";

const validPriceIds = new Set<string>([
  PLANS.monthly.priceId,
  PLANS.yearly.priceId,
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error: claimsError } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (claimsError || !claims?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = claims.sub;
    const userEmail = claims.email;

    const { priceId, plan } = await request.json();

    if (typeof priceId !== "string" || !validPriceIds.has(priceId)) {
      return NextResponse.json(
        { error: "Invalid priceId provided" },
        { status: 400 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?subscription=success`,
      cancel_url: `${siteUrl}/subscribe`,
      metadata: { user_id: userId, plan: String(plan ?? "") },
      subscription_data: {
        metadata: { user_id: userId, plan: String(plan ?? "") },
      },
      customer_email: typeof userEmail === "string" ? userEmail : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
