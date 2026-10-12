import { proxyBackendFile } from "@/lib/proxy-file";

export async function GET(_request, { params }) {
  const { id, kind } = await params;
  return proxyBackendFile(`/purchase-orders/${encodeURIComponent(id)}/factory/slips/${encodeURIComponent(kind)}`, [
    "BD Team",
    "Admin",
    "Operations Team",
    "Factory Team",
  ]);
}
