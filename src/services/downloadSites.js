// Download Sites Service: Storage & Preset Management

const LOCAL_STORAGE_KEY = "filmlibrary_download_sites";

export const DEFAULT_DOWNLOAD_SITES = [
  {
    id: "yts",
    name: "YTS (YIFY)",
    url: "https://yts.mx",
    searchUrl: "https://yts.mx/browse-movies/{query}/all/all/0/latest/0/all",
    category: "Torrents",
    quality: "1080p / 4K",
    description: "Official home of YIFY high quality movies in small file sizes (x264/x265).",
    color: "#46d369",
    isPinned: true
  },
  {
    id: "1337x",
    name: "1337x",
    url: "https://1337x.to",
    searchUrl: "https://1337x.to/search/{query}/1/",
    category: "Torrents",
    quality: "Movies & Series",
    description: "Popular verified torrent directory for both movies, TV shows, and anime.",
    color: "#e50914",
    isPinned: true
  },
  {
    id: "torrenting",
    name: "Torrenting",
    url: "https://torrenting.com",
    searchUrl: "https://torrenting.com/browse.php?search={query}",
    category: "Torrents",
    quality: "VIP / Private",
    description: "Fast private/semi-private tracker with fresh scene releases and web rips.",
    color: "#3b82f6",
    isPinned: true
  },
  {
    id: "flixbaba",
    name: "Flixbaba",
    url: "https://flixbaba.com",
    searchUrl: "https://flixbaba.com/search/{query}",
    category: "Streaming",
    quality: "Online & Fast",
    description: "Online movie and series streaming portal with fast player servers.",
    color: "#f59e0b",
    isPinned: false
  },
  {
    id: "psarips",
    name: "PSArips",
    url: "https://psa.wf",
    searchUrl: "https://psa.wf/?s={query}",
    category: "Direct Download",
    quality: "x265 HEVC 10bit",
    description: "Ultra high efficiency 10-bit HEVC encodes for movies and TV series.",
    color: "#8b5cf6",
    isPinned: false
  },
  {
    id: "subdl",
    name: "SubDL Subtitles",
    url: "https://subdl.com",
    searchUrl: "https://subdl.com/search/{query}",
    category: "Subtitles",
    quality: "Arabic & Multi-lang",
    description: "Fastest subtitle search and download engine for movie & TV releases.",
    color: "#06b6d4",
    isPinned: false
  }
];

export const CATEGORIES = [
  "All",
  "Torrents",
  "Direct Download",
  "Streaming",
  "Telegram",
  "Subtitles",
  "Other"
];

// Load download sites from storage
export const getDownloadSites = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load download sites:", e);
  }

  // If first time, initialize with defaults
  saveDownloadSites(DEFAULT_DOWNLOAD_SITES);
  return DEFAULT_DOWNLOAD_SITES;
};

// Save download sites to storage
export const saveDownloadSites = (sitesList) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sitesList));
  } catch (e) {
    console.error("Failed to save download sites:", e);
  }
};

// Add a new download site
export const addDownloadSite = (siteData) => {
  const sites = getDownloadSites();
  const newSite = {
    id: siteData.id || `site_${Date.now()}`,
    name: (siteData.name || "").trim(),
    url: (siteData.url || "").trim(),
    searchUrl: (siteData.searchUrl || "").trim(),
    category: siteData.category || "Torrents",
    quality: (siteData.quality || "General").trim(),
    description: (siteData.description || "").trim(),
    color: siteData.color || "#e50914",
    isPinned: Boolean(siteData.isPinned),
    createdAt: new Date().toISOString()
  };

  const updated = [newSite, ...sites];
  saveDownloadSites(updated);
  return updated;
};

// Update an existing download site
export const updateDownloadSite = (id, updatedData) => {
  const sites = getDownloadSites();
  const updated = sites.map((s) => (s.id === id ? { ...s, ...updatedData } : s));
  saveDownloadSites(updated);
  return updated;
};

// Delete a download site
export const deleteDownloadSite = (id) => {
  const sites = getDownloadSites();
  const updated = sites.filter((s) => s.id !== id);
  saveDownloadSites(updated);
  return updated;
};

// Reset to default sites
export const resetDefaultDownloadSites = () => {
  saveDownloadSites(DEFAULT_DOWNLOAD_SITES);
  return DEFAULT_DOWNLOAD_SITES;
};

// Generate direct search link for a site given a movie/series query
export const getSiteSearchLink = (site, query) => {
  if (!query || !query.trim()) {
    return site.url;
  }
  const cleanQuery = encodeURIComponent(query.trim());
  if (site.searchUrl && site.searchUrl.includes("{query}")) {
    return site.searchUrl.replace("{query}", cleanQuery);
  }
  if (site.searchUrl) {
    return `${site.searchUrl}${cleanQuery}`;
  }
  // Fallback: Google search targeted to the site
  return `https://www.google.com/search?q=site:${encodeURIComponent(site.url.replace(/^https?:\/\//, ''))}+${cleanQuery}`;
};
