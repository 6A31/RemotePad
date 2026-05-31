import type { FramePayload, ScreenCaptureLike } from "../src/capture/screen.js";

export class MockScreenCapture implements ScreenCaptureLike {
  subscriberCount = 0;
  frameSent = false;

  subscribe(listener: (frame: FramePayload) => void): () => void {
    this.subscriberCount += 1;
    this.frameSent = true;
    listener({
      jpeg: Buffer.from("fake"),
      width: 100,
      height: 100,
      sourceWidth: 100,
      sourceHeight: 100,
      seq: 1,
    });
    return () => {
      this.subscriberCount -= 1;
    };
  }
}
