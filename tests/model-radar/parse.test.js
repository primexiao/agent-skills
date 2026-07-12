import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseNumericSuffix,
  parseRange,
  parseTokens,
} from "../../skills/model-radar/scripts/parse.js";

describe("parse", () => {
  it("parses k, m, and b numeric suffixes", () => {
    assert.equal(parseNumericSuffix("128k"), 128000);
    assert.equal(parseNumericSuffix("1m"), 1000000);
    assert.equal(parseNumericSuffix("1b"), 1000000000);
    assert.equal(parseNumericSuffix("42"), 42);
  });

  it("parses range expressions", () => {
    assert.deepEqual(parseRange("..1", "max"), { min: undefined, max: 1 });
    assert.deepEqual(parseRange("128k", "min"), { min: 128000 });
    assert.deepEqual(parseRange("10..20"), { min: 10, max: 20 });
    assert.deepEqual(parseRange("5", "max"), { max: 5 });
  });

  it("parses list command filters and sort options", () => {
    assert.deepEqual(parseTokens(["list", "gen:image", "price:..1", "ctx:128k", "hf:true", "sort:popular", "top:10"]), {
      command: "list",
      constraints: {
        output_modalities: ["image"],
        price: { min: undefined, max: 1 },
        context: { min: 128000 },
        hugging_face_listed: true,
      },
      sort: "popular",
      top: 10,
    });
  });

  it("keeps open as a compatibility alias for the Hugging Face listing filter", () => {
    assert.deepEqual(parseTokens(["list", "open:true"]).constraints, {
      hugging_face_listed: true,
    });
  });

  it("parses compare model names", () => {
    assert.deepEqual(parseTokens(["compare", "gpt-4o", "claude-sonnet-4"]), {
      command: "compare",
      models: ["gpt-4o", "claude-sonnet-4"],
    });
  });

  it("rejects invalid commands, tokens, numeric values, and booleans", () => {
    assert.throws(() => parseTokens(["unknown"]), /Unknown command/);
    assert.throws(() => parseTokens(["compare", "gpt-4o"]), /at least two/);
    assert.throws(() => parseTokens(["list", "budget:2"]), /Unknown token/);
    assert.throws(() => parseTokens(["list", "price:nope"]), /Invalid numeric/);
    assert.throws(() => parseTokens(["list", "price:10..5"]), /minimum.*maximum/);
    assert.throws(() => parseTokens(["list", "sort:quick"]), /Invalid sort/);
    assert.throws(() => parseTokens(["list", "hf:yes"]), /true or false/);
    assert.throws(() => parseTokens(["list", "top:0"]), /positive integer/);
  });
});
