import "server-only";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

async function get(path) {
  const token = await getSessionToken();
  const res = await apiFetch(path, { token });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Customer-app "I have an order ready" requests, newest first. */
export const listOrderRequests = () => get("/order-requests");

export const getOrderRequest = (id) => get(`/order-requests/${encodeURIComponent(id)}`);

/** How many requests still need BD's attention (0 if the count cannot be loaded). */
export async function countNewOrderRequests() {
  try {
    return (await get("/order-requests/count")).new;
  } catch {
    return 0;
  }
}

/** Customers who already have a customer-app login, with their latest details. */
export const listReturningCustomers = () => get("/purchase-orders/returning-customers");
