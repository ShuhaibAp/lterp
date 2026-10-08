import { verifySession } from "@/lib/dal";
import Shell from "@/components/Shell";
import { countNewOrderRequests } from "@/lib/order-requests";

export default async function AppLayout({ children }) {
  const user = await verifySession();
  const orderRequests = user.role === "BD Team" || user.role === "Admin" ? await countNewOrderRequests() : 0;
  return (
    <Shell user={user} badges={{ orderRequests }}>
      {children}
    </Shell>
  );
}
