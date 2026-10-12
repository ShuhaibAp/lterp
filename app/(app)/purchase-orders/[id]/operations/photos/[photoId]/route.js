import { proxyBackendFile } from "@/lib/proxy-file";

export async function GET(_request, { params }) {
  const { id, photoId } = await params;
  return proxyBackendFile(
    `/purchase-orders/${encodeURIComponent(id)}/operations/photos/${encodeURIComponent(photoId)}`,
    ["BD Team", "Admin", "Operations Team", "Factory Team"],
  );
}
