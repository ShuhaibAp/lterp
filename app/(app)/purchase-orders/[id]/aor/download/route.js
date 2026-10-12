import { proxyBackendFile } from "@/lib/proxy-file";

export async function GET(_request, { params }) {
  const { id } = await params;
  return proxyBackendFile(`/purchase-orders/${encodeURIComponent(id)}/aor/download`, [
    "BD Team",
    "Admin",
    "Operations Team",
    "Factory Team",
  ]);
}
