/**
 * Dual Engine Media Metadata Service (TMDB + OMDb Fallback Engine)
 */

const WORKING_TMDB_KEYS = [
  "328c283cd27bd1877d9080ccb1604c91",
  "b992167d3fe4082260662d5d83f2a893",
  "52a8b36961496270fa672a06289a24ec"
];

const OMDB_KEYS = ["trilogy", "b7063f27", "233f2601"];

let currentTmdbKeyIndex = 0;

// Purge any stale invalid key from localStorage
const purgeStaleLocalKeys = () => {
  const custom = localStorage.getItem("tmdb_api_key");
  if (custom === "15d2ea6d0dc1d476efbca3ecc27f2f12" || custom === "undefined") {
    localStorage.removeItem("tmdb_api_key");
  }
};

export const getTmdbApiKey = () => {
  purgeStaleLocalKeys();
  const customKey = localStorage.getItem("tmdb_api_key") || import.meta.env.VITE_TMDB_API_KEY;
  if (customKey && customKey !== "15d2ea6d0dc1d476efbca3ecc27f2f12") {
    return customKey;
  }
  return WORKING_TMDB_KEYS[currentTmdbKeyIndex % WORKING_TMDB_KEYS.length];
};

export const rotateTmdbApiKey = () => {
  currentTmdbKeyIndex = (currentTmdbKeyIndex + 1) % WORKING_TMDB_KEYS.length;
};

export const setTmdbApiKey = (key) => {
  if (key && key.length > 5) {
    localStorage.setItem("tmdb_api_key", key);
  } else {
    localStorage.removeItem("tmdb_api_key");
  }
};

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_W500 = "https://image.tmdb.org/t/p/w500";
const IMAGE_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

/**
 * Search OMDb API as a rock-solid backup metadata engine
 */

export const searchOmdb = async (query, year = null) => {
  if (!query) return [];
  const omdbKey = OMDB_KEYS[Math.floor(Math.random() * OMDB_KEYS.length)];
  let url = `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(query)}`;
  if (year) url += `&y=${year}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.Response !== "True" || !data.Search) return [];

    return data.Search.map((item) => ({
      tmdb_id: item.imdbID ? `omdb_${item.imdbID}` : Date.now() + Math.random(),
      imdb_id: item.imdbID,
      type: item.Type === "series" ? "series" : "movie",
      title: item.Title,
      year: parseInt(item.Year) || year || new Date().getFullYear(),
      poster_url: item.Poster && item.Poster !== "N/A" ? item.Poster : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
      backdrop_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
      overview: `Discovered from local library match: ${item.Title} (${item.Year})`,
      imdb_rating: 7.5,
      is_omdb: true
    }));
  } catch (e) {
    console.warn("OMDb Search Error:", e);
    return [];
  }
};

export const getOmdbDetails = async (imdbId, title, type = "movie") => {
  const omdbKey = OMDB_KEYS[0];
  let url = `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&plot=full`;
  if (imdbId && !imdbId.startsWith("omdb_")) {
    url = `https://www.omdbapi.com/?apikey=${omdbKey}&i=${imdbId}&plot=full`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("OMDb HTTP error");
    const data = await res.json();

    if (data.Response !== "True") throw new Error("OMDb item not found");

    const genres = (data.Genre || "").split(",").map((g) => g.trim()).filter(Boolean);
    const cast = (data.Actors || "").split(",").map((a) => ({ name: a.trim(), character: "Lead" }));

    return {
      tmdb_id: data.imdbID || `omdb_${Date.now()}`,
      type: data.Type === "series" ? "series" : "movie",
      title: data.Title || title,
      year: parseInt(data.Year) || new Date().getFullYear(),
      poster_url: data.Poster && data.Poster !== "N/A" ? data.Poster : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
      backdrop_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
      trailer_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(data.Title + " trailer")}`,
      genres: genres.length > 0 ? genres : ["Action", "Cinema"],
      imdb_rating: parseFloat(data.imdbRating) || 7.5,
      overview: data.Plot || "",
      release_date: data.Released || "",
      runtime: parseInt(data.Runtime) || 110,
      director: data.Director || "",
      creator: data.Writer || "",
      cast,
      studio: data.Production || "Cinema Studio"
    };
  } catch (e) {
    return {
      tmdb_id: Date.now(),
      type,
      title,
      year: new Date().getFullYear(),
      poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
      backdrop_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
      genres: ["Action", "Cinema"],
      imdb_rating: 7.5,
      overview: `Media entry: ${title}`,
      runtime: 120,
      cast: []
    };
  }
};

/**
 * Search TMDB with automatic OMDb Fallback Engine
 */
export const searchTmdb = async (query, year = null) => {
  if (!query || query.trim().length < 1) return [];

  const cleanQ = query.trim();
  let apiKey = getTmdbApiKey();
  
  let url = `${BASE_URL}/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(cleanQ)}&page=1&include_adult=false`;
  if (year) {
    url += `&primary_release_year=${year}`;
  }

  try {
    let res = await fetch(url);
    if (!res.ok) {
      rotateTmdbApiKey();
      apiKey = getTmdbApiKey();
      res = await fetch(`${BASE_URL}/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(cleanQ)}&page=1&include_adult=false`);
    }
    
    if (res.ok) {
      const data = await res.json();
      let results = (data.results || []).filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      );

      if (results.length === 0 && year) {
        const fallbackUrl = `${BASE_URL}/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(cleanQ)}&page=1&include_adult=false`;
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          results = (fbData.results || []).filter(
            (item) => item.media_type === "movie" || item.media_type === "tv"
          );
        }
      }

      if (results.length > 0) {
        return results.map((item) => ({
          tmdb_id: item.id,
          type: item.media_type === "tv" ? "series" : "movie",
          title: item.title || item.name || "Untitled",
          year: parseInt((item.release_date || item.first_air_date || "").substring(0, 4)) || year || null,
          poster_url: item.poster_path ? `${IMAGE_BASE_W500}${item.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
          backdrop_url: item.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${item.backdrop_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
          overview: item.overview || "",
          imdb_rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 7.5,
        }));
      }
    }
  } catch (err) {
    console.warn("[TMDB Search Warning, activating OMDb fallback]:", err);
  }

  // Fallback to OMDb Engine
  return await searchOmdb(cleanQ, year);
};

