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
    season: parseInt(itemData.season) || 1,
    episode: parseInt(itemData.episode) || 1,
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
  const s = parseInt(season) || 1;
  const e = parseInt(episode) || 1;

  if (existingIdx >= 0) {
    currentList[existingIdx].season = s;
    currentList[existingIdx].episode = e;
    currentList[existingIdx].epCode = `S${s}E${e}`;
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

export const getNextEpisodeToPlay = (mediaItem, uid) => {
  if (!mediaItem) return { season: 1, episode: 1, epCode: "S1E1" };

  // 1. Check Continue Watching list first
  const cwList = getContinueWatchingList();
  const cwEntry = cwList.find((i) => i.mediaId === mediaItem.id || i.mediaId === mediaItem.tmdb_id);
  if (cwEntry && cwEntry.season && cwEntry.episode) {
    return {
      season: cwEntry.season,
      episode: cwEntry.episode,
      epCode: `S${cwEntry.season}E${cwEntry.episode}`
    };
  }

  // 2. Check watched episodes in user_progress
  const userProg = (mediaItem.user_progress || {})[uid];
  const watchedEps = userProg?.watched_episodes || [];
  
  if (watchedEps.length > 0) {
    let maxSeason = 1;
    let maxEp = 0;
    watchedEps.forEach((code) => {
      const match = code.match(/S(\d+)E(\d+)/i);
      if (match) {
        const s = parseInt(match[1], 10);
        const e = parseInt(match[2], 10);
        if (s > maxSeason || (s === maxSeason && e > maxEp)) {
          maxSeason = s;
          maxEp = e;
        }
      }
    });

    const seasons = mediaItem.seasons || [{ season_number: 1, episode_count: 10 }];
    const currentSeasonObj = seasons.find((s) => s.season_number === maxSeason) || seasons[0];
    
    if (maxEp < (currentSeasonObj.episode_count || 10)) {
      const nextEp = maxEp + 1;
      return { season: maxSeason, episode: nextEp, epCode: `S${maxSeason}E${nextEp}` };
    } else {
      const nextSeasonNum = maxSeason + 1;
      return { season: nextSeasonNum, episode: 1, epCode: `S${nextSeasonNum}E1` };
    }
  }

  return { season: 1, episode: 1, epCode: "S1E1" };
};
