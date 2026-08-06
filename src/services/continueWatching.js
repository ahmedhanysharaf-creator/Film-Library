/**
 * Continue Watching Service (Netflix-style)
 * Stores and manages user's active watch progress for Movies & TV Series
 */

const STORAGE_KEY = "filmlibrary_continue_watching";

export const getContinueWatchingList = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveContinueWatchingItem = (itemData) => {
  if (!itemData || !itemData.mediaId) return [];

  const currentList = getContinueWatchingList();
  const existingIdx = currentList.findIndex((i) => i.mediaId === itemData.mediaId);

  const updatedEntry = {
    mediaId: itemData.mediaId,
    title: itemData.title || "Untitled",
    type: itemData.type || "movie",
    posterUrl: itemData.poster_url || itemData.posterUrl || "",
    backdropUrl: itemData.backdrop_url || itemData.backdropUrl || "",
    season: itemData.season || 1,
    episode: itemData.episode || 1,
    epCode: itemData.type === "series" || itemData.type === "tv" ? `S${itemData.season || 1}E${itemData.episode || 1}` : null,
    progressPct: itemData.progressPct || 50,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    currentList[existingIdx] = { ...currentList[existingIdx], ...updatedEntry };
  } else {
    currentList.unshift(updatedEntry);
  }

  const sorted = currentList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));

  window.dispatchEvent(new Event("filmlibrary_continue_watching_updated"));
  return sorted;
};

export const updateContinueWatchingProgress = (mediaId, season, episode) => {
  const currentList = getContinueWatchingList();
  const existingIdx = currentList.findIndex((i) => i.mediaId === mediaId);
  if (existingIdx >= 0) {
    currentList[existingIdx].season = parseInt(season) || 1;
    currentList[existingIdx].episode = parseInt(episode) || 1;
    currentList[existingIdx].epCode = `S${season}E${episode}`;
    currentList[existingIdx].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new Event("filmlibrary_continue_watching_updated"));
  }
};

export const removeContinueWatchingItem = (mediaId) => {
  const currentList = getContinueWatchingList();
  const filtered = currentList.filter((i) => i.mediaId !== mediaId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("filmlibrary_continue_watching_updated"));
  return filtered;
};
