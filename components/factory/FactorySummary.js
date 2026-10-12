import { formatQuantity } from "@/lib/inspection-constants";
import shared from "../workflow.module.css";
import ops from "../operations/operations.module.css";
import { FactoryPhotoGallery } from "./FactoryPhotos";
import SlipUpload from "./SlipUpload";
import TeardownLog from "./TeardownLog";

const kg = (n) => (n === null ? "—" : `${n} kg`);

/**
 * Read-only view of the Factory record (BD, Operations and Admin; Factory once it is complete).
 * The Teardown Log is the one part Admin can still edit, so it is rendered separately.
 */
export default function FactorySummary({ poId, factory, canWriteTeardownLog }) {
  const opsWeights = factory.operationsWeights;
  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Weighment</h2>
        </div>
        <ul className={ops.summaryList}>
          <li className={ops.summaryRow}>
            <span>Empty Weight</span>
            <span>{kg(factory.weighmentEmptyKg)}</span>
          </li>
          <li className={ops.summaryRow}>
            <span>Loaded Weight</span>
            <span>{kg(factory.weighmentLoadedKg)}</span>
          </li>
          <li className={ops.summaryRow}>
            <span>Net Weight at Factory (Loaded − Empty)</span>
            <span>{kg(factory.netWeightKg)}</span>
          </li>
          <li className={ops.summaryRow}>
            <span>Recycled output</span>
            <span>{kg(factory.outputWeightKg)}</span>
          </li>
          <li className={ops.summaryRow}>
            <span>Residue</span>
            <span>{kg(factory.residueWeightKg)}</span>
          </li>
          {opsWeights && (
            <li className={ops.summaryRow}>
              <span>Net Weight recorded by Operations at pickup</span>
              <span>{kg(opsWeights.netWeightKg)}</span>
            </li>
          )}
        </ul>
        <div className={ops.fieldGrid}>
          <SlipUpload poId={poId} kind="empty" label="Weighment Slip – Empty" file={factory.weighmentSlipEmpty} editable={false} />
          <SlipUpload poId={poId} kind="load" label="Weighment Slip – Load" file={factory.weighmentSlipLoad} editable={false} />
        </div>
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Materials</h2>
        </div>
        <div className={shared.scroll}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>UoM</th>
                <th className={shared.right}>Inspected Qty</th>
                <th className={shared.right}>Actual Qty</th>
                <th className={shared.right}>Processed Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {factory.lines.map((l) => {
                const reference = l.actualQuantity ?? l.inspectedQuantity;
                const differs = l.processedQuantity !== null && l.processedQuantity !== reference;
                return (
                  <tr key={l.id} className={differs ? ops.discrepancy : undefined}>
                    <td className={shared.plain}>{l.materialName}</td>
                    <td className={shared.plain}>{l.uom}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(l.inspectedQuantity)}</td>
                    <td className={`${shared.plain} ${shared.right}`}>
                      {l.actualQuantity === null ? "—" : formatQuantity(l.actualQuantity)}
                    </td>
                    <td className={`${shared.plain} ${shared.right}`}>
                      {l.processedQuantity === null ? "—" : formatQuantity(l.processedQuantity)}
                    </td>
                    <td className={shared.plain}>{l.remarks || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {factory.lines.length === 0 && <div className={shared.emptyRows}>No materials were recorded for this PO.</div>}
        </div>
      </div>

      {factory.photos.length > 0 && (
        <div className={shared.card}>
          <div className={shared.cardHead}>
            <h2 className={shared.cardTitle}>Factory Photos</h2>
          </div>
          <FactoryPhotoGallery poId={poId} photos={factory.photos} />
        </div>
      )}

      {factory.teardownLog && <TeardownLog poId={poId} entries={factory.teardownLog} canWrite={canWriteTeardownLog} />}
    </>
  );
}
