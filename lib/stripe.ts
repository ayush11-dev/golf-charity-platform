import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PLANS = {
  monthly: {
    priceId: "price_1TBrDA3xAN263qsKYstmaCoX",
    name: "Monthly",
    amount: 949,
    currency: "inr",
    interval: "month",
  },
  yearly: {
    priceId: "price_1TGpm33xAN263qsKkbno1I3n",
    name: "Yearly",
    amount: 9999,
    currency: "inr",
    interval: "year",
  },
} as const;
