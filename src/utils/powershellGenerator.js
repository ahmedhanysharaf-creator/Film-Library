// Clean PowerShell Command Generator for Renamer Tool
//
// Correct argument format (from media_organizer CLI):
//   python main.py --folder PATH --mode {movies,series} [--execute] [--yes] [--log-dir PATH]
//
// Notes:
//   - Dry run is the DEFAULT. Just omit --execute to preview without renaming.
//   - Pass --execute only when you want to actually rename files.
//   - There is NO --dry-run flag.

// Map preset category to --mode argument value
function categoryToMode(category) {
  if (category === "series") return "series";
  return "movies"; // default for movie / subtitle / multi_part / unknown
}

export function generatePowerShellCommands(renamer, targetPath = "", options = {}) {
  const { dryRun = true, showName = "", scriptsFolder = "", customMode = "" } = options;
  const cleanPath = targetPath.trim() || "C:\\Media\\MyFolder";
  const parts = renamer?.parts || [];
  // Use the user-supplied mode if set, otherwise auto-detect from preset category
  const mode = customMode.trim() || categoryToMode(renamer?.category);

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

  // 2. Build the correct command:
  //    DRY RUN  (preview):  python "...\main.py" --folder "..." --mode movies
  //    LIVE RUN (execute):  python "...\main.py" --folder "..." --mode movies --execute
  //
  //    --execute is only added when dryRun is false.
  //    --dry-run does NOT exist as a flag.

  const scriptDir = scriptsFolder.trim() || "C:\\Users\\Ahmed\\Downloads\\MediaOrganizerTool";

  const folderArg = `--folder "${cleanPath}"`;
  const modeArg = `--mode ${mode}`;
  const executeFlag = dryRun ? "" : " --execute";  // omit for dry run, add for live
  const showArg = showName ? ` --show-name "${showName}"` : "";

  let powershellShortCommand;

  if (parts.length === 1) {
    // Single script — call it directly
    const scriptName = pythonStandaloneFiles[0].name;
    powershellShortCommand = `python "${scriptDir}\\${scriptName}" ${folderArg} ${modeArg}${executeFlag}${showArg}`;
  } else {
    // Multi-part pipeline — call main.py as orchestrator
    powershellShortCommand = `python "${scriptDir}\\main.py" ${folderArg} ${modeArg}${executeFlag}${showArg}`;
  }

  // 3. Complete clean .ps1 script block
  let ps1File = `# Film Library Renamer - ${renamer.name}\n`;
  ps1File += `# Target Folder: "${cleanPath}"\n`;
  ps1File += `# Mode: ${mode}\n`;
  ps1File += `# ${dryRun ? "DRY RUN (preview only — files will NOT be renamed)" : "LIVE RENAME (--execute flag is ON)"}\n\n`;
  ps1File += `${powershellShortCommand}\n`;

  return {
    powershellShortCommand,
    powershellScript: ps1File,
    pythonStandaloneFiles
  };
}
