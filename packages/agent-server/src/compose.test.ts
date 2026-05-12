import { describe, expect, it } from "vitest";
import { makeBashGuard } from "./compose";

const noop = new AbortController();

describe("makeBashGuard", () => {
  it("allows commands matching a whitelisted prefix", async () => {
    const guard = makeBashGuard(["gh "]);
    const result = await guard(
      "Bash",
      { command: "gh pr list --repo o/r" },
      { signal: noop.signal, toolUseID: "x" }
    );
    expect(result.behavior).toBe("allow");
  });

  it("denies commands not matching any prefix", async () => {
    const guard = makeBashGuard(["gh "]);
    const result = await guard(
      "Bash",
      { command: "ls /" },
      { signal: noop.signal, toolUseID: "x" }
    );
    expect(result.behavior).toBe("deny");
    if (result.behavior === "deny") {
      expect(result.message).toContain("whitelist");
    }
  });

  it("denies invocations with a missing command", async () => {
    const guard = makeBashGuard(["gh "]);
    const result = await guard(
      "Bash",
      {},
      { signal: noop.signal, toolUseID: "x" }
    );
    expect(result.behavior).toBe("deny");
  });

  it("passes through non-Bash tools without inspection", async () => {
    const guard = makeBashGuard(["gh "]);
    const result = await guard(
      "Read",
      { path: "/etc/passwd" },
      { signal: noop.signal, toolUseID: "x" }
    );
    expect(result.behavior).toBe("allow");
  });

  it("matches the union of multiple skills' prefixes", async () => {
    const guard = makeBashGuard(["gh ", "git "]);
    expect((await guard("Bash", { command: "git log" }, { signal: noop.signal, toolUseID: "x" })).behavior).toBe("allow");
    expect((await guard("Bash", { command: "gh repo view" }, { signal: noop.signal, toolUseID: "x" })).behavior).toBe("allow");
    expect((await guard("Bash", { command: "rm -rf /" }, { signal: noop.signal, toolUseID: "x" })).behavior).toBe("deny");
  });
});
