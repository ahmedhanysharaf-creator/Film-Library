import { db, isFirebaseConfigured } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp 
} from "firebase/firestore";

// Seed sample data for local storage mode so user gets a WOW experience out-of-the-box!
const INITIAL_SEED_LIBRARY = [
  {
    id: "seed_inception",
    tmdb_id: 27205,
    type: "movie",
    title: "Inception",
    year: 2010,
    poster_url: "https://image.tmdb.org/t/p/w500/ljsZTTopicFu2hR4G2m13xBLpT7.jpg",
    backdrop_url: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsR4yHAo1L.jpg",
    trailer_url: "https://www.youtube.com/watch?v=YoHD9XEInc0",
    genres: ["Action", "Science Fiction", "Adventure"],
    imdb_rating: 8.8,
    overview: "Cobb, a skilled thief who steals corporate secrets through use of dream-sharing technology, is given the inverse task of planting an idea into the mind of a C.E.O.",
    release_date: "2010-07-16",
    runtime: 148,
    director: "Christopher Nolan",
    studio: "Warner Bros. Pictures",
    cast: [
      { name: "Leonardo DiCaprio", character: "Dom Cobb" },
      { name: "Joseph Gordon-Levitt", character: "Arthur" },
      { name: "Elliot Page", character: "Ariadne" },
      { name: "Tom Hardy", character: "Eames" }
    ],
    user_paths: [
      {
        uid: "alice_uid",
        display_name: "Alice",
        paths: { default: "D:\\Movies\\Inception (2010) [1080p].mkv" }
      },
      {
        uid: "bob_uid",
        display_name: "Bob",
        paths: { default: "E:\\Cinema\\Inception.2010.BluRay.mp4" }
      }
    ],
    user_progress: {
      "demo_user_id": { status: "watched", watched_episodes: [] }
    },
    added_at: new Date().toISOString()
  },
  {
    id: "seed_breaking_bad",
    tmdb_id: 1396,
    type: "series",
    title: "Breaking Bad",
    year: 2008,
    poster_url: "https://image.tmdb.org/t/p/w500/ztSc2ma2nVoWW9ZfVd3aT8xZFiE.jpg",
    backdrop_url: "https://image.tmdb.org/t/p/original/tsRy63MuZvMuZ8StIhAgP1mN435.jpg",
    trailer_url: "https://www.youtube.com/watch?v=HhesaQXLuRY",
    genres: ["Drama", "Crime"],
    imdb_rating: 9.5,
    overview: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's financial future.",
    release_date: "2008-01-20",
    creator: "Vince Gilligan",
    studio: "Sony Pictures Television",
    cast: [
      { name: "Bryan Cranston", character: "Walter White" },
      { name: "Aaron Paul", character: "Jesse Pinkman" },
      { name: "Anna Gunn", character: "Skyler White" }
    ],
    seasons: [
      { season_number: 1, episode_count: 7 },
      { season_number: 2, episode_count: 13 }
    ],
    total_episodes: 20,
    is_ongoing: false,
    user_paths: [
      {
        uid: "alice_uid",
        display_name: "Alice",
        paths: {
          "S1E1": "D:\\Series\\Breaking Bad\\S01E01.mkv",
          "S1E2": "D:\\Series\\Breaking Bad\\S01E02.mkv"
        }
      }
    ],
    user_progress: {
      "demo_user_id": { status: "watchlist", watched_episodes: ["S1E1"] }
    },
    added_at: new Date().toISOString()
  },
  {
    id: "seed_interstellar",
    tmdb_id: 157336,
    type: "movie",
    title: "Interstellar",
    year: 2014,
    poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_url: "https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fKSuV0Sc.jpg",
    trailer_url: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    genres: ["Adventure", "Drama", "Science Fiction"],
    imdb_rating: 8.7,
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    release_date: "2014-11-05",
    runtime: 169,
    director: "Christopher Nolan",
    studio: "Paramount Pictures",
    cast: [
      { name: "Matthew McConaughey", character: "Cooper" },
      { name: "Anne Hathaway", character: "Brand" },
      { name: "Jessica Chastain", character: "Murph" }
    ],
    user_paths: [
      {
        uid: "bob_uid",
        display_name: "Bob",
        paths: { default: "E:\\Movies\\Interstellar.2014.2160p.mkv" }
      }
    ],
    user_progress: {},
    added_at: new Date().toISOString()
  }
];

const LOCAL_STORAGE_LIB_KEY = "filmlibrary_items_data";
const LOCAL_STORAGE_USERS_KEY = "filmlibrary_allowed_users_data";

// Helper: Get local storage library
const getLocalLibrary = () => {
  const data = localStorage.getItem(LOCAL_STORAGE_LIB_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_LIB_KEY, JSON.stringify(INITIAL_SEED_LIBRARY));
    return INITIAL_SEED_LIBRARY;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_SEED_LIBRARY;
  }
};

const saveLocalLibrary = (items) => {
  localStorage.setItem(LOCAL_STORAGE_LIB_KEY, JSON.stringify(items));
};

