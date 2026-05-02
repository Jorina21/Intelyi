"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type SignInFormProps = {
  callbackUrl: string;
  showGitHub: boolean;
};

export default function SignInForm({ callbackUrl, showGitHub }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setIsPending(false);

    if (!result?.ok) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-[28px] border border-[var(--border)] bg-white p-6">
        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0 transition focus:border-zinc-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0 transition focus:border-zinc-950"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--copy-muted)]">
        <span>No account yet?</span>
        <Link href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-zinc-950 underline">
          Create one
        </Link>
      </div>

      {showGitHub ? (
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl })}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[var(--surface-muted)]"
        >
          Continue with GitHub instead
        </button>
      ) : null}
    </div>
  );
}
