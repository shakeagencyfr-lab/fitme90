import { isShopEnabled, getShopProducts } from "@/lib/shop";
import { getAdminOrNull } from "@/lib/admin";
import { ShopAdmin } from "@/components/shop-admin";

export const metadata = { title: "Boutique, Admin" };

export default async function AdminShopPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const [enabled, products] = await Promise.all([isShopEnabled(tenantId), getShopProducts()]);
  return <ShopAdmin enabled={enabled} products={products} />;
}