/**
 * Fetch all library items from Firestore or LocalStorage
 */
export const fetchLibraryItems = async () => {
  if (isFirebaseConfigured() && db) {
    try {
      const querySnapshot = await getDocs(collection(db, "library"));
      const items = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      return items;
    } catch (err) {
      console.error("[Firestore fetch error]:", err);
      return getLocalLibrary();
    }
  }
  return getLocalLibrary();
};

/**
 * Save or Merge Media Entry into Library
 * If tmdb_id already exists, consolidate user paths!
 */
export const saveMediaEntry = async (mediaData, currentUser) => {
  const allItems = await fetchLibraryItems();
  const existingIndex = allItems.findIndex((item) => item.tmdb_id === mediaData.tmdb_id);

  const userPathObj = {
    uid: currentUser.uid,
    display_name: currentUser.displayName || currentUser.email.split("@")[0],
    paths: mediaData.new_paths || { default: mediaData.default_path || "" }
  };

  if (existingIndex >= 0) {
    // Consolidated Single Card Update
    const existing = allItems[existingIndex];
    let updatedUserPaths = [...(existing.user_paths || [])];
    
    const userPathIndex = updatedUserPaths.findIndex((up) => up.uid === currentUser.uid);
    if (userPathIndex >= 0) {
      updatedUserPaths[userPathIndex] = userPathObj;
    } else {
      updatedUserPaths.push(userPathObj);
    }

    const updatedDocData = {
      ...existing,
      ...mediaData,
      user_paths: updatedUserPaths,
      updated_at: new Date().toISOString()
    };
    delete updatedDocData.new_paths;
    delete updatedDocData.default_path;

    if (isFirebaseConfigured() && db) {
      const docRef = doc(db, "library", existing.id);
      await updateDoc(docRef, updatedDocData);
    } else {
      allItems[existingIndex] = updatedDocData;
      saveLocalLibrary(allItems);
    }
    return updatedDocData;
  } else {
    // New Library Entry
    const newDocData = {
      ...mediaData,
      user_paths: [userPathObj],
      user_progress: mediaData.user_progress || {},
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    delete newDocData.new_paths;
    delete newDocData.default_path;

    if (isFirebaseConfigured() && db) {
      const docRef = await addDoc(collection(db, "library"), newDocData);
      return { id: docRef.id, ...newDocData };
    } else {
      const newEntry = { id: `local_${Date.now()}`, ...newDocData };
      allItems.unshift(newEntry);
      saveLocalLibrary(allItems);
      return newEntry;
    }
  }
};

/**
 * Delete media item from Library
 */
export const deleteMediaEntry = async (itemId) => {
  if (isFirebaseConfigured() && db) {
    await deleteDoc(doc(db, "library", itemId));
  } else {
    const items = getLocalLibrary().filter((item) => item.id !== itemId);
    saveLocalLibrary(items);
  }
};

/**
 * Update Personal Watch Status & Episode Progress
 */
export const updateWatchProgress = async (itemId, uid, status, watchedEpisodes = []) => {
  const items = await fetchLibraryItems();
  const target = items.find((i) => i.id === itemId);
  if (!target) return;

  const currentProgress = target.user_progress || {};
  const updatedProgress = {
    ...currentProgress,
    [uid]: {
      status,
      watched_episodes: watchedEpisodes
    }
  };

  if (isFirebaseConfigured() && db) {
    const docRef = doc(db, "library", itemId);
    await updateDoc(docRef, { user_progress: updatedProgress });
  } else {
    target.user_progress = updatedProgress;
    saveLocalLibrary(items);
  }
};

/**
 * Whitelist Management (`allowed_users`)
 */
export const fetchAllowedUsers = async () => {
  if (isFirebaseConfigured() && db) {
    try {
      const querySnapshot = await getDocs(collection(db, "allowed_users"));
      const users = [];
      querySnapshot.forEach((d) => users.push({ email: d.id, ...d.data() }));
      return users;
    } catch (err) {
      console.error("[Firestore Allowed Users Error]:", err);
    }
  }
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return [
    { email: "admin@filmlibrary.com", added_by: "Bootstrap", added_at: new Date().toISOString() }
  ];
};

export const addAllowedUser = async (email, addedBy) => {
  const cleanEmail = email.toLowerCase().trim();
  const userData = {
    email: cleanEmail,
    added_by: addedBy,
    added_at: new Date().toISOString()
  };

  if (isFirebaseConfigured() && db) {
    await setDoc(doc(db, "allowed_users", cleanEmail), userData);
  } else {
    const users = await fetchAllowedUsers();
    if (!users.some((u) => u.email === cleanEmail)) {
      users.push(userData);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    }
  }
  return userData;
};

export const removeAllowedUser = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  if (isFirebaseConfigured() && db) {
    await deleteDoc(doc(db, "allowed_users", cleanEmail));
  } else {
    const users = (await fetchAllowedUsers()).filter((u) => u.email !== cleanEmail);
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  }
};
