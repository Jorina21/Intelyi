"use client";

import { useEffect } from "react";

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

type ProductDetailInteractionLoggerProps = {
  productId: string;
};

export default function ProductDetailInteractionLogger({
  productId,
}: ProductDetailInteractionLoggerProps) {
  useEffect(() => {
    void logInteraction({
      product_id: productId,
      session_id: getSessionId(),
      event_type: "view",
    });
  }, [productId]);

  return null;
}
