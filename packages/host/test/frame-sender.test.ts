import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SKIPPED_FRAMES_BEFORE_WARN,
  canSendFrame,
  createFrameSendGuard,
  MAX_WS_BUFFER_BYTES,
} from "../src/stream/frame-sender.js";

describe("frame send guard", () => {
  const openState = 1;

  it("warns after consecutive skipped frames when the socket buffer is full", () => {
    const guard = createFrameSendGuard();
    const socket = { readyState: openState, bufferedAmount: MAX_WS_BUFFER_BYTES + 1 };
    let warned = false;
    let recovered = false;

    for (let i = 0; i < SKIPPED_FRAMES_BEFORE_WARN - 1; i++) {
      assert.equal(
        canSendFrame(socket, openState, guard, () => {
          warned = true;
        }, () => {
          recovered = true;
        }),
        false,
      );
    }
    assert.equal(warned, false);

    assert.equal(
      canSendFrame(socket, openState, guard, () => {
        warned = true;
      }, () => {
        recovered = true;
      }),
      false,
    );
    assert.equal(warned, true);
    assert.equal(recovered, false);
  });

  it("clears congestion when the socket buffer drains", () => {
    const guard = createFrameSendGuard();
    const congested = { readyState: openState, bufferedAmount: MAX_WS_BUFFER_BYTES + 1 };
    const clear = { readyState: openState, bufferedAmount: 0 };
    let warned = false;
    let recovered = false;

    for (let i = 0; i < SKIPPED_FRAMES_BEFORE_WARN; i++) {
      canSendFrame(congested, openState, guard, () => {
        warned = true;
      }, () => {
        recovered = true;
      });
    }
    assert.equal(warned, true);

    assert.equal(
      canSendFrame(clear, openState, guard, () => {
        warned = true;
      }, () => {
        recovered = true;
      }),
      true,
    );
    assert.equal(recovered, true);
  });
});
