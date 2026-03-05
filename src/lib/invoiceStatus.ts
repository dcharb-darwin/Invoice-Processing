export const INVOICE_STATUSES = ["Received", "Logged", "Reviewed", "Signed", "Paid"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number] | string;

export const INVOICE_STATUS_CLASS: Record<string, string> = {
  Received: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  Logged: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Reviewed: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Signed: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function getInvoiceStatusClass(status: InvoiceStatus): string {
  return INVOICE_STATUS_CLASS[status] || INVOICE_STATUS_CLASS.Received;
}
