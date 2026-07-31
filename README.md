# 🎬 Film Library

A dark-themed, Netflix-inspired personal film and TV series library web application designed for sharing and managing a cloud collection of movies and TV series enriched with **TMDB** metadata, personal watch progress tracking, strict/flexible genre filtering, and a **Windows Companion App** for **1-click direct local file launching in VLC Media Player** via a custom URI scheme (`filmlibrary://`).

![Film Library](https://img.shields.io/badge/Film-Library-e50914?style=for-the-badge&logo=netflix&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Python](https://img.shields.io/badge/Python-Companion-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

## 🌟 Highlights & Architecture Solutions

1. **Zero-CORS / No Mixed-Content VLC Trigger (`filmlibrary://` Protocol)**:
   - Clicking **"Play in VLC"** on the web app triggers `window.location.href = "filmlibrary://open?path=...&token=..."`.
   - Windows routes the request directly to the local Python companion app, launching VLC without browser security or CORS blocks.

2. **Consolidated Single-Card Media Entries**:
   - Media entries are indexed by `tmdb_id`. When multiple users own the same movie, it renders as a single card showing all user paths (*"Available on Alice's PC"*, *"Available on Bob's PC"*).

3. **Multi-Episode File Path Schema for TV Series**:
   - Supports mapping individual episodes to local paths (e.g. `S1E1: "D:\Series\GoT\S01E01.mkv"`). In the detail popup modal, every episode has its own **▶ Play in VLC** button.

4. **Strict & Flexible Genre Filter Logic (`AND` / `OR`)**:
   - Toggle between **`AND`** (Strict: match all selected genres) and **`OR`** (Flexible: match any selected genre) to avoid search dead-ends.

5. **Whitelist Security Guard**:
   - Access is restricted to emails registered in the Firestore `allowed_users` collection.
   - The first user to sign in automatically gains administrator rights (Bootstrap Rule).

---

## 📁 Repository Structure

```
film-library/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx             # Brand logo, nav links, profile avatar dropdown
│   │   ├── PosterCard.jsx         # Media poster card with hover overlay & list/grid view
│   │   ├── DetailModal.jsx        # Cinematic backdrop popup modal with trailer & episode list
│   │   ├── TmdbSearchInput.jsx    # Live auto-complete TMDB search with poster previews
│   │   ├── WhitelistModal.jsx     # Whitelist email access editor
│   │   ├── SettingsModal.jsx      # Companion security token & API keys configuration
│   │   └── ToastContainer.jsx     # Bottom-right notification alert queue
│   ├── pages/
│   │   ├── Login.jsx              # Google Auth & Whitelist Guard page
│   │   ├── Home.jsx               # Dashboard homepage with hero showcase
│   │   ├── Library.jsx            # Filterable, sortable media browser
│   │   └── AddEditMedia.jsx       # Form for adding/editing items with TMDB auto-populate
│   ├── services/
│   │   ├── firebase.js            # Firebase SDK setup & configuration
│   │   ├── tmdb.js                # TMDB API v3 multi-search & details wrapper
│   │   ├── storage.js             # Firestore CRUD & local state fallback
│   │   └── vlcLauncher.js         # Custom URI protocol launcher helper
│   ├── context/
│   │   ├── AuthContext.jsx        # User state & Whitelist guard verification
│   │   └── ToastContext.jsx       # Toast alert context
│   └── styles/
│       └── main.css               # Modern HSL design tokens, Netflix styling & animations
├── companion/                     # Python Windows Companion App
│   ├── app.py                     # URI protocol handler & VLC subprocess launcher
│   ├── register_protocol.py       # Windows Registry installer for filmlibrary:// scheme
│   ├── requirements.txt           # Python dependencies
│   └── README.md                  # Setup guide for companion app
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Quick Setup Guide

### 1. Web Application

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/film-library.git
cd film-library

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

### 2. Companion Setup (Windows)

```cmd
cd companion
pip install -r requirements.txt
python register_protocol.py
```

### 3. Deploy to Vercel

```bash
npm run build
# Or connect repository directly on https://vercel.com
```

---

## 📄 License
MIT License. Created with ❤️ for personal film libraries.
