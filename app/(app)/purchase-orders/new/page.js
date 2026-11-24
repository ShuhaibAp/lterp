import PoForm from "@/components/PoForm";
import { requireRole } from "@/lib/dal";
import { getOrderRequest, listReturningCustomers } from "@/lib/order-requests";
import { getServiceTypes } from "@/lib/purchase-orders";
import styles from "../po.module.css";

export const metadata = { title: "New PO" };

export default async function NewPurchaseOrderPage({ searchParams }) {
  await requireRole("BD Team");
  const { request: requestId } = await searchParams;
  const [serviceTypes, returningCustomers, request] = await Promise.all([
    getServiceTypes(),
    listReturningCustomers(),
    // "Create PO" on an order request: start from that customer's details.
    typeof requestId === "string" ? getOrderRequest(requestId).catch(() => null) : null,
  ]);
  const fromRequest = request?.status === "New" ? request : null;
  const initialReturningId = fromRequest
    ? (returningCustomers.find((c) => c.email === fromRequest.customerEmail)?.id ?? "")
    : "";

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>New PO — Customer Registration</h1>
          <p className={styles.sub}>
            Register a new customer purchase order. Fields marked <span className={styles.required}>*</span> are
            required.
          </p>
        </div>
      </div>
      <PoForm
        mode="create"
        serviceTypes={serviceTypes}
        returningCustomers={returningCustomers}
        initialReturningId={initialReturningId}
        requestId={fromRequest?.id ?? ""}
      />
    </>
  );
}
