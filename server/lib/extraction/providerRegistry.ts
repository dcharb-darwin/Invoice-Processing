// server/lib/extraction/providerRegistry.ts
// Manages available extraction providers with priority selection
// [trace: comprehensive-prd.md §3.9 — provider registry]
import type { ExtractionProvider } from "./types.js";
import { LocalProvider } from "./providers/localProvider.js";

// Provider priority: PrivateGPU > Bedrock > Local
// Only LocalProvider is registered for MVP
const providers: ExtractionProvider[] = [
    new LocalProvider(),
    // Future: new BedrockProvider(),
    // Future: new PrivateGPUProvider(),
];

/** Returns the best available provider (highest priority first) */
export async function getProvider(): Promise<ExtractionProvider> {
    // Check in reverse order (highest priority last in array → first checked)
    for (let i = providers.length - 1; i >= 0; i--) {
        if (await providers[i].isAvailable()) return providers[i];
    }
    // Fallback — LocalProvider is always available
    return providers[0];
}

/** Register a new provider (used for testing or runtime plugin loading) */
export function registerProvider(provider: ExtractionProvider): void {
    providers.push(provider);
}

/** List all registered providers with availability status */
export async function listProviders(): Promise<Array<{ name: string; available: boolean }>> {
    return Promise.all(providers.map(async (p) => ({
        name: p.name,
        available: await p.isAvailable(),
    })));
}
