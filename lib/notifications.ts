import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail =
  process.env.RESEND_FROM_EMAIL ??
  "Golf Charity Platform <onboarding@resend.dev>";

type DrawEmailPayload = {
  to: string;
  month: string;
  numbers: number[];
  winner?: {
    matchType: number;
    prizeAmount: number;
  };
};

function formatMonth(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function sendEmail(
  to: string | null | undefined,
  subject: string,
  html: string,
) {
  if (!resend || !to) {
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Resend email failed:", error);
  }
}

export async function sendSubscriptionWelcomeEmail(
  to: string | null | undefined,
  plan: string,
) {
  await sendEmail(
    to,
    "Welcome to Golf Charity Platform",
    `<p>Your subscription is now active on the <strong>${plan || "selected"}</strong> plan.</p>
     <p>You can now add your last five scores and join the monthly draw.</p>`,
  );
}

export async function sendSubscriptionStatusEmail(
  to: string | null | undefined,
  status: string,
) {
  await sendEmail(
    to,
    "Subscription Status Update",
    `<p>Your subscription status is now: <strong>${status}</strong>.</p>
     <p>If you need help with billing, please contact support.</p>`,
  );
}

export async function sendDrawResultEmail(payload: DrawEmailPayload) {
  const monthLabel = formatMonth(payload.month);
  const numberList = payload.numbers.join(", ");

  const winnerLine = payload.winner
    ? `<p>You matched <strong>${payload.winner.matchType}</strong> numbers and your prize is <strong>${formatCurrency(payload.winner.prizeAmount)}</strong>.</p>`
    : "<p>You did not win this draw, but your participation still supports your chosen charity.</p>";

  await sendEmail(
    payload.to,
    `Draw Results - ${monthLabel}`,
    `<p>The ${monthLabel} draw has been published.</p>
     <p>Winning numbers: <strong>${numberList}</strong></p>
     ${winnerLine}`,
  );
}

export async function sendWinnerAlertEmail(payload: DrawEmailPayload) {
  if (!payload.winner) {
    return;
  }

  const monthLabel = formatMonth(payload.month);
  await sendEmail(
    payload.to,
    `Winner Alert - ${monthLabel}`,
    `<p>Congratulations! You are a winner in the ${monthLabel} draw.</p>
     <p>Match tier: <strong>${payload.winner.matchType}</strong></p>
     <p>Prize amount: <strong>${formatCurrency(payload.winner.prizeAmount)}</strong></p>
     <p>Please submit your proof in the dashboard to complete verification.</p>`,
  );
}
