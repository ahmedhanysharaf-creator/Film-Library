import sys
import os
import urllib.parse
import subprocess
import json
import shutil
from pathlib import Path

# Config file path for shared secret security token
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".filmlibrary_companion.json")

def load_config():
    """Load companion configuration (shared secret token)."""
    default_config = {
        "token": "FILM_LIBRARY_SECRET_2026",
        "vlc_path": find_vlc_path()
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
    return "vlc"  # Fallback to PATH lookup

def handle_uri(uri_string):
    """
    Parses filmlibrary:// protocol URI and launches VLC.
    Example URIs:
    filmlibrary://open?path=D%3A%5CMovies%5CInception.mkv&token=FILM_LIBRARY_SECRET_2026
    """
    print(f"Processing URI: {uri_string}")
    parsed = urllib.parse.urlparse(uri_string)
    
    # Extract query params
    query_params = urllib.parse.parse_qs(parsed.query)
    
    file_path = query_params.get("path", [""])[0]
    sub_path = query_params.get("sub", [""])[0]
    token = query_params.get("token", [""])[0]
    
    config = load_config()
    expected_token = config.get("token", "")
    
    # Token Security Check
    if expected_token and token and token != expected_token:
        print(f"SECURITY ERROR: Invalid token received ('{token}'). Expected ('{expected_token}').")
        show_alert("Film Library Error", "Access Denied: Invalid Security Token.")
        return False
        
    if not file_path:
        print("ERROR: No file path provided in URI.")
        show_alert("Film Library Error", "No file path specified.")
        return False
        
    file_path = urllib.parse.unquote(file_path)
    if sub_path:
        sub_path = urllib.parse.unquote(sub_path)

    print(f"Opening local media file: {file_path}")
    
    vlc_cmd = config.get("vlc_path", "vlc")
    
    vlc_args = [vlc_cmd, file_path]
    if sub_path and os.path.exists(sub_path):
        vlc_args.append(f"--sub-file={sub_path}")
    else:
        dir_name = os.path.dirname(file_path)
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        for ext in [".srt", ".ass", ".vtt", ".sub"]:
            cand = os.path.join(dir_name, f"{base_name}{ext}")
            if os.path.exists(cand):
                vlc_args.append(f"--sub-file={cand}")
                break

    try:
        # Launch VLC without blocking Python process
        subprocess.Popen(vlc_args)
        print("VLC launched successfully!")
        return True
    except FileNotFoundError:
        # Fallback to default system handler if vlc executable path not found
        print("VLC executable not found. Opening with system default player...")
        try:
            os.startfile(file_path)
            return True
        except Exception as e:
            print(f"Failed to open file: {e}")
            show_alert("Film Library Error", f"Failed to launch player: {e}")
            return False
    except Exception as e:
        print(f"Error launching VLC: {e}")
        show_alert("Film Library Error", f"Error launching VLC: {e}")
        return False

def show_alert(title, text):
    """Simple Windows message box popup fallback."""
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x10 | 0x0)
    except Exception:
        pass

def main():
    config = load_config()
    print("==========================================")
    print("  Film Library Companion App (Windows)   ")
    print("==========================================")
    print(f"Config File: {CONFIG_FILE}")
    print(f"VLC Executable Path: {config.get('vlc_path')}")
    print(f"Active Security Token: {config.get('token')}")
    print("==========================================")
    
    if len(sys.argv) > 1:
        raw_uri = sys.argv[1]
        handle_uri(raw_uri)
    else:
        print("\nCompanion running. Waiting for filmlibrary:// protocol commands...")
        print("To register the protocol in registry, run: python register_protocol.py")

if __name__ == "__main__":
    main()
