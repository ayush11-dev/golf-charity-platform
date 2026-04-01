import { type NextRequest, NextResponse } from "next/server";
import { requireNonAdmin } from "@/lib/admin-auth";
import { PLANS, stripe } from "@/lib/stripe";

const validPriceIds = new Set<string>([
  PLANS.monthly.priceId,
  PLANS.yearly.priceId,
]);

const planByPriceId: Record<string, "monthly" | "yearly"> = {
  [PLANS.monthly.priceId]: "monthly",
  [PLANS.yearly.priceId]: "yearly",
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireNonAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const userId = auth.data.userId;
    const userEmail = auth.data.email;

    const { priceId } = await request.json();

    if (typeof priceId !== "string" || !validPriceIds.has(priceId)) {
      return NextResponse.json(
        { error: "Invalid priceId provided" },
        { status: 400 },
      );
    }

    const plan = planByPriceId[priceId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
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
      metadata: { user_id: userId, plan },
      subscription_data: {
        metadata: { user_id: userId, plan },
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
