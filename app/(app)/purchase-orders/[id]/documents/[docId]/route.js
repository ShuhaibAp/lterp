import { proxyBackendFile } from "@/lib/proxy-file";

export async function GET(_request, { params }) {
  const { id, docId } = await params;
  return proxyBackendFile(
    `/purchase-orders/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
    ["BD Team", "Admin", "Operations Team"],
  );
}
