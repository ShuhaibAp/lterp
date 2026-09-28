import { proxyBackendFile } from "@/lib/proxy-file";

// The backend refuses to produce the PDF until Admin approves, so this is a plain pass-through.
export async function GET(_request, { params }) {
  const { id } = await params;
  return proxyBackendFile(`/purchase-orders/${encodeURIComponent(id)}/quotation/download`);
}
