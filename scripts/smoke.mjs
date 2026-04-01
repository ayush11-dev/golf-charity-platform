const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";

const tests = [
  {
    name: "Public home page loads",
    request: { method: "GET", path: "/", redirect: "manual" },
    expectedStatuses: [200],
  },
  {
    name: "Protected dashboard redirects when unauthenticated",
    request: { method: "GET", path: "/dashboard", redirect: "manual" },
    expectedStatuses: [302, 303, 307, 308],
    assert: (response) => {
      const location = response.headers.get("location") ?? "";
      return location.includes("/login");
    },
  },
  {
    name: "Admin users API blocks unauthenticated access",
    request: { method: "GET", path: "/api/admin/users", redirect: "manual" },
    expectedStatuses: [401],
  },
  {
    name: "Admin subscription API blocks unauthenticated access",
    request: {
      method: "PATCH",
      path: "/api/admin/users/00000000-0000-0000-0000-000000000000/subscription",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: "monthly",
        status: "inactive",
        current_period_end: null,
      }),
    },
    expectedStatuses: [401],
  },
  {
    name: "Admin scores API blocks unauthenticated access",
    request: { method: "GET", path: "/api/admin/scores", redirect: "manual" },
    expectedStatuses: [401],
  },
  {
    name: "Admin score edit API blocks unauthenticated access",
    request: {
      method: "PATCH",
      path: "/api/admin/scores/1",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 20, played_at: "2026-03-01" }),
    },
    expectedStatuses: [401],
  },
  {
    name: "Subscription checkout API blocks unauthenticated access",
    request: {
      method: "POST",
      path: "/api/stripe/checkout",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: "price_1TBrDA3xAN263qsKYstmaCoX",
        plan: "monthly",
      }),
    },
    expectedStatuses: [401],
  },
  {
    name: "Donation checkout validates amount",
    request: {
      method: "POST",
      path: "/api/stripe/donate",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charityId: 1, amount: 50 }),
    },
    expectedStatuses: [400],
  },
  {
    name: "Stripe webhook requires signature",
    request: {
      method: "POST",
      path: "/api/stripe/webhook",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    expectedStatuses: [400],
  },
];

async function runTest(test) {
  const url = `${baseUrl}${test.request.path}`;
  let response;

  try {
    response = await fetch(url, {
      method: test.request.method,
      headers: test.request.headers,
      body: test.request.body,
      redirect: test.request.redirect,
    });
  } catch (error) {
    return {
      pass: false,
      name: test.name,
      detail: `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  const statusOk = test.expectedStatuses.includes(response.status);
  const assertOk = test.assert ? test.assert(response) : true;

  const pass = statusOk && assertOk;
  const location = response.headers.get("location");

  let detail = `status=${response.status}`;
  if (location) {
    detail += ` location=${location}`;
  }

  if (!statusOk) {
    detail += ` expected=${test.expectedStatuses.join("/")}`;
  }

  if (statusOk && !assertOk) {
    detail += " custom-assertion-failed";
  }

  return { pass, name: test.name, detail };
}

async function main() {
  console.log(`Running smoke tests against ${baseUrl}`);

  const results = [];
  for (const test of tests) {
    // Keep requests sequential to simplify reading server-side logs.
    const result = await runTest(test);
    results.push(result);
    const prefix = result.pass ? "PASS" : "FAIL";
    console.log(`[${prefix}] ${result.name} (${result.detail})`);
  }

  const failed = results.filter((result) => !result.pass);
  console.log(
    `\nSummary: ${results.length - failed.length}/${results.length} passed`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
