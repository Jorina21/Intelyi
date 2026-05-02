"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type SignUpFormProps = {
  callbackUrl: string;
};

export default function SignUpForm({ callbackUrl }: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setIsPending(false);
      setError(payload?.error ?? "Unable to create account.");
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setIsPending(false);

    if (!signInResult?.ok) {
      setError("Account created, but automatic sign-in failed. Try signing in manually.");
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    router.push(signInResult.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-[28px] border border-[var(--border)] bg-white p-6">
        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          Name
          <input
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0 transition focus:border-zinc-950"
          />
        </label>

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
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0 transition focus:border-zinc-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-900">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-2xl border border-[var(--border)] px-4 py-3 outline-none ring-0 transition focus:border-zinc-950"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--copy-muted)]">
        <span>Already have an account?</span>
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-zinc-950 underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
