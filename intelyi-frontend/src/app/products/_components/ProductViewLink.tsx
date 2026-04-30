"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { logInteraction } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

type ProductViewLinkProps = {
  href: string;
  productId: string;
  onBeforeNavigate?: (productId: string) => Promise<void> | void;
};

export default function ProductViewLink({ href, productId, onBeforeNavigate }: ProductViewLinkProps) {
  const router = useRouter();

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    await Promise.all([
      logInteraction({
        product_id: productId,
        session_id: getOrCreateSessionId(),
        event_type: "click",
      }),
      onBeforeNavigate?.(productId),
    ]);

    router.push(href);
  }

  return (
    <Link
      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-[var(--surface-muted)]"
      href={href}
      onClick={handleClick}
    >
      View
    </Link>
  );
}
