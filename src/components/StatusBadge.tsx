import { getInvoiceStatusClass, type InvoiceStatus } from "../lib/invoiceStatus.js";

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getInvoiceStatusClass(status)}`}>
      {status}
    </span>
  );
}
