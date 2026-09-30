import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BIBLE_VERSES, VERSE_LANGUAGES, VERSE_LANGUAGE_KEY, VERSE_DISPLAY_MS,
  VERSE_INTERVAL_MS, createVerseScheduler, readVerseLanguage, saveVerseLanguage,
} from "./bible-verses";

describe("half-hour scripture schedule", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T12:00:00Z")); });
  afterEach(() => vi.useRealTimers());

  it("first appears after 30 minutes, lasts one minute, then repeats at 60 minutes", () => {
    const show = vi.fn();
    const hide = vi.fn();
    const clock = createVerseScheduler({ show, hide, isVisible: () => true });
    vi.advanceTimersByTime(VERSE_INTERVAL_MS - 1);
    expect(show).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(show).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(VERSE_DISPLAY_MS - 1);
    expect(hide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hide).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(VERSE_INTERVAL_MS - VERSE_DISPLAY_MS);
    expect(show).toHaveBeenCalledTimes(2);
    clock.dispose();
  });

  it("does not show unseen verses or build up a backlog while the tab is hidden", () => {
    let visible = true;
    const show = vi.fn();
    const clock = createVerseScheduler({ show, hide: vi.fn(), isVisible: () => visible });
    visible = false;
    clock.synchronize();
    vi.advanceTimersByTime(VERSE_INTERVAL_MS * 4 + 5000);
    expect(show).not.toHaveBeenCalled();
    visible = true;
    clock.synchronize();
    clock.synchronize();
    expect(show).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(VERSE_INTERVAL_MS - 5000);
    expect(show).toHaveBeenCalledTimes(2);
    clock.dispose();
  });

  it("manual previews and dismissals leave the automatic schedule intact", () => {
    const show = vi.fn();
    const hide = vi.fn();
    const clock = createVerseScheduler({ show, hide, isVisible: () => true });
    vi.advanceTimersByTime(VERSE_INTERVAL_MS - 10000);
    clock.showNow();
    clock.dismiss();
    vi.advanceTimersByTime(10000);
    expect(show).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(VERSE_DISPLAY_MS);
    expect(hide).toHaveBeenCalledTimes(2);
    clock.dispose();
  });

  it("resets the dismissal timer for each preview and cleans up on unmount", () => {
    const show = vi.fn();
    const hide = vi.fn();
    const clock = createVerseScheduler({ show, hide, isVisible: () => true });
    clock.showNow();
    vi.advanceTimersByTime(50000);
    clock.showNow();
    vi.advanceTimersByTime(10000);
    expect(hide).not.toHaveBeenCalled();
    clock.dispose();
    vi.advanceTimersByTime(VERSE_INTERVAL_MS * 3);
    clock.synchronize();
    clock.showNow();
    expect(show).toHaveBeenCalledTimes(2);
    expect(hide).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("verse languages", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses a saved choice, including Latin, ahead of the browser language", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("navigator", { language: "en-GB" });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    expect(readVerseLanguage()).toBe("en");
    saveVerseLanguage("la");
    expect(values.get(VERSE_LANGUAGE_KEY)).toBe("la");
    expect(readVerseLanguage()).toBe("la");
    values.set(VERSE_LANGUAGE_KEY, "invalid");
    expect(readVerseLanguage()).toBe("en");
  });
  it("works without browser storage and falls back to French for unsupported languages", () => {
    vi.stubGlobal("localStorage", {
      getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); },
    });
    vi.stubGlobal("navigator", { language: "de-LU" });
    expect(readVerseLanguage()).toBe("fr");
    expect(() => saveVerseLanguage("fr")).not.toThrow();
  });
  it("provides text and matching localized references in all three languages", () => {
    expect(BIBLE_VERSES.length).toBeGreaterThan(1);
    expect(new Set(BIBLE_VERSES.map((verse) => verse.passage)).size).toBe(BIBLE_VERSES.length);
    for (const verse of BIBLE_VERSES) {
      for (const language of VERSE_LANGUAGES) {
        expect(verse.text[language].length).toBeGreaterThan(10);
        expect(verse.references[language]).toMatch(/\d+:\d+/);
      }
    }
  });
});
