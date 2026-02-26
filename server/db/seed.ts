import { db } from "./index.js";
import * as schema from "./schema.js";

/**
 * Seed script — populates the database with real Lake Stevens data.
 *
 * Seeds Eric's Main Street Improvements (18013) and Shannon's 36th St Bridge
 * with representative data extracted from their actual spreadsheets.
 *
 * [trace: dev-plan L267-268 — seed with real data, Things You Didn't Think Of #1]
 */
async function seed() {
    console.log("🌱 Seeding database...");

    // ============================================================
    // PROJECT 1: Eric's Main Street Improvements (CFP 18013)
    // [trace: discovery L102-114]
    // ============================================================
    const [mainStreet] = await db
        .insert(schema.projects)
        .values({
            name: "Main Street Improvements",
            cfpNumber: "18013",
            projectNumber: "RD-101",
            type: "ST",
            description: "Main Street corridor improvements including design, ROW acquisition, and construction",
            status: "Active",
            projectManager: "Eric",
        })
        .returning();

    console.log(`  ✓ Project: ${mainStreet.name} (CFP #${mainStreet.cfpNumber})`);

    // Funding sources [trace: discovery L103-106]
    await db.insert(schema.fundingSources).values([
        {
            projectId: mainStreet.id,
            sourceName: "FHWA Grant",
            springbrookBudgetCode: "301-000-333-20-20-50",
            allocatedAmount: 250_000_00, // $250,000
            yearAllocations: JSON.stringify({ "2025": 150_000_00, "2026": 100_000_00 }),
        },
        {
            projectId: mainStreet.id,
            sourceName: "TIZ 1",
            springbrookBudgetCode: "301-000-333-20-20-51",
            allocatedAmount: 150_000_00, // $150,000
            yearAllocations: JSON.stringify({ "2025": 150_000_00 }),
        },
        {
            projectId: mainStreet.id,
            sourceName: "R2 Main",
            springbrookBudgetCode: "301-000-333-20-20-52",
            allocatedAmount: 100_000_00, // $100,000
            yearAllocations: JSON.stringify({ "2026": 100_000_00 }),
        },
    ]);

    // Design contract [trace: discovery L107-114]
    const [designContract] = await db
        .insert(schema.contracts)
        .values({
            projectId: mainStreet.id,
            vendor: "David Evans and Associates",
            contractNumber: "PSA-2024-001",
            type: "Design",
            originalAmount: 185_000_00, // $185,000
            signedDocumentLink: "sharepoint://contracts/PSA-2024-001-signed.pdf",
        })
        .returning();

    // Design contract supplements [trace: discovery L108, dev-plan L282-284]
    await db.insert(schema.contractSupplements).values([
        {
            contractId: designContract.id,
            supplementNumber: 1,
            amount: 25_000_00, // $25,000
            date: "2025-06-15",
            description: "Additional survey scope",
        },
        {
            contractId: designContract.id,
            supplementNumber: 2,
            amount: 15_000_00, // $15,000
            date: "2025-09-01",
            description: "Environmental assessment addition",
        },
    ]);

    // CM Services contract
    const [cmContract] = await db
        .insert(schema.contracts)
        .values({
            projectId: mainStreet.id,
            vendor: "Parametrix",
            contractNumber: "PSA-2024-002",
            type: "CM_Services",
            originalAmount: 95_000_00, // $95,000
        })
        .returning();

    // Construction contract
    await db.insert(schema.contracts).values({
        projectId: mainStreet.id,
        vendor: "Granite Construction",
        contractNumber: "CON-2025-001",
        type: "Construction",
        originalAmount: 850_000_00, // $850,000
    });

    // Budget line items [trace: dev-plan L107-115, L146-155]
    const [designBLI] = await db
        .insert(schema.budgetLineItems)
        .values({ projectId: mainStreet.id, category: "Design", projectedCost: 225_000_00, percentScopeComplete: 65 })
        .returning();
    const [rowBLI] = await db
        .insert(schema.budgetLineItems)
        .values({ projectId: mainStreet.id, category: "ROW", projectedCost: 75_000_00, percentScopeComplete: 40 })
        .returning();
    const [cmBLI] = await db
        .insert(schema.budgetLineItems)
        .values({ projectId: mainStreet.id, category: "CM_Services", projectedCost: 95_000_00, percentScopeComplete: 10 })
        .returning();
    const [constBLI] = await db
        .insert(schema.budgetLineItems)
        .values({ projectId: mainStreet.id, category: "Construction", projectedCost: 850_000_00, percentScopeComplete: 0 })
        .returning();
    const [permitBLI] = await db
        .insert(schema.budgetLineItems)
        .values({ projectId: mainStreet.id, category: "Permitting", projectedCost: 15_000_00, percentScopeComplete: 50 })
        .returning();

    // Sample invoices with task breakdowns [trace: dev-plan L117-129, L286-288]
    const [inv1] = await db
        .insert(schema.invoices)
        .values({
            projectId: mainStreet.id,
            contractId: designContract.id,
            invoiceNumber: "DEA-2025-001",
            vendor: "David Evans and Associates",
            totalAmount: 45_000_00,
            dateReceived: "2025-03-15",
            dateApproved: "2025-03-20",
            status: "Paid",
        })
        .returning();

    await db.insert(schema.invoiceTaskBreakdown).values([
        { invoiceId: inv1.id, budgetLineItemId: designBLI.id, taskCode: "PM", taskDescription: "Project Management", amount: 8_000_00 },
        { invoiceId: inv1.id, budgetLineItemId: designBLI.id, taskCode: "SURV", taskDescription: "Surveying", amount: 12_000_00 },
        { invoiceId: inv1.id, budgetLineItemId: designBLI.id, taskCode: "DES", taskDescription: "Design Development", amount: 20_000_00 },
        { invoiceId: inv1.id, budgetLineItemId: permitBLI.id, taskCode: "PERMIT", taskDescription: "Permitting", amount: 5_000_00 },
    ]);

    const [inv2] = await db
        .insert(schema.invoices)
        .values({
            projectId: mainStreet.id,
            contractId: designContract.id,
            invoiceNumber: "DEA-2025-002",
            vendor: "David Evans and Associates",
            totalAmount: 62_500_00,
            dateReceived: "2025-06-01",
            dateApproved: "2025-06-10",
            status: "Paid",
            grantEligible: true,
            grantCode: "FHWA-2025",
        })
        .returning();

    await db.insert(schema.invoiceTaskBreakdown).values([
        { invoiceId: inv2.id, budgetLineItemId: designBLI.id, taskCode: "PM", taskDescription: "Project Management", amount: 10_000_00 },
        { invoiceId: inv2.id, budgetLineItemId: designBLI.id, taskCode: "DES", taskDescription: "Design Development (30%)", amount: 40_000_00 },
        { invoiceId: inv2.id, budgetLineItemId: designBLI.id, taskCode: "ENV", taskDescription: "Environmental", amount: 12_500_00 },
    ]);

    const [inv3] = await db
        .insert(schema.invoices)
        .values({
            projectId: mainStreet.id,
            contractId: designContract.id,
            invoiceNumber: "DEA-2025-003",
            vendor: "David Evans and Associates",
            totalAmount: 38_000_00,
            dateReceived: "2025-09-15",
            status: "Reviewed",
            grantEligible: true,
            grantCode: "FHWA-2025",
        })
        .returning();

    await db.insert(schema.invoiceTaskBreakdown).values([
        { invoiceId: inv3.id, budgetLineItemId: designBLI.id, taskCode: "DES", taskDescription: "Design Development (60%)", amount: 30_000_00 },
        { invoiceId: inv3.id, budgetLineItemId: permitBLI.id, taskCode: "PERMIT", taskDescription: "Permit Applications", amount: 8_000_00 },
    ]);

    // ROW parcels [trace: discovery L488-491]
    await db.insert(schema.rowParcels).values([
        { projectId: mainStreet.id, parcelNumber: "29051600-100-00", expenditureType: "Acquisition", amount: 35_000_00 },
        { projectId: mainStreet.id, parcelNumber: "29051600-200-00", expenditureType: "Easement", amount: 12_000_00 },
    ]);

    // ============================================================
    // PROJECT 2: Shannon's 36th St Bridge (Catherine Creek)
    // [trace: discovery L81-98]
    // ============================================================
    const [bridgeProject] = await db
        .insert(schema.projects)
        .values({
            name: "36th Street NE Bridge Replacement",
            cfpNumber: "19045",
            projectNumber: "BR-203",
            type: "ST",
            description: "Catherine Creek bridge replacement — design phase",
            status: "Active",
            projectManager: "Shannon",
        })
        .returning();

    console.log(`  ✓ Project: ${bridgeProject.name} (CFP #${bridgeProject.cfpNumber})`);

    // Funding [trace: discovery L84-86]
    await db.insert(schema.fundingSources).values([
        {
            projectId: bridgeProject.id,
            sourceName: "PWB Loan",
            allocatedAmount: 500_000_00,
            yearAllocations: JSON.stringify({ "2025": 300_000_00, "2026": 200_000_00 }),
        },
        {
            projectId: bridgeProject.id,
            sourceName: "City Capital Fund",
            allocatedAmount: 125_000_00,
            yearAllocations: JSON.stringify({ "2025": 125_000_00 }),
        },
    ]);

    // Design contract
    const [bridgeDesign] = await db
        .insert(schema.contracts)
        .values({
            projectId: bridgeProject.id,
            vendor: "David Evans and Associates",
            contractNumber: "PSA-2024-010",
            type: "Design",
            originalAmount: 320_000_00,
            signedDocumentLink: "sharepoint://contracts/catherine-creek-psa-signed.pdf",
        })
        .returning();

    // Budget line items
    const [bridgeDesignBLI] = await db
        .insert(schema.budgetLineItems)
        .values({ projectId: bridgeProject.id, category: "Design", projectedCost: 320_000_00, percentScopeComplete: 30 })
        .returning();
    await db.insert(schema.budgetLineItems).values([
        { projectId: bridgeProject.id, category: "Inspector_Material", projectedCost: 45_000_00, percentScopeComplete: 0 },
        { projectId: bridgeProject.id, category: "Permitting", projectedCost: 25_000_00, percentScopeComplete: 15 },
        { projectId: bridgeProject.id, category: "Misc", projectedCost: 10_000_00, percentScopeComplete: 0 },
    ]);

    // Invoices
    const [bridgeInv1] = await db
        .insert(schema.invoices)
        .values({
            projectId: bridgeProject.id,
            contractId: bridgeDesign.id,
            invoiceNumber: "DEA-599518",
            vendor: "David Evans and Associates",
            totalAmount: 78_500_00,
            dateReceived: "2025-04-01",
            dateApproved: "2025-04-10",
            status: "Paid",
        })
        .returning();

    await db.insert(schema.invoiceTaskBreakdown).values([
        { invoiceId: bridgeInv1.id, budgetLineItemId: bridgeDesignBLI.id, taskCode: "PM", taskDescription: "Project Management", amount: 15_000_00 },
        { invoiceId: bridgeInv1.id, budgetLineItemId: bridgeDesignBLI.id, taskCode: "HYDRO", taskDescription: "Hydraulic Analysis", amount: 28_500_00 },
        { invoiceId: bridgeInv1.id, budgetLineItemId: bridgeDesignBLI.id, taskCode: "STRUCT", taskDescription: "Structural Design", amount: 35_000_00 },
    ]);

    const [bridgeInv2] = await db
        .insert(schema.invoices)
        .values({
            projectId: bridgeProject.id,
            contractId: bridgeDesign.id,
            invoiceNumber: "SW-161983",
            vendor: "Shannon & Wilson",
            totalAmount: 24_000_00,
            dateReceived: "2025-05-15",
            status: "Logged",
        })
        .returning();

    await db.insert(schema.invoiceTaskBreakdown).values([
        { invoiceId: bridgeInv2.id, budgetLineItemId: bridgeDesignBLI.id, taskCode: "GEO", taskDescription: "Geotechnical Investigation", amount: 24_000_00 },
    ]);

    console.log("✅ Seed complete — 2 projects, 4 contracts, 5 invoices, real Lake Stevens data");
}

seed().catch(console.error);
