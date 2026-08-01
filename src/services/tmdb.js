/**
 * TMDB (The Movie Database) API v3 Wrapper Service
 */

// Active TMDB API keys with fallback key rotation
const WORKING_KEYS = [
  "328c283cd27bd1877d9080ccb1604c91",
  "b992167d3fe4082260662d5d83f2a893",
  "52a8b36961496270fa672a06289a24ec"
];

let currentKeyIndex = 0;

export const getTmdbApiKey = () => {
  const customKey = localStorage.getItem("tmdb_api_key") || import.meta.env.VITE_TMDB_API_KEY;
  if (customKey) return customKey;
  return WORKING_KEYS[currentKeyIndex % WORKING_KEYS.length];
};

export const rotateTmdbApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % WORKING_KEYS.length;
};

export const setTmdbApiKey = (key) => {
  if (key) {
    localStorage.setItem("tmdb_api_key", key);
  } else {
    localStorage.removeItem("tmdb_api_key");
  }
};

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_W500 = "https://image.tmdb.org/t/p/w500";
const IMAGE_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

/**
 * Search TMDB for movies and TV series with year filtering support
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
    
    if (!res.ok) throw new Error(`TMDB search failed HTTP ${res.status}`);
    const data = await res.json();

    let results = (data.results || []).filter(
      (item) => item.media_type === "movie" || item.media_type === "tv"
    );

    // If year filtering returned 0 results, retry without year filter
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

    return results.map((item) => ({
      tmdb_id: item.id,
      type: item.media_type === "tv" ? "series" : "movie",
      title: item.title || item.name || "Untitled",
      year: parseInt((item.release_date || item.first_air_date || "").substring(0, 4)) || null,
      poster_url: item.poster_path ? `${IMAGE_BASE_W500}${item.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
      backdrop_url: item.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${item.backdrop_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
      overview: item.overview || "",
      imdb_rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
    }));
  } catch (err) {
    console.error("[TMDB Search Error]:", err);
    return [];
  }
};

/**
 * Fetch detailed metadata for a Movie or TV Series by TMDB ID
 */
export const getTmdbDetails = async (tmdbId, type = "movie") => {
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

    // Extract Top 6 Cast
    const cast = (data.credits?.cast || []).slice(0, 6).map((c) => ({
      name: c.name,
      character: c.character || "",
    }));

    // Extract Director (for movies) or Creator (for series)
    let director = "";
    let creator = "";
    if (endpointType === "movie") {
      const dirObj = (data.credits?.crew || []).find((c) => c.job === "Director");
      director = dirObj ? dirObj.name : "";
    } else {
      creator = (data.created_by || []).map((c) => c.name).join(", ");
    }

    // Extract Studio / Production Companies
    const studio = (data.production_companies || []).map((p) => p.name).join(", ");

    // Extract Genres
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
    console.error("[TMDB Fetch Details Error]:", err);
    throw err;
  }
};
