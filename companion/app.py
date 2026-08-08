import sys
import os
import urllib.parse
import subprocess
import json
import shutil
import re
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Config file path for shared secret security token
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".filmlibrary_companion.json")
DEFAULT_PLAYLISTS_DIR = os.path.join(os.path.expanduser("~"), "Film_Library_Playlists")

def load_config():
    """Load companion configuration."""
    default_config = {
        "token": "FILM_LIBRARY_SECRET_2026",
        "vlc_path": find_vlc_path(),
        "playlists_dir": DEFAULT_PLAYLISTS_DIR,
        "port": 18899
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_config.update(data)
        except Exception as e:
            print(f"Error loading config: {e}")
    else:
        save_config(default_config)
    return default_config

def save_config(config):
    """Save companion configuration."""
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")

def find_vlc_path():
    """Attempt to locate VLC executable on Windows standard paths."""
    vlc = shutil.which("vlc")
    if vlc:
        return vlc
    
    possible_paths = [
        r"C:\Program Files\VideoLAN\VLC\vlc.exe",
        r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\VLC\vlc.exe")
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return "vlc"

def sanitize_filename(name):
    """Clean filename for Windows file system safety."""
    if not name:
        return "Media"
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', name)
    clean = re.sub(r'\s+', '_', clean).strip('_')
    return clean or "Media"

def create_m3u_file(file_path, title="Media", sub_path="", save_dir="", category="Movies"):
    """
    Generates a single .m3u playlist file for an item with subtitle directives.
    Returns absolute path to generated .m3u file.
    """
    clean_title = sanitize_filename(title)
    target_dir = os.path.join(save_dir, category)
    os.makedirs(target_dir, exist_ok=True)
    
    m3u_path = os.path.join(target_dir, f"{clean_title}.m3u")
    
    content = "#EXTM3U\n"
    if sub_path and os.path.exists(sub_path):
        content += f"#EXTVLCOPT:sub-file={sub_path}\n"
        content += "#EXTVLCOPT:sub-track=0\n"
    elif file_path:
        dir_name = os.path.dirname(file_path)
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        for ext in [".srt", ".ass", ".vtt", ".sub"]:
            cand = os.path.join(dir_name, f"{base_name}{ext}")
            if os.path.exists(cand):
                content += f"#EXTVLCOPT:sub-file={cand}\n"
                content += "#EXTVLCOPT:sub-track=0\n"
                break

    content += f"#EXTINF:-1,{title}\n{file_path}\n"
    
    try:
        with open(m3u_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Created/Updated .m3u playlist: {m3u_path}")
    except Exception as e:
        print(f"Error creating .m3u file: {e}")
        
    return m3u_path

def launch_m3u_in_vlc(m3u_path, vlc_cmd="vlc"):
    """Launches VLC directly opening the target .m3u playlist file."""
    print(f"Launching VLC with M3U playlist file: {m3u_path}")
    try:
        subprocess.Popen([vlc_cmd, m3u_path])
        print("VLC launched successfully via .m3u file!")
        return True
    except FileNotFoundError:
        print("VLC executable not found. Opening .m3u with system default application...")
        try:
            os.startfile(m3u_path)
            return True
        except Exception as e:
            print(f"Failed to open .m3u file: {e}")
            show_alert("Film Library Error", f"Failed to launch player: {e}")
            return False
    except Exception as e:
        print(f"Error launching VLC: {e}")
        show_alert("Film Library Error", f"Error launching VLC: {e}")
        return False

def sync_playlists_folder(items_payload, playlists_dir):
    """
    Cleans up obsolete files and syncs all Movies and Series .m3u playlists to disk.
    """
    movies_dir = os.path.join(playlists_dir, "Movies")
    series_dir = os.path.join(playlists_dir, "Series")
    os.makedirs(movies_dir, exist_ok=True)
    os.makedirs(series_dir, exist_ok=True)

    # Clear existing .m3u files to eliminate deleted entries
    for folder in [movies_dir, series_dir]:
        for f in os.listdir(folder):
            if f.endswith(".m3u"):
                try:
                    os.remove(os.path.join(folder, f))
                except Exception:
                    pass

    master_content = "#EXTM3U\n"
    item_count = 0

    for item in items_payload:
        entries = item.get("entries", [])
        item_title = item.get("title", "Media")
        item_type = item.get("type", "movie")
        clean_title = sanitize_filename(item_title)
        
        category_dir = series_dir if item_type in ["series", "tv"] else movies_dir
        item_m3u_path = os.path.join(category_dir, f"{clean_title}.m3u")
        
        item_m3u_content = "#EXTM3U\n"
        
        for entry in entries:
            file_path = entry.get("path", "")
            sub_path = entry.get("subPath", "")
            entry_title = entry.get("title", item_title)
            
            if not file_path:
                continue
                
            if sub_path:
                item_m3u_content += f"#EXTVLCOPT:sub-file={sub_path}\n#EXTVLCOPT:sub-track=0\n"
                master_content += f"#EXTVLCOPT:sub-file={sub_path}\n#EXTVLCOPT:sub-track=0\n"
            
            item_m3u_content += f"#EXTINF:-1,{entry_title}\n{file_path}\n\n"
            master_content += f"#EXTINF:-1,{entry_title}\n{file_path}\n\n"
            item_count += 1

        try:
            with open(item_m3u_path, "w", encoding="utf-8") as f:
                f.write(item_m3u_content)
        except Exception as e:
            print(f"Error writing item m3u {item_m3u_path}: {e}")

    # Write Master Playlist file
    master_path = os.path.join(playlists_dir, "Master_Library_Playlist.m3u")
    try:
        with open(master_path, "w", encoding="utf-8") as f:
            f.write(master_content)
    except Exception as e:
        print(f"Error writing master m3u: {e}")

    print(f"Synced {len(items_payload)} items ({item_count} entries) to {playlists_dir}")
    return item_count

def handle_uri(uri_string):
    """
    Parses filmlibrary:// protocol URI and launches VLC using .m3u playlist file.
    """
    print(f"Processing URI: {uri_string}")
    parsed = urllib.parse.urlparse(uri_string)
    query_params = urllib.parse.parse_qs(parsed.query)
    
    file_path = query_params.get("path", [""])[0]
    sub_path = query_params.get("sub", [""])[0]
    title = query_params.get("title", ["Media"])[0]
    category = query_params.get("type", ["movie"])[0]
    
    file_path = urllib.parse.unquote(file_path)
    sub_path = urllib.parse.unquote(sub_path) if sub_path else ""
    title = urllib.parse.unquote(title) if title else "Media"

    config = load_config()
    cat_dir = "Series" if category in ["series", "tv"] else "Movies"
    
    m3u_path = create_m3u_file(file_path, title, sub_path, config.get("playlists_dir"), cat_dir)
    return launch_m3u_in_vlc(m3u_path, config.get("vlc_path", "vlc"))

def show_alert(title, text):
    """Simple Windows message box popup fallback."""
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x10 | 0x0)
    except Exception:
        pass

class CompanionHTTPRequestHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        config = load_config()

        if parsed.path in ["/status", "/api/status"]:
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            res = {
                "status": "ok",
                "companion": "Film Library Windows Companion",
                "playlists_dir": config.get("playlists_dir"),
                "vlc_path": config.get("vlc_path")
            }
            self.wfile.write(json.dumps(res).encode("utf-8"))

        elif parsed.path in ["/play", "/api/play"]:
            query_params = urllib.parse.parse_qs(parsed.query)
            file_path = urllib.parse.unquote(query_params.get("path", [""])[0])
            sub_path = urllib.parse.unquote(query_params.get("sub", [""])[0])
            title = urllib.parse.unquote(query_params.get("title", ["Media"])[0])
            item_type = urllib.parse.unquote(query_params.get("type", ["movie"])[0])
            
            cat_dir = "Series" if item_type in ["series", "tv"] else "Movies"
            m3u_path = create_m3u_file(file_path, title, sub_path, config.get("playlists_dir"), cat_dir)
            success = launch_m3u_in_vlc(m3u_path, config.get("vlc_path", "vlc"))
            
            self.send_response(200 if success else 500)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": success, "m3u_path": m3u_path}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        config = load_config()
        parsed = urllib.parse.urlparse(self.path)

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"

        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if parsed.path in ["/play", "/api/play"]:
            file_path = data.get("path", "")
            sub_path = data.get("subPath", "") or data.get("sub", "")
            title = data.get("title", "Media")
            item_type = data.get("type", "movie")
            
            cat_dir = "Series" if item_type in ["series", "tv"] else "Movies"
            m3u_path = create_m3u_file(file_path, title, sub_path, config.get("playlists_dir"), cat_dir)
            success = launch_m3u_in_vlc(m3u_path, config.get("vlc_path", "vlc"))

            self.send_response(200 if success else 500)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": success, "m3u_path": m3u_path}).encode("utf-8"))

        elif parsed.path in ["/sync", "/api/sync"]:
            items_payload = data.get("items", [])
            count = sync_playlists_folder(items_payload, config.get("playlists_dir"))
            
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "entries_synced": count}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def start_http_server(port=18899):
    try:
        server = HTTPServer(("127.0.0.1", port), CompanionHTTPRequestHandler)
        print(f"Local Companion HTTP Server running at http://127.0.0.1:{port}")
        server.serve_forever()
    except Exception as e:
        print(f"HTTP Server error: {e}")

def main():
    config = load_config()
    print("==========================================")
    print("  Film Library Companion App (Windows)   ")
    print("==========================================")
    print(f"Config File: {CONFIG_FILE}")
    print(f"VLC Executable Path: {config.get('vlc_path')}")
    print(f"Playlists Folder: {config.get('playlists_dir')}")
    print("==========================================")
    
    if len(sys.argv) > 1 and sys.argv[1].startswith("filmlibrary://"):
        raw_uri = sys.argv[1]
        handle_uri(raw_uri)
    else:
        # Start background server
        t = threading.Thread(target=start_http_server, args=(config.get("port", 18899),), daemon=True)
        t.start()
        print("\nCompanion server active. Waiting for website playback/sync requests...")
        print("To register the URI scheme in registry, run: python register_protocol.py")
        t.join()

if __name__ == "__main__":
    main()

