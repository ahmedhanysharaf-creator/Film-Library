import { db, isFirebaseConfigured } from "./firebase";
import { autoSyncIfConnected } from "./folderSync";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query, 
  where,
  serverTimestamp 
} from "firebase/firestore";

// Seed sample data for local storage mode
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

export const getLocalLibrary = () => {
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

export const saveLocalLibrary = (items) => {
  localStorage.setItem(LOCAL_STORAGE_LIB_KEY, JSON.stringify(items));
  autoSyncIfConnected(items);
};

/**
 * Fetch all library items with GUARANTEED HYBRID PERSISTENCE
 * Combines LocalStorage + Firestore so refreshing NEVER wipes items!
 */
export const fetchLibraryItems = async () => {
  const localItems = getLocalLibrary();
  let firestoreItems = [];

  if (isFirebaseConfigured() && db) {
    try {
      const firestorePromise = getDocs(collection(db, "library"));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firestore timeout")), 2000)
      );
      const querySnapshot = await Promise.race([firestorePromise, timeoutPromise]);
      querySnapshot.forEach((docSnap) => {
        firestoreItems.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (err) {
      console.warn("[Firestore fetch warning]: using persistent local library fallback", err);
    }
  }

  // Merge Firestore items and LocalStorage items by tmdb_id/title
  const mergedMap = new Map();
  localItems.forEach((item) => {
    const key = item.tmdb_id || item.title;
    mergedMap.set(key, item);
  });

  firestoreItems.forEach((item) => {
    const key = item.tmdb_id || item.title;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      const combinedPaths = [...(existing.user_paths || [])];
      (item.user_paths || []).forEach((up) => {
        if (!combinedPaths.some((p) => p.uid === up.uid)) {
          combinedPaths.push(up);
        }
      });
      mergedMap.set(key, { ...existing, ...item, user_paths: combinedPaths });
    } else {
      mergedMap.set(key, item);
    }
  });

  const finalItems = Array.from(mergedMap.values());
  saveLocalLibrary(finalItems);
  return finalItems;
};

/**
 * Save or Merge Single Media Entry into Library
 */
export const saveMediaEntry = async (mediaData, currentUser) => {
  const allItems = await fetchLibraryItems();
  const existingIndex = allItems.findIndex((item) => 
    (mediaData.id && item.id === mediaData.id) ||
    (mediaData.tmdb_id && item.tmdb_id === mediaData.tmdb_id) ||
    (item.title && mediaData.title && item.title.toLowerCase() === mediaData.title.toLowerCase())
  );

  const userPathObj = {
    uid: currentUser.uid,
    display_name: currentUser.displayName || currentUser.email.split("@")[0],
    paths: mediaData.new_paths || { default: mediaData.default_path || "" }
  };

  let savedItem = null;

  if (existingIndex >= 0) {
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

    allItems[existingIndex] = updatedDocData;
    savedItem = updatedDocData;

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, "library", existing.id);
        await updateDoc(docRef, updatedDocData);
      } catch (e) {}
    }
  } else {
    const newDocData = {
      ...mediaData,
      user_paths: [userPathObj],
      user_progress: mediaData.user_progress || {},
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    delete newDocData.new_paths;
    delete newDocData.default_path;

    const newEntry = { id: `local_${Date.now()}_${Math.random()}`, ...newDocData };
    allItems.unshift(newEntry);
    savedItem = newEntry;

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = await addDoc(collection(db, "library"), newDocData);
        savedItem.id = docRef.id;
      } catch (e) {}
    }
  }

  saveLocalLibrary(allItems);
  autoSyncIfConnected(allItems);
  return savedItem;
};

/**
 * Non-blocking Super-Fast Batch Save
 * Always updates LocalStorage FIRST so it NEVER hangs, with background Firestore sync
 */
