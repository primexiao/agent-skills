import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveCacheDir } from "../../skills/model-radar/scripts/paths.js";

describe("paths", () => {
  it("uses explicit cache override first", () => {
    assert.equal(
      resolveCacheDir({ MODEL_RADAR_CACHE_DIR: "/tmp/custom", XDG_CACHE_HOME: "/tmp/xdg" }, "/home/test"),
      "/tmp/custom",
    );
  });

  it("keeps test fixtures self-contained when MODEL_RADAR_DIR is set", () => {
    assert.equal(resolveCacheDir({ MODEL_RADAR_DIR: "/tmp/fixture" }, "/home/test"), "/tmp/fixture/cache");
  });

  it("defaults to the XDG cache instead of the installed skill directory", () => {
    assert.equal(resolveCacheDir({ XDG_CACHE_HOME: "/tmp/xdg" }, "/home/test"), "/tmp/xdg/model-radar");
    assert.equal(resolveCacheDir({}, "/home/test"), "/home/test/.cache/model-radar");
  });
});
