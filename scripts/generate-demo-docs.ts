/**
 * Generates self-contained HTML "source documents" for the demo.
 * These simulate what would be PDFs in SharePoint/GDrive in production.
 * 
 * Output: public/documents/ (served by Vite at /documents/...)
 * [trace: agents.md — pluggable document storage, self-contained MVP]
 */

import { mkdirSync, writeFileSync } from "fs";

const DOCS_DIR = "public/documents";

// Ensure directories exist
mkdirSync(`${DOCS_DIR}/invoices/18013`, { recursive: true });
mkdirSync(`${DOCS_DIR}/invoices/19045`, { recursive: true });
mkdirSync(`${DOCS_DIR}/contracts/18013`, { recursive: true });
mkdirSync(`${DOCS_DIR}/contracts/19045`, { recursive: true });

function makeInvoiceDoc(opts: {
    number: string;
    vendor: string;
    amount: string;
    project: string;
    cfp: string;
    date: string;
    tasks: { code: string; desc: string; amount: string }[];
    signed?: boolean;
    grantCode?: string;
}) {
    const badge = opts.signed
        ? `<div style="position:absolute;top:20px;right:20px;transform:rotate(-15deg);border:3px solid #16a34a;color:#16a34a;padding:8px 16px;font-size:18px;font-weight:bold;border-radius:8px;opacity:0.8;">✓ APPROVED</div>`
        : "";
    const grantRow = opts.grantCode
        ? `<tr><td style="padding:8px;color:#666;">Grant Code</td><td style="padding:8px;font-weight:500;">${opts.grantCode}</td></tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${opts.number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; padding: 40px; color: #1e293b; }
        .page { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #3b82f6; }
        .logo { font-size: 24px; font-weight: 700; color: #1e40af; }
        .logo small { display: block; font-size: 12px; color: #64748b; font-weight: 400; }
        .inv-number { text-align: right; }
        .inv-number h1 { font-size: 28px; color: #1e293b; }
        .inv-number p { color: #64748b; font-size: 14px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .meta-box { background: #f1f5f9; padding: 16px; border-radius: 8px; }
        .meta-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
        tbody td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        tfoot td { padding: 12px 8px; font-weight: 700; font-size: 16px; border-top: 2px solid #1e293b; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 72px; color: rgba(209, 213, 219, 0.3); font-weight: 900; pointer-events: none; z-index: 0; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        @media print { body { padding: 0; background: white; } .page { border: none; box-shadow: none; } .watermark { display: none; } }
    </style>
</head>
<body>
    <div class="watermark">DEMO</div>
    <div class="page">
        ${badge}
        <div class="header">
            <div class="logo">
                City of Lake Stevens
                <small>Public Works Department</small>
            </div>
            <div class="inv-number">
                <h1>${opts.number}</h1>
                <p>${opts.signed ? "Approved Copy" : "Invoice"}</p>
            </div>
        </div>
        <div class="meta">
            <div class="meta-box">
                <h3>Vendor</h3>
                <p style="font-weight:600;">${opts.vendor}</p>
            </div>
            <div class="meta-box">
                <h3>Project</h3>
                <p style="font-weight:600;">${opts.project}</p>
                <p style="font-size:13px;color:#64748b;">CFP #${opts.cfp}</p>
            </div>
        </div>
        <table>
            <thead><tr><th>Date</th><th>Total Amount</th></tr></thead>
            <tbody>
                <tr><td style="padding:8px;">${opts.date}</td><td style="padding:8px;font-weight:600;">${opts.amount}</td></tr>
                ${grantRow}
            </tbody>
        </table>
        <table>
            <thead><tr><th>Task Code</th><th>Description</th><th class="amount">Amount</th></tr></thead>
            <tbody>
                ${opts.tasks.map(t => `<tr><td style="padding:8px;font-family:monospace;color:#3b82f6;">${t.code}</td><td style="padding:8px;">${t.desc}</td><td style="padding:8px;" class="amount">${t.amount}</td></tr>`).join("\n                ")}
            </tbody>
            <tfoot><tr><td colspan="2">Total</td><td class="amount">${opts.amount}</td></tr></tfoot>
        </table>
        <div class="footer">
            This is a demo document for the Invoice Processing Coordinator MVP.<br>
            In production, this would be the original PDF stored in SharePoint.
        </div>
    </div>
</body>
</html>`;
}

