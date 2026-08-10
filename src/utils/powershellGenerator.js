// Clean PowerShell Command Generator for Renamer Tool

export function generatePowerShellCommands(renamer, targetPath = "", options = {}) {
  const { dryRun = false, showName = "" } = options;
  const cleanPath = targetPath.trim() || "C:\\Media\\MyFolder";
  const parts = renamer?.parts || [];

  if (parts.length === 0) {
    return {
      powershellShortCommand: '# No code parts available',
      powershellScript: '# No code parts available',
      pythonStandaloneFiles: []
    };
  }

  // 1. Prepare Python Standalone Files with injected path & flags
  const pythonStandaloneFiles = parts.map((part, idx) => {
    let code = part.code || "";
    code = code.replace(/TARGET_DIR\s*=\s*r?["'].*?["']/, `TARGET_DIR = r"${cleanPath}"`);
    code = code.replace(/\{TARGET_DIR\}/g, cleanPath.replace(/\\/g, "\\\\"));
    
    if (showName) {
      code = code.replace(/SHOW_NAME\s*=\s*["'].*?["']/, `SHOW_NAME = "${showName}"`);
      code = code.replace(/\{SHOW_NAME\}/g, showName);
    }

    code = code.replace(/DRY_RUN\s*=\s*(True|False)/i, `DRY_RUN = ${dryRun ? 'True' : 'False'}`);

    const safeFilename = part.name || `${renamer.name || 'renamer'}_part${idx + 1}.py`;
    return {
      id: part.id || `part_${idx + 1}`,
      name: safeFilename,
      code
    };
  });

  // 2. Generate Super Clean Short PowerShell Commands
  // Example: python "C:\Users\Ahmed\Downloads\Marvel Films\Marvel Movies renamer.py"
  const defaultScriptDir = "C:\\Users\\Ahmed\\Downloads\\Marvel Films";
  
  const shortCommandsList = pythonStandaloneFiles.map((file) => {
    const scriptPath = `${defaultScriptDir}\\${file.name}`;
    return `python "${scriptPath}" "${cleanPath}"`;
  });

  const powershellShortCommand = shortCommandsList.join(" ; ");

  // 3. Complete clean script block if saving to .ps1 file
  let ps1File = `# Film Library Renamer - ${renamer.name}\n`;
  ps1File += `# Target Folder: "${cleanPath}"\n`;
  ps1File += `# Dry Run: ${dryRun ? 'Enabled' : 'Disabled'}\n\n`;
  ps1File += `$TargetPath = "${cleanPath}"\n\n`;
  
  shortCommandsList.forEach((cmd, idx) => {
    ps1File += `# Step ${idx + 1}\n${cmd}\n\n`;
  });

  return {
    powershellShortCommand,
    powershellScript: ps1File,
    pythonStandaloneFiles
  };
}
