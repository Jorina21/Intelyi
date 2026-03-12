"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { logInteraction } from "@/lib/fastapi";

function getSessionId() {
  const existingSessionId = window.sessionStorage.getItem("intelyi_session_id");
  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = crypto.randomUUID();
  window.sessionStorage.setItem("intelyi_session_id", newSessionId);
  return newSessionId;
}

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
      session_id: getSessionId(),
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
