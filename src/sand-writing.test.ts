import { describe, expect, it } from "vitest";
import { SandWriting } from "./sand-writing";

describe("temporary sand inscriptions", () => {
  it("keeps a multi-stroke name for seven seconds after its last mark", () => {
    const writing = new SandWriting();
    writing.begin({ x: 0.2, y: 0.3 }, 10);
    writing.append({ x: 0.2, y: 0.6 }, 11);
    writing.end();
    writing.begin({ x: 0.3, y: 0.3 }, 12);
    writing.append({ x: 0.4, y: 0.6 }, 13);
    writing.end();
    writing.expire(19.999);
    expect(writing.strokes).toHaveLength(2);
    writing.expire(20);
    expect(writing.strokes).toHaveLength(0);
  });

  it("does not revive expired writing when a new name is started", () => {
    const writing = new SandWriting();
    writing.begin({ x: 0.2, y: 0.2 }, 0);
    writing.end();
    writing.begin({ x: 0.8, y: 0.8 }, 9);
    expect(writing.strokes).toEqual([[{ x: 0.8, y: 0.8 }]]);
  });

  it("ends cancelled gestures and bounds coordinates outside the captured canvas", () => {
    const writing = new SandWriting();
    writing.begin({ x: -0.5, y: 2 }, 0);
    writing.end();
    writing.append({ x: 0.5, y: 0.5 }, 1);
    expect(writing.strokes).toEqual([[{ x: 0, y: 1 }]]);
    writing.expire(7);
    expect(writing.strokes).toHaveLength(0);
  });

  it("bounds memory during a long continuous gesture", () => {
    const writing = new SandWriting();
    writing.begin({ x: 0, y: 0 }, 0);
    for (let i = 0; i < 10000; i++) writing.append({ x: 0.5, y: 0.5 }, i / 60);
    expect(writing.strokes[0].length).toBeLessThanOrEqual(8192);
  });
});
