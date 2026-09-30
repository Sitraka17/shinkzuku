import { BookOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BIBLE_VERSES, VERSE_COPY, createVerseScheduler, isVerseLanguage,
  readVerseLanguage, saveVerseLanguage, type VerseLanguage,
} from "./bible-verses";

export function useBibleVerses() {
  const [language, setLanguage] = useState<VerseLanguage>(readVerseLanguage);
  const [verseIndex, setVerseIndex] = useState<number | null>(null);
  const nextIndex = useRef(0);
  const scheduler = useRef<ReturnType<typeof createVerseScheduler> | null>(null);
  useEffect(() => {
    const clock = createVerseScheduler({
      show: () => {
        setVerseIndex(nextIndex.current);
        nextIndex.current = (nextIndex.current + 1) % BIBLE_VERSES.length;
      },
      hide: () => setVerseIndex(null),
      isVisible: () => document.visibilityState !== "hidden",
    });
    scheduler.current = clock;
    document.addEventListener("visibilitychange", clock.synchronize);
    window.addEventListener("pageshow", clock.synchronize);
    return () => {
      clock.dispose();
      scheduler.current = null;
      document.removeEventListener("visibilitychange", clock.synchronize);
      window.removeEventListener("pageshow", clock.synchronize);
    };
  }, []);
  return {
    language,
    setLanguage(value: string) {
      if (!isVerseLanguage(value)) return;
      setLanguage(value);
      saveVerseLanguage(value);
    },
    verseIndex,
    showNow: () => scheduler.current?.showNow(),
    dismiss: () => scheduler.current?.dismiss(),
  };
}
type VerseController = ReturnType<typeof useBibleVerses>;

export function VerseControls({ verses }: { verses: VerseController }) {
  const copy = VERSE_COPY[verses.language];
  return <div className="verse-controls" lang={verses.language}>
    <select aria-label={copy.language} title={copy.language} value={verses.language} onChange={(event) => verses.setLanguage(event.target.value)}>
      <option value="fr" lang="fr">Français</option>
      <option value="en" lang="en">English</option>
      <option value="la" lang="la">Latina</option>
    </select>
    <button type="button" className="verse-preview" onClick={verses.showNow} aria-label={copy.preview} title={`${copy.preview} · ${copy.cadence}`}>
      <BookOpen size={16} aria-hidden="true" />
    </button>
  </div>;
}

export function VerseCard({ verses }: { verses: VerseController }) {
  const copy = VERSE_COPY[verses.language];
  const verse = verses.verseIndex === null ? null : BIBLE_VERSES[verses.verseIndex];
  // Keep the live region mounted so screen readers announce later appearances.
  return <div className="verse-layer" aria-live="polite" aria-atomic="true" lang={verses.language}>
    {verse && <aside className="verse-card" aria-label={copy.title} key={verses.verseIndex}>
      <button type="button" className="verse-dismiss" onClick={verses.dismiss} aria-label={copy.close}><X size={16} aria-hidden="true" /></button>
      <p className="verse-eyebrow">{copy.title}</p>
      <blockquote>{verse.text[verses.language]}</blockquote>
      <a className="verse-reference" href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(verse.passage)}&version=${copy.version}`} target="_blank" rel="noopener noreferrer">{verse.references[verses.language]}</a>
      <p className="verse-edition">{copy.edition}</p>
    </aside>}
  </div>;
}
