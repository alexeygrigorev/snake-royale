import { createMockServices } from "./mock";
import type { Services } from "./types";

/**
 * Central entrypoint for backend calls. Swap the implementation here
 * (e.g. real Supabase/HTTP client) without touching call sites.
 */
export const services: Services = createMockServices();

export type { Services } from "./types";
export * from "./types";