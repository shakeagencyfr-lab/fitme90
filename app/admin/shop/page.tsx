import { isShopEnabled, getShopProducts } from "@/lib/shop";
import { ShopAdmin } from "@/components/shop-admin";

export const metadata = { title: "Boutique, Admin" };

export default async function AdminShopPage() {
  const [enabled, products] = await Promise.all([isShopEnabled(), getShopProducts()]);
  return <ShopAdmin enabled={enabled} products={products} />;
}
