"use client";

import { useEffect } from "react";

import { logInteraction } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

type ProductDetailInteractionLoggerProps = {
  productId: string;
};

export default function ProductDetailInteractionLogger({
  productId,
}: ProductDetailInteractionLoggerProps) {
  useEffect(() => {
    void logInteraction({
      product_id: productId,
      session_id: getOrCreateSessionId(),
      event_type: "view",
    });
  }, [productId]);

  return null;
}
