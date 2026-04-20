import SuccessPageClient from "./SuccessPageClient";
import { getCurrentProxyUser } from "@/lib/server/backendProxy";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentProxyUser();

  return <SuccessPageClient orderId={params.order_id ?? null} isSignedIn={Boolean(user)} />;
}
