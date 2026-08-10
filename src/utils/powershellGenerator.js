// PowerShell & Python Code Generator for Renamer Tool

export function generatePowerShellCommands(renamer, targetPath = "", options = {}) {
  const { dryRun = false, showName = "" } = options;
  const cleanPath = targetPath.trim() || "C:\\Media\\MyFolder";
  const escapedPath = cleanPath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const parts = renamer?.parts || [];
  if (parts.length === 0) {
    return {
      powershellScript: "# No code parts found in selected renamer preset.",
      powershellOneLiner: "# No code parts available.",
      pythonStandaloneFiles: []
    };
  }

  // 1. Process Python Code Parts with path injection
  const pythonStandaloneFiles = parts.map((part, idx) => {
    let code = part.code || "";
    // Inject TARGET_DIR path
    code = code.replace(/TARGET_DIR\s*=\s*r?["'].*?["']/, `TARGET_DIR = r"${cleanPath}"`);
    code = code.replace(/\{TARGET_DIR\}/g, cleanPath.replace(/\\/g, "\\\\"));
    
    // Inject SHOW_NAME if present
    if (showName) {
      code = code.replace(/SHOW_NAME\s*=\s*["'].*?["']/, `SHOW_NAME = "${showName}"`);
      code = code.replace(/\{SHOW_NAME\}/g, showName);
    }

    // Inject DRY_RUN flag if present
    code = code.replace(/DRY_RUN\s*=\s*(True|False)/i, `DRY_RUN = ${dryRun ? 'True' : 'False'}`);

    const safeFilename = part.name || `renamer_part_${idx + 1}.py`;
    return {
      id: part.id || `part_${idx + 1}`,
      name: safeFilename,
      code
    };
  });

  // 2. Generate Full PowerShell Script (.ps1 block)
  let scriptHeader = `# =========================================================\n`;
  scriptHeader += `# Film Library - Renamer PowerShell Script\n`;
  scriptHeader += `# Preset: ${renamer.name || 'Custom Renamer'}\n`;
  scriptHeader += `# Target Path: ${cleanPath}\n`;
  scriptHeader += `# Mode: ${dryRun ? 'DRY-RUN (Preview Only)' : 'EXECUTE RENAME'}\n`;
  scriptHeader += `# Generated: ${new Date().toLocaleString()}\n`;
  scriptHeader += `# =========================================================\n\n`;

  scriptHeader += `$TargetPath = "${cleanPath}"\n`;
  scriptHeader += `Write-Host "==========================================" -ForegroundColor Cyan\n`;
  scriptHeader += `Write-Host "  Film Library Renamer Execution Engine    " -ForegroundColor Yellow\n`;
  scriptHeader += `Write-Host "==========================================" -ForegroundColor Cyan\n`;
  scriptHeader += `Write-Host "Target Directory : $TargetPath" -ForegroundColor Green\n`;
  scriptHeader += `Write-Host "Preview Mode     : ${dryRun ? 'ENABLED' : 'DISABLED'}" -ForegroundColor ${dryRun ? 'Yellow' : 'Red'}\n\n`;

  scriptHeader += `# Check Python Installation\n`;
  scriptHeader += `if (-not (Get-Command python -ErrorAction SilentlyContinue)) {\n`;
  scriptHeader += `    Write-Host "[ERROR] Python is not installed or not in PATH! Please install Python." -ForegroundColor Red\n`;
  scriptHeader += `    exit 1\n`;
  scriptHeader += `}\n\n`;

  let scriptBody = scriptHeader;

  pythonStandaloneFiles.forEach((file, idx) => {
    scriptBody += `# --- Part ${idx + 1}: ${file.name} ---\n`;
    scriptBody += `Write-Host "Running Part ${idx + 1}: ${file.name}..." -ForegroundColor Cyan\n`;
    
    // Escaped python inline execution for PowerShell
    const inlinePyCode = file.code.replace(/"/g, '`"');
    
    scriptBody += `$PyScriptPart${idx + 1} = @"\n${file.code}\n"@\n`;
    scriptBody += `python -c $PyScriptPart${idx + 1}\n`;
    scriptBody += `if ($LASTEXITCODE -eq 0) {\n`;
    scriptBody += `    Write-Host "[SUCCESS] Part ${idx + 1} completed cleanly!" -ForegroundColor Green\n`;
    scriptBody += `} else {\n`;
    scriptBody += `    Write-Host "[WARNING] Part ${idx + 1} exited with error code $LASTEXITCODE" -ForegroundColor Red\n`;
    scriptBody += `}\n\n`;
  });

  scriptBody += `Write-Host "All renamer parts finished!" -ForegroundColor FastGreen\n`;

  // 3. Generate PowerShell One-Liner (Compact for terminal paste)
  let oneLinerCode = pythonStandaloneFiles.map(f => f.code).join("\n\n");
  // Compact single command
  const encodedPy = inlineEscapeForPowerShell(oneLinerCode);
  const powershellOneLiner = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Write-Host 'Executing Film Library Renamer...' -ForegroundColor Yellow; python -c \\"${encodedPy}\\""`;

  return {
    powershellScript: scriptBody,
    powershellOneLiner,
    pythonStandaloneFiles
  };
}

function inlineEscapeForPowerShell(pyCode) {
  return pyCode
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '; ');
}
