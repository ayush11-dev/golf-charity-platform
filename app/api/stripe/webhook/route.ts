import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getPeriodEndIso(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const body = Buffer.from(await request.arrayBuffer());

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Session metadata:", JSON.stringify(session.metadata));
        console.log("Session customer:", session.customer);
        console.log("Session subscription:", session.subscription);
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !subscriptionId) {
          break;
        }

        const subscriptionResponse =
          await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = subscriptionResponse as Stripe.Subscription;
        const periodEndIso = getPeriodEndIso(subscription);

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id:
                typeof session.customer === "string"
                  ? session.customer
                  : (session.customer?.id ?? null),
              plan,
              status: "active",
              current_period_end: periodEndIso,
            },
            { onConflict: "stripe_subscription_id" },
          );
        console.log("Subscription upsert error:", subError);

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "active" })
          .eq("id", userId);
        console.log("Profile update error:", profileError);

        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const periodEndIso = getPeriodEndIso(subscription);

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: periodEndIso,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: subscription.status })
            .eq("id", userId);
        }

        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);

        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: "inactive" })
            .eq("id", userId);
        }

        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
