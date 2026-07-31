# 🎬 Film Library — Windows Companion App

This background companion script enables **one-click direct file launching in VLC Media Player** from the Film Library website using the custom `filmlibrary://` URI protocol.

## Quick Setup Instructions

1. **Install Dependencies**:
   ```cmd
   pip install -r requirements.txt
   ```

2. **Register URI Scheme in Windows Registry**:
   Run as Administrator or normal user:
   ```cmd
   python register_protocol.py
   ```
   This registers `filmlibrary://` in your Windows registry pointing to `app.py`.

3. **Verify Security Token**:
   The default secret token is: `FILM_LIBRARY_SECRET_2026`
   Make sure the security token set in the website's **Settings Modal** matches the token saved in `%USERPROFILE%\.filmlibrary_companion.json`.

4. **Testing Protocol Directly**:
   You can test direct opening from your browser or Windows Run dialog (`Win + R`):
   ```
   filmlibrary://open?path=D:\Movies\Sample.mkv&token=FILM_LIBRARY_SECRET_2026
   ```
