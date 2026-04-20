"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { logInteraction } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

type ProductViewLinkProps = {
  href: string;
  productId: string;
};

export default function ProductViewLink({ href, productId }: ProductViewLinkProps) {
  const router = useRouter();

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    await logInteraction({
      product_id: productId,
      session_id: getOrCreateSessionId(),
      event_type: "click",
    });

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
