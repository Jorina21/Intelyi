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
    <Link className="underline" href={href} onClick={handleClick}>
      View
    </Link>
  );
}
