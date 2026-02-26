import { router } from "./trpc.js";
import { projectsRouter } from "./routers/projects.js";
import { contractsRouter } from "./routers/contracts.js";
import { invoicesRouter } from "./routers/invoices.js";
import { fundingSourcesRouter } from "./routers/fundingSources.js";
import { gutcheckRouter } from "./routers/gutcheck.js";
import { exportRouter } from "./routers/export.js";

export const appRouter = router({
    projects: projectsRouter,
    contracts: contractsRouter,
    invoices: invoicesRouter,
    fundingSources: fundingSourcesRouter,
    gutcheck: gutcheckRouter,
    export: exportRouter,
});

export type AppRouter = typeof appRouter;
