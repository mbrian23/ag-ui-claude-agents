/**
 * Single source of truth for the AG-UI agent endpoint.
 * Override at runtime with NEXT_PUBLIC_AGENT_URL (e.g. when proxying or hosting elsewhere).
 */
export const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8020/devops";

export const AGENT_ID = "devops_dashboard";
