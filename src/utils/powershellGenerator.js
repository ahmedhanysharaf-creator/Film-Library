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

/**
 * Analyzes Python code parts to determine how the script expects CLI arguments:
 * - 'named_folder': uses argparse with '--folder' / '-f'
 * - 'named_dir': uses argparse with '--dir' / '-d'
 * - 'named_path': uses argparse with '--path' / '-p'
 * - 'named_target': uses argparse with '--target'
 * - 'positional': uses sys.argv[1] or argparse positional argument without '--folder'
 * - 'none': does not accept CLI arguments (uses baked TARGET_DIR or runs in current folder)
 */
export function detectScriptCliFormat(parts = []) {
  if (!parts || parts.length === 0) {
    return {
      folderStyle: "positional",
      styleLabel: 'Direct Path: "path"',
      supportsMode: false,
      supportsExecute: false,
      hasSysArgv: false,
      hasArgparse: false
    };
  }

  const combinedCode = parts.map((p) => p.code || "").join("\n");
  const codeLower = combinedCode.toLowerCase();

  const hasArgparse = codeLower.includes("argparse");
  const hasSysArgv = codeLower.includes("sys.argv");

  const hasFolderFlag = /--folder|-f\b|'--folder'|"--folder"|'-f'|"-f"/.test(combinedCode);
  const hasDirFlag = /--dir|-d\b|'--dir'|"--dir"|'-d'|"-d"/.test(combinedCode);
  const hasPathFlag = /--path|-p\b|'--path'|"--path"|'-p'|"-p"/.test(combinedCode);
  const hasTargetFlag = /--target|'--target'|"--target"/.test(combinedCode);

  const hasModeFlag = /--mode|-m\b|'--mode'|"--mode"/.test(combinedCode);
  const hasExecuteFlag = /--execute|-e\b|'--execute'|"--execute"/.test(combinedCode);
  const hasDryRunFlag = /--dry-run|--dryrun|'--dry-run'|"--dry-run"/.test(combinedCode);

  let folderStyle = "positional"; // default to direct path for standalone scripts

  if (hasFolderFlag) {
    folderStyle = "named_folder";
  } else if (hasDirFlag) {
    folderStyle = "named_dir";
  } else if (hasPathFlag) {
    folderStyle = "named_path";
  } else if (hasTargetFlag) {
    folderStyle = "named_target";
  } else if (hasSysArgv) {
    // If the script checks sys.argv directly without named flag checks (e.g. Path(sys.argv[1]))
    folderStyle = "positional";
  } else if (hasArgparse) {
    folderStyle = /add_argument\(\s*['"][^-\s]/.test(combinedCode) ? "positional" : "named_folder";
  } else {
    folderStyle = "positional";
  }

  const styleLabels = {
    named_folder: '--folder "path"',
    named_dir: '--dir "path"',
    named_path: '--path "path"',
    named_target: '--target "path"',
    positional: 'Direct Path: "path"',
    none: "In Current Folder (No arg)"
  };

  return {
    folderStyle,
    styleLabel: styleLabels[folderStyle] || 'Direct Path: "path"',
    supportsMode: hasModeFlag,
    supportsExecute: hasExecuteFlag,
    supportsDryRun: hasDryRunFlag,
    hasArgparse,
    hasSysArgv
  };
}

export function generatePowerShellCommands(renamer, targetPath = "", options = {}) {
  const {
    dryRun = true,
    showName = "",
    scriptsFolder = "",
    customMode = "",
    includeMode = false,
    folderArgStyle = "auto"
  } = options;

  const cleanPath = targetPath.trim();
  const parts = renamer?.parts || [];

  if (parts.length === 0) {
    return {
      powershellShortCommand: "# No code parts available",
      powershellScript: "# No code parts available",
      pythonStandaloneFiles: [],
      detectedCli: { folderStyle: "positional", styleLabel: 'Direct Path: "path"' }
    };
  }

  const detectedCli = detectScriptCliFormat(parts);
  const activeFolderStyle = folderArgStyle && folderArgStyle !== "auto" ? folderArgStyle : detectedCli.folderStyle;

  // 1. Prepare Python Standalone Files with injected path & flags
  const pythonPath = cleanPath || "<TARGET_FOLDER>";
  const pythonStandaloneFiles = parts.map((part, idx) => {
    let code = part.code || "";
    // Inject UTF-8 output encoding safeguard for Windows stdout if missing
    if (!code.includes("sys.stdout.reconfigure") && !code.includes("PYTHONIOENCODING")) {
      const utf8Snippet = `import sys\nif sys.platform == "win32":\n    try:\n        sys.stdout.reconfigure(encoding="utf-8", errors="replace")\n        sys.stderr.reconfigure(encoding="utf-8", errors="replace")\n    except Exception:\n        pass\n\n`;
      code = utf8Snippet + code;
    }

    code = code.replace(/TARGET_DIR\s*=\s*r?["'].*?["']/, `TARGET_DIR = r"${pythonPath}"`);
    code = code.replace(/\{TARGET_DIR\}/g, pythonPath.replace(/\\/g, "\\\\"));

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

  // 2. Build the folder argument based on chosen / detected style
  let folderArg = "";
  const displayPath = cleanPath || (activeFolderStyle !== "none" ? "<TARGET_FOLDER>" : "");

  if (displayPath) {
    if (activeFolderStyle === "named_folder") {
      folderArg = ` --folder "${displayPath}"`;
    } else if (activeFolderStyle === "named_dir") {
      folderArg = ` --dir "${displayPath}"`;
    } else if (activeFolderStyle === "named_path") {
      folderArg = ` --path "${displayPath}"`;
    } else if (activeFolderStyle === "named_target") {
      folderArg = ` --target "${displayPath}"`;
    } else if (activeFolderStyle === "positional") {
      folderArg = ` "${displayPath}"`;
    } else if (activeFolderStyle === "none") {
      folderArg = "";
    } else {
      folderArg = ` "${displayPath}"`;
    }
  }

  // Mode argument: only included if includeMode is explicitly true or customMode is provided
  const hasMode = includeMode || Boolean(customMode && customMode.trim());
  const mode = customMode.trim() || categoryToMode(renamer?.category);
  const modeArg = hasMode && mode ? ` --mode ${mode}` : "";

  // Execute flag: only added if user requested live rename AND (script supports it or not pure sys.argv positional)
  const executeFlag = dryRun ? "" : (detectedCli.supportsExecute || !detectedCli.hasSysArgv ? " --execute" : "");
  const showArg = showName ? ` --show-name "${showName}"` : "";

  let scriptTarget = "main.py";
  const trimmedScriptDir = scriptsFolder.trim().replace(/[\\/]+$/, "");

  if (parts.length === 1) {
    const singleName = pythonStandaloneFiles[0].name || "renamer.py";
    scriptTarget = trimmedScriptDir ? `"${trimmedScriptDir}\\${singleName}"` : `"${singleName}"`;
  } else {
    scriptTarget = trimmedScriptDir ? `"${trimmedScriptDir}\\main.py"` : `main.py`;
  }

  // Use -X utf8 to prevent Windows PowerShell charmap/cp1252 UnicodeEncodeError
  const powershellShortCommand = `python -X utf8 ${scriptTarget}${folderArg}${modeArg}${executeFlag}${showArg}`.replace(/\s+/g, " ").trim();

  // 3. Complete clean .ps1 script block
  let ps1File = `# Film Library Renamer - ${renamer.name}\n`;
  if (displayPath) {
    ps1File += `# Target Folder: "${displayPath}"\n`;
  }
  if (hasMode && mode) {
    ps1File += `# Mode: ${mode}\n`;
  }
  ps1File += `# ${dryRun ? "DRY RUN (preview only — files will NOT be renamed)" : "LIVE RENAME (--execute flag is ON)"}\n\n`;
  ps1File += `${powershellShortCommand}\n`;

  return {
    powershellShortCommand,
    powershellScript: ps1File,
    pythonStandaloneFiles,
    detectedCli
  };
}
