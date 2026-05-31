import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPrivateOrLocalIp } from "../src/security/ip-filter.js";

describe("ip filter", () => {
  it("allows localhost and LAN addresses", () => {
    assert.equal(isPrivateOrLocalIp("127.0.0.1"), true);
    assert.equal(isPrivateOrLocalIp("::ffff:127.0.0.1"), true);
    assert.equal(isPrivateOrLocalIp("192.168.1.5"), true);
    assert.equal(isPrivateOrLocalIp("10.0.0.4"), true);
    assert.equal(isPrivateOrLocalIp("172.16.0.2"), true);
  });

  it("blocks public addresses", () => {
    assert.equal(isPrivateOrLocalIp("8.8.8.8"), false);
    assert.equal(isPrivateOrLocalIp("1.1.1.1"), false);
    assert.equal(isPrivateOrLocalIp("203.0.113.10"), false);
  });
});
