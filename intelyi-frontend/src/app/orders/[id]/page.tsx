import OrderDetailClient from "./OrderDetailClient";
import { getCurrentProxyUser } from "@/lib/server/backendProxy";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentProxyUser();

  return <OrderDetailClient orderId={id} isSignedIn={Boolean(user)} />;
}
