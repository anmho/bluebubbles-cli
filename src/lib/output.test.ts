import { describe, expect, test } from "bun:test";
import { tailLines } from "./output.js";

describe("tailLines", () => {
  test("returns the last N non-empty lines", () => {
    expect(tailLines("one\ntwo\nthree\n", 2)).toBe("two\nthree");
  });
});
