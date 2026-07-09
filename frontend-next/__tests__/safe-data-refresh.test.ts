import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

function readFrontendFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf-8");
}

describe("safe data refresh", () => {
  it("remounts client pages on strong refresh when no draft must be preserved", () => {
    const hook = readFrontendFile("hooks/useSafeDataRefresh.tsx");

    expect(hook).toContain("routeRefreshVersion");
    expect(hook).toContain("setRouteRefreshVersion((value) => value + 1)");
    expect(hook).toContain("<div key={routeRefreshVersion} className=\"contents\">");
    expect(hook).toContain("if (!preserveDraft)");
  });
});
