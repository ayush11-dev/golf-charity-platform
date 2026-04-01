import { NextResponse } from "next/server";
import { isAdminIdentity } from "@/lib/admin-auth";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type DonatePayload = {
  charityId?: number;
  amount?: number;
};

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SITE_URL" },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as DonatePayload;
  const charityId = payload.charityId;
  const amount = payload.amount;

  if (typeof charityId !== "number" || !Number.isFinite(charityId)) {
    return NextResponse.json({ error: "Invalid charityId" }, { status: 400 });
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 100 ||
    amount > 1000000
  ) {
    return NextResponse.json(
      { error: "Amount must be between INR 100 and INR 10,00,000" },
      { status: 400 },
    );
  }

  const { data: charity, error: charityError } = await supabaseAdmin
    .from("charities")
    .select("id, name")
    .eq("id", charityId)
    .maybeSingle();

  if (charityError || !charity) {
    return NextResponse.json({ error: "Charity not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub ?? null;
  const email = typeof claims?.email === "string" ? claims.email : undefined;

  if (userId) {
    const adminCheck = await isAdminIdentity(userId, email ?? null);
    if (adminCheck.error) {
      return NextResponse.json(
        { error: "Failed to verify admin access" },
        { status: 500 },
      );
    }

    if (adminCheck.isAdmin) {
      return NextResponse.json(
        { error: "Admin accounts can only access admin features" },
        { status: 403 },
      );
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "inr",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `Donation to ${charity.name}`,
          },
        },
      },
    ],
    success_url: `${siteUrl}/charities/${charity.id}?donation=success`,
    cancel_url: `${siteUrl}/charities/${charity.id}?donation=cancelled`,
    customer_email: email,
    metadata: {
      charity_id: String(charity.id),
      user_id: userId ?? "",
    },
  });

  return NextResponse.json({ url: session.url });
}
