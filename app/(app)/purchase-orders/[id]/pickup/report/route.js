import { proxyBackendFile } from "@/lib/proxy-file";

// The backend refuses to produce the report until it has been generated, so this is a plain pass-through.
export async function GET(_request, { params }) {
  const { id } = await params;
  return proxyBackendFile(`/purchase-orders/${encodeURIComponent(id)}/pickup/report`, [
    "BD Team",
    "Admin",
    "Operations Team",
  ]);
}
