// Marvel Checklist Service: Storage, Matching & Progress Tracker

const LOCAL_STORAGE_KEY = "filmlibrary_marvel_checklist";

// Default standard list of major Marvel Movies (MCU + Multiverse)
export const DEFAULT_MARVEL_FILMS = [
  "Iron Man",
  "The Incredible Hulk",
  "Iron Man 2",
  "Thor",
  "Captain America: The First Avenger",
  "The Avengers",
  "Iron Man 3",
  "Thor: The Dark World",
  "Captain America: The Winter Soldier",
  "Guardians of the Galaxy",
  "Avengers: Age of Ultron",
  "Ant-Man",
  "Captain America: Civil War",
  "Doctor Strange",
  "Guardians of the Galaxy Vol. 2",
  "Spider-Man: Homecoming",
  "Thor: Ragnarok",
  "Black Panther",
  "Avengers: Infinity War",
  "Ant-Man and the Wasp",
  "Captain Marvel",
  "Avengers: Endgame",
  "Spider-Man: Far From Home",
  "Black Widow",
  "Shang-Chi and the Legend of the Ten Rings",
  "Eternals",
  "Spider-Man: No Way Home",
  "Doctor Strange in the Multiverse of Madness",
  "Thor: Love and Thunder",
  "Black Panther: Wakanda Forever",
  "Ant-Man and the Wasp: Quantumania",
  "Guardians of the Galaxy Vol. 3",
  "The Marvels",
  "Deadpool & Wolverine",
  "Captain America: Brave New World",
  "Thunderbolts"
];

// Default standard list of major Marvel TV Series
export const DEFAULT_MARVEL_SERIES = [
  "WandaVision",
  "The Falcon and the Winter Soldier",
  "Loki",
  "What If...?",
  "Hawkeye",
  "Moon Knight",
  "Ms. Marvel",
  "She-Hulk: Attorney at Law",
  "Secret Invasion",
  "Echo",
  "Agatha All Along",
  "Daredevil: Born Again",
  "Daredevil",
  "The Punisher",
  "Jessica Jones",
  "Luke Cage",
  "Iron Fist",
  "The Defenders",
  "Agents of S.H.I.E.L.D."
];

// Load user's Marvel Checklist from storage
export const getMarvelChecklist = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        films: Array.isArray(parsed.films) ? parsed.films : DEFAULT_MARVEL_FILMS,
        series: Array.isArray(parsed.series) ? parsed.series : DEFAULT_MARVEL_SERIES
      };
    }
  } catch (e) {
    console.warn("Failed to parse marvel checklist:", e);
  }

  return {
    films: DEFAULT_MARVEL_FILMS,
    series: DEFAULT_MARVEL_SERIES
  };
};

// Save user's Marvel Checklist
export const saveMarvelChecklist = (filmsList, seriesList) => {
  const cleanFilms = (Array.isArray(filmsList) ? filmsList : parseListText(filmsList))
    .map((s) => s.trim())
    .filter(Boolean);

  const cleanSeries = (Array.isArray(seriesList) ? seriesList : parseListText(seriesList))
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    films: cleanFilms,
    series: cleanSeries,
    updated_at: new Date().toISOString()
  };

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  return payload;
};

// Parse newline-separated text into array of clean title strings
export const parseListText = (text) => {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((line) => {
      // Clean leading bullet points, numbers like "1. ", "- ", etc.
      return line.replace(/^[\s\d\-•*.)\]]+/, "").trim();
    })
    .filter((line) => line.length > 0);
};

// Convert array of titles into newline-separated text for textarea editing
export const formatListToText = (list) => {
  if (!Array.isArray(list)) return "";
  return list.join("\n");
};

// String normalization for robust title comparison
export const normalizeTitle = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/\b(marvel's|marvels|marvel)\b/gi, "")
    .replace(/\b(the|a|an)\b/gi, "")
    .replace(/\(\d{4}\)/g, "") // remove (2021)
    .replace(/\b\d{4}\b/g, "")   // remove standalone 2021
    .replace(/[:\-–—_.,'!?&]/g, " ") // replace punctuation with spaces
    .replace(/\s+/g, " ")
    .trim();
};

// Check if a library item matches a checklist title
export const isTitleMatch = (checklistTitle, item) => {
  if (!checklistTitle || !item || !item.title) return false;

  const target = normalizeTitle(checklistTitle);
  const candidate = normalizeTitle(item.title);
  const origCandidate = normalizeTitle(item.original_title || "");

  if (target === candidate || (origCandidate && target === origCandidate)) {
    return true;
  }

  // Substring / Inclusion matching if length is significant
  if (target.length >= 5 && (candidate.includes(target) || target.includes(candidate))) {
    return true;
  }

  // Check alias / alternative titles if present
  if (Array.isArray(item.aliases)) {
    if (item.aliases.some((a) => normalizeTitle(a) === target)) return true;
  }

  return false;
};

// Calculate progress and detailed status
export const calculateMarvelTracker = (libraryItems = []) => {
  const { films, series } = getMarvelChecklist();

  // Match Films
  const detailedFilms = films.map((title) => {
    const matchedItem = libraryItems.find(
      (item) => item.type === "movie" && isTitleMatch(title, item)
    ) || libraryItems.find((item) => isTitleMatch(title, item));

    return {
      title,
      type: "movie",
      isOwned: Boolean(matchedItem),
      matchedItem: matchedItem || null
    };
  });

  // Match Series
  const detailedSeries = series.map((title) => {
    const matchedItem = libraryItems.find(
      (item) => (item.type === "series" || item.type === "tv") && isTitleMatch(title, item)
    ) || libraryItems.find((item) => isTitleMatch(title, item));

    return {
      title,
      type: "series",
      isOwned: Boolean(matchedItem),
      matchedItem: matchedItem || null
    };
  });

  const filmsOwned = detailedFilms.filter((f) => f.isOwned).length;
  const filmsTotal = detailedFilms.length;
  const filmsMissing = Math.max(0, filmsTotal - filmsOwned);
  const filmsPercent = filmsTotal > 0 ? Math.round((filmsOwned / filmsTotal) * 100) : 0;

  const seriesOwned = detailedSeries.filter((s) => s.isOwned).length;
  const seriesTotal = detailedSeries.length;
  const seriesMissing = Math.max(0, seriesTotal - seriesOwned);
  const seriesPercent = seriesTotal > 0 ? Math.round((seriesOwned / seriesTotal) * 100) : 0;

  const totalOwned = filmsOwned + seriesOwned;
  const totalItems = filmsTotal + seriesTotal;
  const totalMissing = filmsMissing + seriesMissing;
  const totalPercent = totalItems > 0 ? Math.round((totalOwned / totalItems) * 100) : 0;

  return {
    films: {
      total: filmsTotal,
      owned: filmsOwned,
      missing: filmsMissing,
      percent: filmsPercent,
      items: detailedFilms
    },
    series: {
      total: seriesTotal,
      owned: seriesOwned,
      missing: seriesMissing,
      percent: seriesPercent,
      items: detailedSeries
    },
    total: {
      total: totalItems,
      owned: totalOwned,
      missing: totalMissing,
      percent: totalPercent
    }
  };
};
