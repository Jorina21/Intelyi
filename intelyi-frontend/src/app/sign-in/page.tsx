import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { normalizeAuthCallbackUrl } from "@/lib/auth/urls";
import SignInForm from "@/app/sign-in/SignInForm";

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const callbackUrl = normalizeAuthCallbackUrl(getSearchParamValue(resolvedSearchParams.callbackUrl));
  const showGitHub = authOptions.providers.some((provider) => provider.id === "github");

  if (session?.user?.email) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="store-panel rounded-[36px] px-6 py-10 sm:px-8">
        <h1 className="store-display text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
          Sign In
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[var(--surface-muted)]"
          >
            Keep shopping
          </Link>
        </div>
        <SignInForm callbackUrl={callbackUrl} showGitHub={showGitHub} />
      </section>
    </main>
  );
}
