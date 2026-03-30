"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Golf Charity Platform
      </h1>
      <p className="mt-2 text-sm text-zinc-600">Create your account</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="full_name"
            className="text-sm font-medium text-zinc-700"
          >
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-emerald-500 transition focus:ring-2"
            placeholder="Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-emerald-500 transition focus:ring-2"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-emerald-500 transition focus:ring-2"
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Check your email to confirm your account
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
