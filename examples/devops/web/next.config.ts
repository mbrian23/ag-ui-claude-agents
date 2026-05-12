import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages export raw .ts/.tsx via package.json `main`. Without
  // this, Turbopack treats them as opaque ESM and skips its transpiler.
  transpilePackages: ["agent-core", "agent-react", "agent-pdf"],
};

export default nextConfig;
