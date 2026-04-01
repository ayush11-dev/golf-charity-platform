import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/charities", label: "Charities" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/dashboard", label: "Dashboard" },
];

const adminNavItems = [{ href: "/admin", label: "Admin" }];

export default async function PublicNavbar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isAuthenticated = Boolean(claims?.sub);
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin =
    isAuthenticated &&
    Boolean(adminEmail) &&
    typeof claims?.email === "string" &&
    claims.email === adminEmail;

  const visibleNavItems = isAdmin ? adminNavItems : navItems;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#121212]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-200"
        >
          Golf Charity Platform
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-300 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <p className="hidden text-sm text-zinc-400 sm:block">
                {claims?.email ?? "Unknown user"}
              </p>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
