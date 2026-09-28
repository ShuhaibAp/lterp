import { verifySession } from "@/lib/dal";
import Shell from "@/components/Shell";

export default async function AppLayout({ children }) {
  const user = await verifySession();
  return <Shell user={user}>{children}</Shell>;
}
