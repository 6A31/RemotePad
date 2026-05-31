import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveKeyToVk } from "../src/input/win32-keyboard.js";

describe("win32 keyboard", () => {
  it("maps protocol keys to virtual key codes", () => {
    assert.equal(resolveKeyToVk("w"), 0x57);
    assert.equal(resolveKeyToVk("a"), 0x41);
    assert.equal(resolveKeyToVk("space"), 0x20);
    assert.equal(resolveKeyToVk("shift"), 0xa0);
    assert.equal(resolveKeyToVk("5"), 0x35);
    assert.equal(resolveKeyToVk("q"), 0x51);
    assert.equal(resolveKeyToVk("unknown"), null);
  });
});
