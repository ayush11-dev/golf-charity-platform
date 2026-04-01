import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  sendSubscriptionStatusEmail,
  sendSubscriptionWelcomeEmail,
} from "@/lib/notifications";
import { PLANS, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

function getPeriodEndIso(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

function resolvePlanFromPriceId(priceId: string | undefined | null) {
  if (priceId === PLANS.monthly.priceId) {
    return "monthly" as const;
  }
  if (priceId === PLANS.yearly.priceId) {
    return "yearly" as const;
  }
  return null;
}

function normalizePlan(value: string | undefined): "monthly" | "yearly" | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }
  return null;
}

function statusToProfileStatus(status: string) {
  return status === "active" || status === "trialing" ? "active" : "inactive";
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
}

function getSessionCustomerEmail(session: Stripe.Checkout.Session) {
  return (
    session.customer_details?.email ??
    (typeof session.customer_email === "string" ? session.customer_email : null)
  );
}

async function getStripeCustomerEmail(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) {
    return null;
  }

  if (typeof customer !== "string") {
    if ("deleted" in customer && customer.deleted) {
      return null;
    }
    return customer.email ?? null;
  }

  const customerData = await stripe.customers.retrieve(customer);
  if ("deleted" in customerData && customerData.deleted) {
    return null;
  }

  return customerData.email ?? null;
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Missing Supabase admin configuration" },
      { status: 500 },
    );
  }

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

        if (session.mode === "payment") {
          const charityId = Number(session.metadata?.charity_id ?? NaN);
          const userId = session.metadata?.user_id || null;
          const amount = Number((session.amount_total ?? 0) / 100);

          if (Number.isFinite(charityId) && amount > 0) {
            const { error: donationError } = await supabaseAdmin
              .from("donations")
              .insert({
                user_id: userId,
                charity_id: charityId,
                amount,
                stripe_payment_id: getPaymentIntentId(session),
              });

            if (donationError) {
              console.error("Donation insert error:", donationError);
            }
          }

          break;
        }

        console.log("Session metadata:", JSON.stringify(session.metadata));
        console.log("Session customer:", session.customer);
        console.log("Session subscription:", session.subscription);
        const userId = session.metadata?.user_id;
        const metadataPlan = normalizePlan(session.metadata?.plan);
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
        const subscriptionPriceId = subscription.items.data[0]?.price?.id;
        const plan =
          resolvePlanFromPriceId(subscriptionPriceId) ?? metadataPlan;

        if (!plan) {
          console.error(
            "Unable to resolve plan for subscription:",
            subscriptionId,
          );
          break;
        }

        const { data: existingSubscription } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const subscriptionPayload = {
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id:
            typeof session.customer === "string"
              ? session.customer
              : (session.customer?.id ?? null),
          plan,
          status: subscription.status,
          current_period_end: periodEndIso,
        };

        let subError: { message: string } | null = null;

        if (existingSubscription?.id) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update(subscriptionPayload)
            .eq("id", existingSubscription.id);
          subError = error;
        } else {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .insert(subscriptionPayload);
          subError = error;
        }

        console.log("Subscription upsert error:", subError);

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: statusToProfileStatus(subscription.status),
          })
          .eq("id", userId);
        console.log("Profile update error:", profileError);

        await sendSubscriptionWelcomeEmail(
          getSessionCustomerEmail(session),
          String(plan ?? "Subscription"),
        );

        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const periodEndIso = getPeriodEndIso(subscription);
        const subscriptionPriceId = subscription.items.data[0]?.price?.id;
        const metadataPlan = normalizePlan(subscription.metadata?.plan);
        const plan =
          resolvePlanFromPriceId(subscriptionPriceId) ?? metadataPlan;

        const { data: existingByStripeId } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (existingByStripeId?.id) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              ...(plan ? { plan } : {}),
              status: subscription.status,
              current_period_end: periodEndIso,
            })
            .eq("id", existingByStripeId.id);
        } else if (userId && plan) {
          await supabaseAdmin.from("subscriptions").insert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id:
              typeof subscription.customer === "string"
                ? subscription.customer
                : (subscription.customer?.id ?? null),
            plan,
            status: subscription.status,
            current_period_end: periodEndIso,
          });
        }

        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: statusToProfileStatus(subscription.status),
            })
            .eq("id", userId);
        }

        const customerEmail = await getStripeCustomerEmail(
          subscription.customer,
        );
        await sendSubscriptionStatusEmail(customerEmail, subscription.status);

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

        const customerEmail = await getStripeCustomerEmail(
          subscription.customer,
        );
        await sendSubscriptionStatusEmail(customerEmail, "cancelled");

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
