import sys
import os
import winreg

def register_protocol():
    """
    Registers the 'filmlibrary://' custom URI protocol scheme in the Windows Registry.
    Points to app.py / app.exe executable so clicking links like:
    filmlibrary://open?path=D:\Movies\Inception.mkv&token=SECRET123
    launches the Python companion script directly.
    """
    protocol_name = "filmlibrary"
    
    # Path to python executable or compiled app.exe
    if getattr(sys, 'frozen', False):
        exec_path = f'"{sys.executable}" "%1"'
    else:
        python_exe = sys.executable
        script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "app.py"))
        exec_path = f'"{python_exe}" "{script_path}" "%1"'

    try:
        # Open / Create HKCU\Software\Classes\filmlibrary
        key_path = f"Software\\Classes\\{protocol_name}"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValue(key, "", winreg.REG_SZ, "URL:Film Library Companion Protocol")
            winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")

        # Set shell\open\command
        cmd_path = f"{key_path}\\shell\\open\\command"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, cmd_path) as cmd_key:
            winreg.SetValue(cmd_key, "", winreg.REG_SZ, exec_path)

        print(f"Successfully registered '{protocol_name}://' protocol in Windows Registry!")
        print(f"Handler path: {exec_path}")
    except Exception as e:
        print(f"Error registering protocol: {e}")

if __name__ == "__main__":
    register_protocol()