export const saveMediaEntriesBatch = async (mediaDataList, currentUser, onProgress) => {
  if (!mediaDataList || mediaDataList.length === 0) return 0;

  const allItems = await fetchLibraryItems();
  const total = mediaDataList.length;

  const useFirestore = isFirebaseConfigured() && db;
  let batch = useFirestore ? writeBatch(db) : null;
  let savedCount = 0;

  for (let i = 0; i < total; i++) {
    const mediaData = mediaDataList[i];
    const existingIndex = allItems.findIndex((item) => item.tmdb_id === mediaData.tmdb_id);

    const userPathObj = {
      uid: currentUser.uid,
      display_name: currentUser.displayName || currentUser.email.split("@")[0],
      paths: mediaData.new_paths || { default: mediaData.default_path || "" }
    };

    if (existingIndex >= 0) {
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

      if (useFirestore && batch) {
        const docRef = doc(db, "library", existing.id || `doc_${i}`);
        batch.set(docRef, updatedDocData, { merge: true });
      }

      allItems[existingIndex] = updatedDocData;
    } else {
      const newDocData = {
        ...mediaData,
        user_paths: [userPathObj],
        user_progress: mediaData.user_progress || {},
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      delete newDocData.new_paths;
      delete newDocData.default_path;

      if (useFirestore && batch) {
        const newDocRef = doc(collection(db, "library"));
        batch.set(newDocRef, newDocData);
        allItems.unshift({ id: newDocRef.id, ...newDocData });
      } else {
        const newEntry = { id: `local_${Date.now()}_${i}`, ...newDocData };
        allItems.unshift(newEntry);
      }
    }

    savedCount++;
    const pct = Math.round(((i + 1) / total) * 100);
    if (onProgress) {
      onProgress(i + 1, total, mediaData.title, pct);
    }
  }

  // 1. ALWAYS persist to LocalStorage FIRST so refreshing never loses data
  saveLocalLibrary(allItems);
  autoSyncIfConnected(allItems);

  // 2. Non-blocking Firestore background commit with 2-second timeout ceiling
  if (useFirestore && batch) {
    try {
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Commit timeout")), 2000)
      );
      await Promise.race([commitPromise, timeoutPromise]);
    } catch (e) {
      console.warn("Firestore batch commit timed out or warning, saved locally:", e);
    }
  }

  return savedCount;
};

/**
 * Delete single media item from Library
 */
export const deleteMediaEntry = async (itemId) => {
  const items = getLocalLibrary().filter((item) => item.id !== itemId && item.tmdb_id?.toString() !== itemId?.toString());
  saveLocalLibrary(items);

  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, "library", itemId));
    } catch (e) {}
  }
};

/**
 * Mass Delete Media Entries from Library (Batch operation)
 */
export const deleteMediaEntriesBatch = async (itemIds) => {
  if (!itemIds || itemIds.length === 0) return 0;
  const idSet = new Set(itemIds.map((id) => id?.toString()));

  // 1. Clean LocalStorage in one single pass
  const localItems = getLocalLibrary();
  const remainingLocal = localItems.filter((item) => {
    const itemIdStr = item.id?.toString();
    const tmdbIdStr = item.tmdb_id?.toString();
    return !idSet.has(itemIdStr) && !idSet.has(tmdbIdStr);
  });
  saveLocalLibrary(remainingLocal);

  // 2. Batch Delete in Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const batch = writeBatch(db);
      itemIds.forEach((id) => {
        if (id && !id.toString().startsWith("local_")) {
          const docRef = doc(db, "library", id.toString());
          batch.delete(docRef);
        }
      });
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Delete batch timeout")), 2000)
      );
      await Promise.race([commitPromise, timeoutPromise]);
    } catch (e) {
      console.warn("Firestore batch delete timeout or warning:", e);
    }
  }

  return itemIds.length;
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

  target.user_progress = updatedProgress;
  saveLocalLibrary(items);

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "library", itemId);
      await updateDoc(docRef, { user_progress: updatedProgress });
    } catch (e) {}
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
    try {
      await setDoc(doc(doc(db, "allowed_users", cleanEmail)), userData);
    } catch (e) {}
  }

  const users = await fetchAllowedUsers();
  if (!users.some((u) => u.email === cleanEmail)) {
    users.push(userData);
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  }
  return userData;
};

export const removeAllowedUser = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  const users = (await fetchAllowedUsers()).filter((u) => u.email !== cleanEmail);
  localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));

  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, "allowed_users", cleanEmail));
    } catch (e) {}
  }
};
