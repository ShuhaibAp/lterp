import PoHeader from "@/components/PoHeader";
import AcknowledgeForm from "@/components/closeout/AcknowledgeForm";
import styles from "@/components/closeout/closeout.module.css";
import shared from "@/components/workflow.module.css";
import { requireRole } from "@/lib/dal";
import { getWeighment } from "@/lib/closeout";
import { formatDate } from "@/lib/po-constants";
import { getPurchaseOrder } from "@/lib/purchase-orders";

export const metadata = { title: "Weighment" };

const kg = (n) => (n === null ? "—" : `${n} kg`);

export default async function WeighmentPage({ params, searchParams }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const { id } = await params;
  const flags = await searchParams;
  const [po, data] = await Promise.all([getPurchaseOrder(id), getWeighment(id)]);
  const c = data.check;

  return (
    <>
      <PoHeader po={po} tab="weighment" role={user.role} />
      {flags.acknowledged && <div className={shared.notice}>Acknowledged. The PO has moved on to the AOR stage.</div>}

      {!c ? (
        <div className={shared.card}>
          <div className={`${styles.result} ${styles.pending}`}>Waiting for the Factory step</div>
          <p className={shared.text}>
            The weighment cross-check runs automatically as soon as Factory marks its work complete. It compares the
            loaded weight Operations recorded at pickup with the one Factory read off its own weighment slip.
          </p>
        </div>
      ) : (
        <>
          <div className={shared.card}>
            <div className={`${styles.result} ${c.result === "Pass" ? styles.pass : styles.fail}`} role="status">
              {c.result === "Pass"
                ? `Within tolerance — the weights differ by ${kg(c.differenceKg)} (allowed ±${c.toleranceKg} kg).`
                : c.differenceKg === null
                  ? "A weight is missing, so the check could not pass."
                  : `Outside tolerance — the weights differ by ${kg(c.differenceKg)} (allowed ±${c.toleranceKg} kg).`}
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>Loaded weight at pickup (Operations)</dt>
                <dd>{kg(c.operationsLoadedKg)}</dd>
              </div>
              <div>
                <dt>Loaded weight on arrival (Factory)</dt>
                <dd>{kg(c.factoryLoadedKg)}</dd>
              </div>
              <div>
                <dt>Net weight, Operations</dt>
                <dd>{kg(c.operationsNetKg)}</dd>
              </div>
              <div>
                <dt>Net weight, Factory</dt>
                <dd>{kg(c.factoryNetKg)}</dd>
              </div>
              <div>
                <dt>Checked</dt>
                <dd>{formatDate(c.checkedAt)}</dd>
              </div>
            </dl>
            {c.acknowledgedAt && (
              <div className={styles.remark}>
                <strong>
                  Acknowledged by {c.acknowledgedBy} on {formatDate(c.acknowledgedAt)}:
                </strong>{" "}
                {c.remarks}
              </div>
            )}
          </div>
          {data.canAcknowledge && <AcknowledgeForm poId={id} />}
          {c.result === "Fail" && !c.resolved && !data.canAcknowledge && (
            <div className={shared.info}>
              This check failed. Admin or the BD team must explain the difference before the PO can move on.
            </div>
          )}
        </>
      )}
    </>
  );
}
