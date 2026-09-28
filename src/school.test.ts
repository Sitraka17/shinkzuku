import { describe, expect, it } from "vitest";
import { createFishAppearance } from "./fish-appearance";
import { School } from "./school";
import { settings } from "./settings/store";

describe("six passages pond", () => {
  it("keeps exactly six distinct carp and no small fish through interactions and resets", () => {
    settings.resetAll();
    const school = new School();
    expect(school.fish).toHaveLength(6);
    expect(new Set(school.fish.map((_, index) => createFishAppearance(index).pattern)).size).toBe(6);
    for (const count of [0, 1, 48, NaN]) {
      school.setCount(count);
      expect(school.count).toBe(6);
    }
    settings.set(["koi", "initialCount"], 48);
    settings.set(["tiny-fish", "visibleSchoolCount"], 32);
    school.reset();
    school.callTo({ x: 200, y: 100 });
    school.scatter();
    school.update(1 / 60, 1);
    expect(settings.live.koi.initialCount).toBe(6);
    expect(school.count).toBe(6);
    expect(school.tinyFish.fish).toHaveLength(0);
  });
});
