import styles from "./quotation.module.css";

export default function QuotationStatus({ status }) {
  return <span className={`${styles.pill} ${styles[status]}`}>{status}</span>;
}
