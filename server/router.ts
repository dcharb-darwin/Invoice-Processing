import { router } from "./trpc.js";
import { projectsRouter } from "./routers/projects.js";
import { contractsRouter } from "./routers/contracts.js";
import { invoicesRouter } from "./routers/invoices.js";
import { fundingSourcesRouter } from "./routers/fundingSources.js";
import { gutcheckRouter } from "./routers/gutcheck.js";
import { exportRouter } from "./routers/export.js";
import { importRouter } from "./routers/import.js";
import { grantsRouter } from "./routers/grants.js";
import { tasklineSyncRouter } from "./routers/tasklineSync.js";
import { templatesRouter } from "./routers/templates.js";
import { syncConfigRouter } from "./routers/syncConfig.js";
import { extractionRouter } from "./routers/extraction.js";
import { spreadsheetSyncRouter } from "./routers/spreadsheetSync.js";
import { financeReconciliationRouter } from "./routers/financeReconciliation.js";
import { publicIngestRouter } from "./routers/publicIngest.js";

export const appRouter = router({
    projects: projectsRouter,
    contracts: contractsRouter,
    invoices: invoicesRouter,
    fundingSources: fundingSourcesRouter,
    gutcheck: gutcheckRouter,
    export: exportRouter,
    import: importRouter,
    grants: grantsRouter,
    sync: tasklineSyncRouter,
    templates: templatesRouter,
    syncConfig: syncConfigRouter,
    extraction: extractionRouter,
    spreadsheetSync: spreadsheetSyncRouter,
    financeReconciliation: financeReconciliationRouter,
    publicIngest: publicIngestRouter,
});

export type AppRouter = typeof appRouter;