function makeContractDoc(opts: {
    number: string;
    vendor: string;
    type: string;
    amount: string;
    project: string;
    cfp: string;
    supplements?: { num: number; amount: string; desc: string }[];
}) {
    const suppRows = (opts.supplements || [])
        .map(s => `<tr><td style="padding:8px;">Supplement #${s.num}</td><td style="padding:8px;">${s.desc}</td><td style="padding:8px;" class="amount">${s.amount}</td></tr>`)
        .join("\n                ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract ${opts.number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; padding: 40px; color: #1e293b; }
        .page { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #1e40af; }
        .logo { font-size: 24px; font-weight: 700; color: #1e40af; }
        .logo small { display: block; font-size: 12px; color: #64748b; font-weight: 400; }
        h1 { font-size: 28px; color: #1e293b; }
        .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 6px; margin-left: 8px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .meta-box { background: #f1f5f9; padding: 16px; border-radius: 8px; }
        .meta-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
        tbody td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .total { font-size: 24px; font-weight: 700; color: #1e40af; text-align: right; margin-top: 16px; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 72px; color: rgba(209, 213, 219, 0.3); font-weight: 900; pointer-events: none; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        .sig { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; color: #64748b; }
        @media print { body { padding: 0; background: white; } .page { border: none; box-shadow: none; } .watermark { display: none; } }
    </style>
</head>
<body>
    <div class="watermark">DEMO</div>
    <div class="page">
        <div style="position:absolute;top:20px;right:20px;transform:rotate(-15deg);border:3px solid #1e40af;color:#1e40af;padding:8px 16px;font-size:18px;font-weight:bold;border-radius:8px;opacity:0.8;">EXECUTED</div>
        <div class="header">
            <div class="logo">
                City of Lake Stevens
                <small>Professional Services Agreement</small>
            </div>
            <div>
                <h1>${opts.number}</h1>
            </div>
        </div>
        <div class="meta">
            <div class="meta-box">
                <h3>Consultant / Contractor</h3>
                <p style="font-weight:600;">${opts.vendor}</p>
                <p style="font-size:13px;color:#64748b;margin-top:4px;">${opts.type}</p>
            </div>
            <div class="meta-box">
                <h3>Project</h3>
                <p style="font-weight:600;">${opts.project}</p>
                <p style="font-size:13px;color:#64748b;">CFP #${opts.cfp}</p>
            </div>
        </div>
        <table>
            <thead><tr><th>Item</th><th>Description</th><th class="amount">Amount</th></tr></thead>
            <tbody>
                <tr><td style="padding:8px;">Original Contract</td><td style="padding:8px;">Per scope of work</td><td style="padding:8px;" class="amount">${opts.amount}</td></tr>
                ${suppRows}
            </tbody>
        </table>
        <div class="total">Contract Value: ${opts.amount}</div>
        <div class="sig">
            <div class="sig-line">City Representative</div>
            <div class="sig-line">Consultant Representative</div>
        </div>
        <div class="footer">
            This is a demo document for the Invoice Processing Coordinator MVP.<br>
            In production, this would be the signed contract PDF stored in SharePoint.
        </div>
    </div>
</body>
</html>`;
}

// ============================================================
// INVOICES
// ============================================================

// Main Street (18013) invoices
writeFileSync(`${DOCS_DIR}/invoices/18013/DEA-2025-001.html`, makeInvoiceDoc({
    number: "DEA-2025-001", vendor: "David Evans and Associates",
    amount: "$45,000.00", project: "Main Street Improvements", cfp: "18013",
    date: "March 14, 2025",
    tasks: [
        { code: "PM", desc: "Project Management", amount: "$8,000" },
        { code: "SURV", desc: "Surveying", amount: "$12,000" },
        { code: "DES", desc: "Design Development", amount: "$20,000" },
        { code: "PERMIT", desc: "Permitting", amount: "$5,000" },
    ],
}));

writeFileSync(`${DOCS_DIR}/invoices/18013/DEA-2025-001-signed.html`, makeInvoiceDoc({
    number: "DEA-2025-001", vendor: "David Evans and Associates",
    amount: "$45,000.00", project: "Main Street Improvements", cfp: "18013",
    date: "March 14, 2025", signed: true,
    tasks: [
        { code: "PM", desc: "Project Management", amount: "$8,000" },
        { code: "SURV", desc: "Surveying", amount: "$12,000" },
        { code: "DES", desc: "Design Development", amount: "$20,000" },
        { code: "PERMIT", desc: "Permitting", amount: "$5,000" },
    ],
}));

writeFileSync(`${DOCS_DIR}/invoices/18013/DEA-2025-002.html`, makeInvoiceDoc({
    number: "DEA-2025-002", vendor: "David Evans and Associates",
    amount: "$62,500.00", project: "Main Street Improvements", cfp: "18013",
    date: "May 31, 2025", grantCode: "FHWA-2025",
    tasks: [
        { code: "PM", desc: "Project Management", amount: "$10,000" },
        { code: "DES", desc: "Design Development (30%)", amount: "$40,000" },
        { code: "ENV", desc: "Environmental", amount: "$12,500" },
    ],
}));

writeFileSync(`${DOCS_DIR}/invoices/18013/DEA-2025-002-signed.html`, makeInvoiceDoc({
    number: "DEA-2025-002", vendor: "David Evans and Associates",
    amount: "$62,500.00", project: "Main Street Improvements", cfp: "18013",
    date: "May 31, 2025", signed: true, grantCode: "FHWA-2025",
    tasks: [
        { code: "PM", desc: "Project Management", amount: "$10,000" },
        { code: "DES", desc: "Design Development (30%)", amount: "$40,000" },
        { code: "ENV", desc: "Environmental", amount: "$12,500" },
    ],
}));

writeFileSync(`${DOCS_DIR}/invoices/18013/DEA-2025-003.html`, makeInvoiceDoc({
    number: "DEA-2025-003", vendor: "David Evans and Associates",
    amount: "$38,000.00", project: "Main Street Improvements", cfp: "18013",
    date: "September 14, 2025", grantCode: "FHWA-2025",
    tasks: [
        { code: "DES", desc: "Design Development (60%)", amount: "$30,000" },
        { code: "PERMIT", desc: "Permit Applications", amount: "$8,000" },
    ],
}));

// Bridge (19045) invoices
writeFileSync(`${DOCS_DIR}/invoices/19045/DEA-599518.html`, makeInvoiceDoc({
    number: "DEA-599518", vendor: "David Evans and Associates",
    amount: "$78,500.00", project: "36th Street NE Bridge Replacement", cfp: "19045",
    date: "March 31, 2025",
    tasks: [
        { code: "PM", desc: "Project Management", amount: "$15,000" },
        { code: "HYDRO", desc: "Hydraulic Analysis", amount: "$28,500" },
        { code: "STRUCT", desc: "Structural Design", amount: "$35,000" },
    ],
}));

writeFileSync(`${DOCS_DIR}/invoices/19045/DEA-599518-signed.html`, makeInvoiceDoc({
    number: "DEA-599518", vendor: "David Evans and Associates",
    amount: "$78,500.00", project: "36th Street NE Bridge Replacement", cfp: "19045",
    date: "March 31, 2025", signed: true,
    tasks: [
        { code: "PM", desc: "Project Management", amount: "$15,000" },
        { code: "HYDRO", desc: "Hydraulic Analysis", amount: "$28,500" },
        { code: "STRUCT", desc: "Structural Design", amount: "$35,000" },
    ],
}));

writeFileSync(`${DOCS_DIR}/invoices/19045/SW-161983.html`, makeInvoiceDoc({
    number: "SW-161983", vendor: "Shannon & Wilson",
    amount: "$24,000.00", project: "36th Street NE Bridge Replacement", cfp: "19045",
    date: "May 14, 2025",
    tasks: [
        { code: "GEO", desc: "Geotechnical Investigation", amount: "$24,000" },
    ],
}));

// ============================================================
// CONTRACTS
// ============================================================

writeFileSync(`${DOCS_DIR}/contracts/18013/PSA-2024-001-signed.html`, makeContractDoc({
    number: "PSA-2024-001", vendor: "David Evans and Associates", type: "Design",
    amount: "$185,000", project: "Main Street Improvements", cfp: "18013",
    supplements: [
        { num: 1, amount: "$25,000", desc: "Additional survey scope" },
        { num: 2, amount: "$15,000", desc: "Environmental assessment addition" },
    ],
}));

writeFileSync(`${DOCS_DIR}/contracts/18013/PSA-2024-002-signed.html`, makeContractDoc({
    number: "PSA-2024-002", vendor: "Parametrix", type: "CM Services",
    amount: "$95,000", project: "Main Street Improvements", cfp: "18013",
}));

writeFileSync(`${DOCS_DIR}/contracts/18013/CON-2025-001-signed.html`, makeContractDoc({
    number: "CON-2025-001", vendor: "Granite Construction", type: "Construction",
    amount: "$850,000", project: "Main Street Improvements", cfp: "18013",
}));

writeFileSync(`${DOCS_DIR}/contracts/19045/PSA-2024-010-signed.html`, makeContractDoc({
    number: "PSA-2024-010", vendor: "David Evans and Associates", type: "Design",
    amount: "$320,000", project: "36th Street NE Bridge Replacement", cfp: "19045",
}));

console.log("✅ Generated demo source documents:");
console.log("   📄 8 invoice documents (5 source + 3 signed)");
console.log("   📄 4 contract documents");
console.log("   → public/documents/ (served by Vite at /documents/...)");
