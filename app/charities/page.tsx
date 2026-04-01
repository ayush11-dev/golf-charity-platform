import Link from "next/link";
import PublicNavbar from "@/app/components/PublicNavbar";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Charity = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  featured: boolean;
};

type CharitiesPageProps = {
  searchParams: Promise<{ q?: string; featured?: string }>;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function buildCharitiesHref(query: string, featuredOnly: boolean) {
  const params = new URLSearchParams();

  if (query.trim().length > 0) {
    params.set("q", query);
  }

  if (featuredOnly) {
    params.set("featured", "1");
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `/charities?${queryString}` : "/charities";
}

export default async function CharitiesPage({
  searchParams,
}: CharitiesPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const featuredOnly = params.featured === "1";

  let charitiesQuery = supabaseAdmin
    .from("charities")
    .select("id, name, description, image_url, featured")
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (featuredOnly) {
    charitiesQuery = charitiesQuery.eq("featured", true);
  }

  const { data } = await charitiesQuery;

  const allHref = buildCharitiesHref(query, false);
  const featuredHref = buildCharitiesHref(query, true);

  const allCharities = (data as Charity[] | null) ?? [];
  const normalizedQuery = normalize(query);

  const charities = allCharities.filter((charity) => {
    if (featuredOnly && !charity.featured) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const name = normalize(charity.name);
    const description = normalize(charity.description ?? "");
    return (
      name.includes(normalizedQuery) || description.includes(normalizedQuery)
    );
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <PublicNavbar />

      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Charity Directory
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose a cause that matters to you.
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400 sm:text-base">
            Browse partner charities, discover their mission, and support them
            through subscriptions or direct donations.
          </p>
        </header>

        <form className="grid gap-3 rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-4 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name or mission"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            type="hidden"
            name="featured"
            value={featuredOnly ? "1" : "0"}
          />
          <div className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 p-1 text-sm">
            <Link
              href={allHref}
              className={`cursor-pointer rounded-md px-3 py-2 font-medium transition ${
                featuredOnly
                  ? "text-zinc-300 hover:text-zinc-100"
                  : "bg-zinc-100 text-zinc-950"
              }`}
            >
              All
            </Link>
            <Link
              href={featuredHref}
              className={`cursor-pointer rounded-md px-3 py-2 font-medium transition ${
                featuredOnly
                  ? "bg-emerald-500 text-emerald-950"
                  : "text-zinc-300 hover:text-zinc-100"
              }`}
            >
              Featured only
            </Link>
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Search
          </button>
        </form>

        {charities.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-6 text-sm text-zinc-400">
            No charities match your filters.
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {charities.map((charity) => (
              <article
                key={charity.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#1a1a1a]"
              >
                <div
                  className="h-40 w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${charity.image_url ?? "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1000"})`,
                  }}
                />
                <div className="space-y-2 p-4">
                  {charity.featured ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Featured
                    </p>
                  ) : null}
                  <h2 className="text-lg font-semibold text-white">
                    {charity.name}
                  </h2>
                  <p className="line-clamp-3 text-sm text-zinc-400">
                    {charity.description ?? "No description available yet."}
                  </p>
                  <Link
                    href={`/charities/${charity.id}`}
                    className="inline-flex rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                  >
                    View Profile
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
