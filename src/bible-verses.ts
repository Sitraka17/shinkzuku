export const VERSE_LANGUAGES = ["fr", "en", "la"] as const;
export type VerseLanguage = (typeof VERSE_LANGUAGES)[number];
export const VERSE_LANGUAGE_KEY = "shinkzuku:verse-language";
export const VERSE_INTERVAL_MS = 30 * 60 * 1000;
export const VERSE_DISPLAY_MS = 60 * 1000;

export const VERSE_COPY = {
  fr: { language: "Langue des versets", preview: "Voir un verset", title: "Une parole de paix", close: "Fermer le verset", cadence: "Un verset toutes les 30 minutes", edition: "Louis Segond 1910", version: "LSG" },
  en: { language: "Verse language", preview: "Show a verse", title: "A word of peace", close: "Dismiss verse", cadence: "A verse every 30 minutes", edition: "King James Version", version: "KJV" },
  la: { language: "Lingua versuum", preview: "Versum ostendere", title: "Verbum pacis", close: "Versum claudere", cadence: "Versus singulis triginta minutis", edition: "Biblia Sacra Vulgata", version: "VULGATE" },
} as const;

// Public-domain editions, checked against Bible Gateway. These are quotations,
// not generated translations. Each entry links to the corresponding edition.
export const BIBLE_VERSES = [
  {
    passage: "John 14:27",
    references: { fr: "Jean 14:27", en: "John 14:27", la: "Ioannes 14:27" },
    text: {
      fr: "Je vous laisse la paix, je vous donne ma paix. Je ne vous donne pas comme le monde donne. Que votre coeur ne se trouble point, et ne s’alarme point.",
      en: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
      la: "Pacem relinquo vobis, pacem meam do vobis: non quomodo mundus dat, ego do vobis. Non turbetur cor vestrum, neque formidet.",
    },
  },
  {
    passage: "Matthew 11:28",
    references: { fr: "Matthieu 11:28", en: "Matthew 11:28", la: "Matthaeus 11:28" },
    text: {
      fr: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.",
      en: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
      la: "Venite ad me omnes qui laboratis, et onerati estis, et ego reficiam vos.",
    },
  },
  {
    passage: "Matthew 5:9",
    references: { fr: "Matthieu 5:9", en: "Matthew 5:9", la: "Matthaeus 5:9" },
    text: {
      fr: "Heureux ceux qui procurent la paix, car ils seront appelés fils de Dieu!",
      en: "Blessed are the peacemakers: for they shall be called the children of God.",
      la: "Beati pacifici: quoniam filii Dei vocabuntur.",
    },
  },
  {
    passage: "1 Corinthians 13:13",
    references: { fr: "1 Corinthiens 13:13", en: "1 Corinthians 13:13", la: "I Corinthios 13:13" },
    text: {
      fr: "Maintenant donc ces trois choses demeurent: la foi, l’espérance, la charité; mais la plus grande de ces choses, c’est la charité.",
      en: "And now abideth faith, hope, charity, these three; but the greatest of these is charity.",
      la: "Nunc autem manent fides, spes, caritas, tria haec: major autem horum est caritas.",
    },
  },
  {
    passage: "Matthew 5:7",
    references: { fr: "Matthieu 5:7", en: "Matthew 5:7", la: "Matthaeus 5:7" },
    text: {
      fr: "Heureux les miséricordieux, car ils obtiendront miséricorde!",
      en: "Blessed are the merciful: for they shall obtain mercy.",
      la: "Beati misericordes: quoniam ipsi misericordiam consequentur.",
    },
  },
  {
    passage: "Matthew 11:30",
    references: { fr: "Matthieu 11:30", en: "Matthew 11:30", la: "Matthaeus 11:30" },
    text: {
      fr: "Car mon joug est doux, et mon fardeau léger.",
      en: "For my yoke is easy, and my burden is light.",
      la: "Jugum enim meum suave est, et onus meum leve.",
    },
  },
] as const;

export function isVerseLanguage(value: unknown): value is VerseLanguage {
  return VERSE_LANGUAGES.includes(value as VerseLanguage);
}

export function readVerseLanguage(): VerseLanguage {
  try {
    const saved = localStorage.getItem(VERSE_LANGUAGE_KEY);
    if (isVerseLanguage(saved)) return saved;
  } catch { /* Storage may be unavailable in private browsing. */ }
  const language = typeof navigator === "undefined" ? "fr" : navigator.language.split("-")[0];
  return isVerseLanguage(language) ? language : "fr";
}

export function saveVerseLanguage(language: VerseLanguage): void {
  try { localStorage.setItem(VERSE_LANGUAGE_KEY, language); } catch { /* Keep the in-memory choice. */ }
}

/** One timer for the next appearance, one for dismissal. Hidden tabs never
 * consume verses; returning after missed intervals shows just one, with no burst.
 * Manual previews and language changes do not postpone the half-hour schedule.
 */
export function createVerseScheduler(options: {
  show: () => void;
  hide: () => void;
  isVisible: () => boolean;
}) {
  let nextDue = Date.now() + VERSE_INTERVAL_MS;
  let appearanceTimer: ReturnType<typeof setTimeout> | undefined;
  let dismissalTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const dismiss = () => {
    clearTimeout(dismissalTimer);
    if (!disposed) options.hide();
  };
  const showNow = () => {
    if (disposed) return;
    clearTimeout(dismissalTimer);
    options.show();
    dismissalTimer = setTimeout(dismiss, VERSE_DISPLAY_MS);
  };
  const synchronize = () => {
    clearTimeout(appearanceTimer);
    if (disposed || !options.isVisible()) return;
    const now = Date.now();
    if (now >= nextDue) {
      // Keep the original cadence, but skip missed slots after sleep or hiding.
      nextDue += (Math.floor((now - nextDue) / VERSE_INTERVAL_MS) + 1) * VERSE_INTERVAL_MS;
      showNow();
    }
    appearanceTimer = setTimeout(synchronize, Math.max(1, nextDue - now));
  };
  synchronize();
  return {
    showNow,
    dismiss,
    synchronize,
    dispose() {
      disposed = true;
      clearTimeout(appearanceTimer);
      clearTimeout(dismissalTimer);
    },
  };
}
