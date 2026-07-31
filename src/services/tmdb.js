/**
 * TMDB (The Movie Database) API v3 Wrapper Service
 */

const DEFAULT_TMDB_API_KEY = "15d2ea6d0dc1d476efbca3ecc27f2f12"; // Public demo key or custom user key

export const getTmdbApiKey = () => {
  return localStorage.getItem("tmdb_api_key") || import.meta.env.VITE_TMDB_API_KEY || DEFAULT_TMDB_API_KEY;
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
 * Search TMDB for movies and TV series
 */
export const searchTmdb = async (query) => {
  if (!query || query.trim().length < 2) return [];

  const apiKey = getTmdbApiKey();
  const url = `${BASE_URL}/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB search failed HTTP ${res.status}`);
    const data = await res.json();

    return (data.results || [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => ({
        tmdb_id: item.id,
        type: item.media_type === "tv" ? "series" : "movie",
        title: item.title || item.name || "Untitled",
        year: parseInt((item.release_date || item.first_air_date || "").substring(0, 4)) || null,
        poster_url: item.poster_path ? `${IMAGE_BASE_W500}${item.poster_path}` : null,
        backdrop_url: item.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${item.backdrop_path}` : null,
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
  const apiKey = getTmdbApiKey();
  const endpointType = type === "series" || type === "tv" ? "tv" : "movie";
  const url = `${BASE_URL}/${endpointType}/${tmdbId}?api_key=${apiKey}&append_to_response=credits,videos`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB details failed HTTP ${res.status}`);
    const data = await res.json();

    // Extract YouTube Trailer
    const videos = data.videos?.results || [];
    const trailerObj = videos.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) || videos[0];
    const trailer_url = trailerObj ? `https://www.youtube.com/watch?v=${trailerObj.key}` : "";

    // Extract Top 5 Cast
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
        poster_url: data.poster_path ? `${IMAGE_BASE_W500}${data.poster_path}` : "",
        backdrop_url: data.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${data.backdrop_path}` : "",
        trailer_url,
        genres,
        imdb_rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0,
        overview: data.overview || "",
        release_date: data.release_date || "",
        runtime: data.runtime || 0,
        director,
        cast,
        studio,
      };
    } else {
      // Series Specific Metadata
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
        poster_url: data.poster_path ? `${IMAGE_BASE_W500}${data.poster_path}` : "",
        backdrop_url: data.backdrop_path ? `${IMAGE_BASE_ORIGINAL}${data.backdrop_path}` : "",
        trailer_url,
        genres,
        imdb_rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0,
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
