import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/");

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>

      <form action="/api/admin/products" method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-semibold">Title</label>
          <input name="title" className="border rounded w-full p-2" required />
        </div>

        <div>
          <label className="block text-sm font-semibold">Description</label>
          <textarea
            name="description"
            className="border rounded w-full p-2"
            required
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold">Category</label>
          <select name="category" className="border rounded w-full p-2" required>
            <option value="CLOTHING">CLOTHING</option>
            <option value="HOUSEHOLD">HOUSEHOLD</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold">Price (USD)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            className="border rounded w-full p-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold">Stock Qty</label>
          <input
            name="stockQty"
            type="number"
            className="border rounded w-full p-2"
            required
            defaultValue={1}
            min={0}
          />
        </div>

        <button className="border rounded w-full p-3 font-semibold">
          Create Product
        </button>
      </form>
    </main>
  );
}
