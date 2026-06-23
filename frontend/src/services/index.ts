import { createHttpServices } from "./http";
import type { Services } from "./types";

/**
 * Central entrypoint for backend calls.
 */
export const services: Services = createHttpServices();

export type { Services } from "./types";
export * from "./types";
