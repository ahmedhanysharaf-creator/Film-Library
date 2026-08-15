// Clean PowerShell Command Generator for Renamer Tool

// Map preset category to --mode argument value
function categoryToMode(category) {
  if (category === "series") return "series";
  if (category === "subtitle") return "subtitles";
  return "movies"; // default for movie / multi_part / unknown
}

export function generatePowerShellCommands(renamer, targetPath = "", options = {}) {
  const { dryRun = false, showName = "", scriptsFolder = "" } = options;
  const cleanPath = targetPath.trim() || "C:\\Media\\MyFolder";
  const parts = renamer?.parts || [];
  const mode = categoryToMode(renamer?.category);

  if (parts.length === 0) {
    return {
      powershellShortCommand: "# No code parts available",
      powershellScript: "# No code parts available",
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

    code = code.replace(/DRY_RUN\s*=\s*(True|False)/i, `DRY_RUN = ${dryRun ? "True" : "False"}`);

    const safeFilename = part.name || `${renamer.name || "renamer"}_part${idx + 1}.py`;
    return {
      id: part.id || `part_${idx + 1}`,
      name: safeFilename,
      code
    };
  });

  // 2. Build the short command in the correct format:
  //    python main.py --folder "C:\path\to\media" --mode movies --execute
  //    (or --dry-run instead of --execute when dry run is enabled)
  const scriptDir = scriptsFolder.trim() || "C:\\Users\\Ahmed\\Downloads\\MyRenamerScripts";

  // For single-part presets, run the script directly.
  // For multi-part presets, use main.py as the orchestrator (first file named main.py or fallback to all).
  let powershellShortCommand;

  if (parts.length === 1) {
    // Single script — call it directly with the new argument style
    const scriptName = pythonStandaloneFiles[0].name;
    const runFlag = dryRun ? "--dry-run" : "--execute";
    const modeArg = `--mode ${mode}`;
    const folderArg = `--folder "${cleanPath}"`;
    const showArg = showName ? ` --show-name "${showName}"` : "";
    powershellShortCommand = `python "${scriptDir}\\${scriptName}" ${folderArg} ${modeArg} ${runFlag}${showArg}`;
  } else {
    // Multi-part pipeline — call main.py (the orchestrator entry point)
    const runFlag = dryRun ? "--dry-run" : "--execute";
    const modeArg = `--mode ${mode}`;
    const folderArg = `--folder "${cleanPath}"`;
    const showArg = showName ? ` --show-name "${showName}"` : "";
    powershellShortCommand = `python "${scriptDir}\\main.py" ${folderArg} ${modeArg} ${runFlag}${showArg}`;
  }

  // 3. Complete clean .ps1 script block
  let ps1File = `# Film Library Renamer - ${renamer.name}\n`;
  ps1File += `# Target Folder: "${cleanPath}"\n`;
  ps1File += `# Mode: ${mode}\n`;
  ps1File += `# Dry Run: ${dryRun ? "Enabled (preview only)" : "Disabled (LIVE rename)"}\n\n`;
  ps1File += `${powershellShortCommand}\n`;

  return {
    powershellShortCommand,
    powershellScript: ps1File,
    pythonStandaloneFiles
  };
}