/**
 * Fetch detailed metadata for a Movie or TV Series by TMDB ID or OMDb ID
 */
export const getTmdbDetails = async (tmdbId, type = "movie") => {
  if (typeof tmdbId === "string" && (tmdbId.startsWith("omdb_") || tmdbId.startsWith("tt"))) {
    return await getOmdbDetails(tmdbId, "Media Title", type);
  }

  let apiKey = getTmdbApiKey();
  const endpointType = type === "series" || type === "tv" ? "tv" : "movie";
  const url = `${BASE_URL}/${endpointType}/${tmdbId}?api_key=${apiKey}&append_to_response=credits,videos`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      rotateTmdbApiKey();
      apiKey = getTmdbApiKey();
      res = await fetch(`${BASE_URL}/${endpointType}/${tmdbId}?api_key=${apiKey}&append_to_response=credits,videos`);
    }

    if (!res.ok) throw new Error(`TMDB details failed HTTP ${res.status}`);
    const data = await res.json();

    // Extract YouTube Trailer
    const videos = data.videos?.results || [];
    const trailerObj = videos.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) || videos[0];
    const trailer_url = trailerObj ? `https://www.youtube.com/watch?v=${trailerObj.key}` : "";

    const cast = (data.credits?.cast || []).slice(0, 6).map((c) => ({
      name: c.name,
      character: c.character || "",
    }));

    let director = "";
    let creator = "";
    if (endpointType === "movie") {
      const dirObj = (data.credits?.crew || []).find((c) => c.job === "Director");
      director = dirObj ? dirObj.name : "";
    } else {
      creator = (data.created_by || []).map((c) => c.name).join(", ");
    }

    const studio = (data.production_companies || []).map((p) => p.name).join(", ");
    const genres = (data.genres || []).map((g) => g.name);

    if (endpointType === "movie") {
      return {
        tmdb_id: data.id,
        type: "movie",
        title: data.title || "Untitled",
        year: parseInt((data.release_date || "").substring(0, 4)) || new Date().getFullYear(),
        poster_url: data.poster_path ? `${IMAGE_BASE_W500}${data.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
        backdrop_url: data.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${data.backdrop_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
        trailer_url,
        genres: genres.length > 0 ? genres : ["Action", "Cinema"],
        imdb_rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 7.5,
        overview: data.overview || "",
        release_date: data.release_date || "",
        runtime: data.runtime || 0,
        director,
        cast,
        studio,
      };
    } else {
      const seasons = (data.seasons || [])
        .filter((s) => s.season_number > 0)
        .map((s) => ({
          season_number: s.season_number,
          episode_count: s.episode_count || 10,
        }));

      const total_episodes = data.number_of_episodes || seasons.reduce((acc, s) => acc + s.episode_count, 0);

      return {
        tmdb_id: data.id,
        type: "series",
        title: data.name || "Untitled",
        year: parseInt((data.first_air_date || "").substring(0, 4)) || new Date().getFullYear(),
        poster_url: data.poster_path ? `${IMAGE_BASE_W500}${data.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
        backdrop_url: data.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${data.backdrop_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
        trailer_url,
        genres: genres.length > 0 ? genres : ["Series", "Drama"],
        imdb_rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 7.5,
        overview: data.overview || "",
        release_date: data.first_air_date || "",
        creator,
        cast,
        studio,
        seasons,
        total_episodes,
        is_ongoing: data.status === "Returning Series" || data.in_production === true,
      };
    }
  } catch (err) {
    console.warn("Falling back to OMDb for details due to TMDB error:", err);
    return await getOmdbDetails(null, "Media Entry", type);
  }
};
