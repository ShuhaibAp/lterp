import { proxyBackendFile } from "@/lib/proxy-file";

export async function GET(_request, { params }) {
  const { id, photoId } = await params;
  return proxyBackendFile(
    `/purchase-orders/${encodeURIComponent(id)}/inspection/photos/${encodeURIComponent(photoId)}`,
    ["BD Team", "Admin", "Operations Team"],
  );
}
