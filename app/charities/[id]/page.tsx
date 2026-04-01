import Link from "next/link";
import { notFound } from "next/navigation";
import DonationCheckoutForm from "@/app/components/DonationCheckoutForm";
import PublicNavbar from "@/app/components/PublicNavbar";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Charity = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  featured: boolean;
};

type CharityDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ donation?: string }>;
};

export default async function CharityDetailPage({
  params,
  searchParams,
}: CharityDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const charityId = Number(id);

  if (!Number.isFinite(charityId)) {
    notFound();
  }

  const { data, error } = await supabaseAdmin
    .from("charities")
    .select("id, name, description, image_url, featured")
    .eq("id", charityId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const charity = data as Charity;
  const donationSuccess = query.donation === "success";
  const donationCancelled = query.donation === "cancelled";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <PublicNavbar />

      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/charities"
          className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          Back to Charities
        </Link>

        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-[#1a1a1a]">
          <div
            className="h-64 w-full bg-cover bg-center sm:h-80"
            style={{
              backgroundImage: `url(${charity.image_url ?? "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=1200"})`,
            }}
          />
          <div className="space-y-4 p-6 sm:p-8">
            {charity.featured ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Featured Charity
              </p>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {charity.name}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
              {charity.description ??
                "Detailed profile content will be added soon."}
            </p>
          </div>
        </section>

        {donationSuccess ? (
          <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Donation successful. Thank you for supporting this charity.
          </p>
        ) : null}

        {donationCancelled ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Donation checkout was cancelled. You can try again anytime.
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6">
            <h2 className="text-xl font-semibold text-white">
              Upcoming Events
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Charity event publishing is now enabled in the platform design.
              Upcoming golf days, fundraising drives, and community events will
              be listed here as the admin team updates charity content.
            </p>
          </article>

          <DonationCheckoutForm
            charityId={charity.id}
            charityName={charity.name}
          />
        </section>
      </div>
    </main>
  );
}
