import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Authentication Error
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          The confirmation link is invalid or has expired. Please try signing in
          again.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
