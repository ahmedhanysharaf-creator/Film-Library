import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Folder,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Layers,
  Code,
  FileText,
  Tv,
  Film,
  FolderSearch,
  RotateCcw,
  UploadCloud,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  FileCheck,
  Sliders,
  Settings2,
  Tag,
  HelpCircle,
  FileCode,
  FolderSync
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { getRenamerCodes, saveRenamerCode, deleteRenamerCode, resetRenamerPresetsToDefault, DEFAULT_RENAMER_PRESETS } from "../services/renamerStorage";
import {
  detectCodeFormat,
  transformFilenamePreview,
  getFormatTokensBlueprint,
  updatePythonCodeFormat,
  COMMON_FORMAT_PRESETS
} from "../utils/codeDetector";
import { generatePowerShellCommands } from "../utils/powershellGenerator";
import JSZip from "jszip";

export const Renamer = () => {
  const { addToast } = useToast();

  const [codes, setCodes] = useState(DEFAULT_RENAMER_PRESETS);
  const [selectedCodeId, setSelectedCodeId] = useState(DEFAULT_RENAMER_PRESETS[0]?.id || "preset_movie_standard");
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(false);

  // File explorer hidden inputs refs
  const headerFileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const pythonFolderInputRef = useRef(null);
  const commandTemplateRef = useRef(null);

  const RENAMER_INPUTS_KEY = "filmlibrary_renamer_inputs_v2";

  const loadSavedInputs = () => {
    try {
      const raw = localStorage.getItem(RENAMER_INPUTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const initialInputs = useRef(loadSavedInputs()).current;

  // PowerShell Generator parameters (persisted automatically across all code and preset changes)
  const [targetPath, setTargetPath] = useState(initialInputs.targetPath || "");
  const [scriptsFolder, setScriptsFolder] = useState(initialInputs.scriptsFolder || "");
  const [folderArgStyle, setFolderArgStyle] = useState(initialInputs.folderArgStyle || "auto");
  const [includeMode, setIncludeMode] = useState(
    initialInputs.includeMode !== undefined ? initialInputs.includeMode : false
  );
  const [customMode, setCustomMode] = useState(initialInputs.customMode || "");
  const [dryRun, setDryRun] = useState(initialInputs.dryRun !== undefined ? initialInputs.dryRun : true);
  const [showName, setShowName] = useState(initialInputs.showName || "");
  const [copied, setCopied] = useState(false);

  // Destination folder per preset: { [presetId]: { handle, name } }
  const [destFolders, setDestFolders] = useState({});

  // Custom Test Filename Sandbox (persisted per preset)
  const [testFilename, setTestFilename] = useState("Gladiator.II.2024.2160p.WEB-DL.mkv");
  const [showRawCode, setShowRawCode] = useState(false);
  const [testSubFilename, setTestSubFilename] = useState("Gladiator.II.2024.2160p.Arabic.srt");
  const [testSubfolderPath, setTestSubfolderPath] = useState("Movies/Gladiator.II.2024.2160p.mkv");

  // Editable manual override outputs for sandbox (user can type expected output to teach the website)
  const [manualMovieOutput, setManualMovieOutput] = useState("");
  const [manualSubOutput, setManualSubOutput] = useState("");
  const [manualFolderOutput, setManualFolderOutput] = useState("");

  // Toggle for making rename preview optional (e.g. for folder organizers / utilities)
  const [renamePreviewEnabled, setRenamePreviewEnabled] = useState(true);

  // Editable PowerShell Command override
  const [customCommand, setCustomCommand] = useState("");

  // Command Template with {PATH} placeholder for this preset
  const [commandTemplate, setCommandTemplate] = useState("");

  // Auto-save Target Folder & Command Generator inputs across sessions
  useEffect(() => {
    try {
      localStorage.setItem(
        RENAMER_INPUTS_KEY,
        JSON.stringify({
          targetPath,
          scriptsFolder,
          folderArgStyle,
          customMode,
          includeMode,
          dryRun,
          showName
        })
      );
    } catch {}
  }, [targetPath, scriptsFolder, folderArgStyle, customMode, includeMode, dryRun, showName]);

  // Modal State for Adding/Editing Code
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCodeObj, setEditingCodeObj] = useState(null);
  const [formName, setFormName] = useState("");
  const [formFolderName, setFormFolderName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("movie");
  const [formIsRenamer, setFormIsRenamer] = useState(true);
  const [formFormatTemplate, setFormFormatTemplate] = useState("");
  const [customWorkspaceFormat, setCustomWorkspaceFormat] = useState("");
  const [formParts, setFormParts] = useState([
    { id: "part_1", name: "1_renamer.py", code: "# Write your python renamer code here...\nimport os\n" }
  ]);
  const [activePartIndex, setActivePartIndex] = useState(0);

  // Load renamer presets on mount
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await getRenamerCodes();
      setCodes(data);
      if (data.length > 0 && !selectedCodeId) {
        setSelectedCodeId(data[0].id);
      }
    } catch (err) {
      addToast(`Error loading renamer codes: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedCode = (Array.isArray(codes) && codes.length > 0)
    ? (codes.find((c) => c && c.id === selectedCodeId) || codes[0])
    : DEFAULT_RENAMER_PRESETS[0];

  const isSeriesPreset = selectedCode?.category === "series" || /series|show|season|episode/i.test(selectedCode?.name || "");

  const getPresetSandboxKey = (presetId) => `filmlibrary_renamer_sandbox_${presetId}`;
  const getPresetCommandTemplateKey = (presetId) => `filmlibrary_renamer_cmd_tpl_${presetId}`;

  // Sync workspace format template & rename toggle whenever selectedCode changes
  useEffect(() => {
    if (selectedCode) {
      setCustomWorkspaceFormat(selectedCode.formatTemplate || "");
      setRenamePreviewEnabled(selectedCode.isRenamer !== false);

      // Load saved command template for this preset
      try {
        const savedTpl = localStorage.getItem(getPresetCommandTemplateKey(selectedCode.id));
        if (savedTpl !== null && savedTpl !== "") {
          setCommandTemplate(savedTpl);
        } else if (selectedCode.commandTemplate) {
          setCommandTemplate(selectedCode.commandTemplate);
        } else {
          const firstPartName = selectedCode.parts?.[0]?.name || "renamer.py";
          setCommandTemplate(`python "${firstPartName}" "{PATH}"`);
        }
      } catch {
        const firstPartName = selectedCode.parts?.[0]?.name || "renamer.py";
        setCommandTemplate(`python "${firstPartName}" "{PATH}"`);
      }

      // Check if specific alignment test data was saved for this code
      try {
        const raw = localStorage.getItem(getPresetSandboxKey(selectedCode.id));
        const savedData = raw ? JSON.parse(raw) : (selectedCode.sandboxData || null);
        if (savedData) {
          if (savedData.testFilename) setTestFilename(savedData.testFilename);
          if (savedData.testSubFilename) setTestSubFilename(savedData.testSubFilename);
          if (savedData.testSubfolderPath) setTestSubfolderPath(savedData.testSubfolderPath);
          setManualMovieOutput(savedData.manualMovieOutput || "");
          setManualSubOutput(savedData.manualSubOutput || "");
          setManualFolderOutput(savedData.manualFolderOutput || "");
          return;
        }
      } catch {}

      // Fallback defaults per category if nothing saved yet
      if (selectedCode.category === "series" || /series|show|season|episode/i.test(selectedCode.name || "")) {
        setTestFilename("loki.s01e01.2021.1080p.mkv");
        setTestSubFilename("loki.s01e01.2021.1080p.Arabic.srt");
        setTestSubfolderPath("Season 01/loki.s01e01.2021.1080p.mkv");
      } else {
        setTestFilename("Gladiator.II.2024.2160p.WEB-DL.mkv");
        setTestSubFilename("Gladiator.II.2024.2160p.Arabic.srt");
        setTestSubfolderPath("Movies/Gladiator.II.2024.2160p.mkv");
      }
      setManualMovieOutput("");
      setManualSubOutput("");
      setManualFolderOutput("");
      setCustomCommand("");
    }
  }, [selectedCodeId]);

  // Active Code Detection & PowerShell Outputs
  const activeFormatOverride = customWorkspaceFormat || selectedCode?.formatTemplate || "";
  const detectedFormat = selectedCode
    ? detectCodeFormat(selectedCode.parts, isSeriesPreset ? "series" : selectedCode.category, selectedCode.name, activeFormatOverride)
    : null;
  const generatedCommands = selectedCode
    ? generatePowerShellCommands(selectedCode, targetPath, { dryRun, showName, scriptsFolder, customMode, includeMode, folderArgStyle })
    : { powershellShortCommand: "", powershellScript: "", pythonStandaloneFiles: [], detectedCli: { folderStyle: "positional", styleLabel: 'Direct "path"' } };

  // Evaluate custom template dynamically by replacing {PATH} with targetPath
  const evaluateCommandTemplate = (templateStr, pathStr) => {
    if (!templateStr || !templateStr.trim()) return "";
    const cleanPathVal = (pathStr || "").trim() || "<TARGET_FOLDER>";
    let result = templateStr;
    result = result.replace(/\{PATH\}|\{FOLDER\}|\{TARGET_DIR\}|<TARGET_FOLDER>|<PATH>/gi, cleanPathVal);
    return result;
  };

  const evaluatedCommand = evaluateCommandTemplate(commandTemplate, targetPath);
  const effectiveCommand = customCommand !== "" ? customCommand : (evaluatedCommand || generatedCommands.powershellShortCommand);
  const isCommandEdited = customCommand !== "" && customCommand !== evaluatedCommand;

  const handleSaveCommandTemplate = async () => {
    if (!selectedCode) return;
    try {
      localStorage.setItem(getPresetCommandTemplateKey(selectedCode.id), commandTemplate);
      const updatedObj = {
        ...selectedCode,
        commandTemplate
      };
      const updatedList = await saveRenamerCode(updatedObj);
      setCodes(updatedList);
      setCustomCommand("");
      addToast(`💾 Saved command template for "${selectedCode.name}"!`, "success");
    } catch (err) {
      addToast(`Saved template locally: ${err.message}`, "info");
    }
  };

  const handleResetCommandTemplate = () => {
    if (!selectedCode) return;
    const firstPartName = selectedCode?.parts?.[0]?.name || "renamer.py";
    const defaultTpl = `python "${firstPartName}" "{PATH}"`;
    setCommandTemplate(defaultTpl);
    setCustomCommand("");
    try {
      localStorage.removeItem(getPresetCommandTemplateKey(selectedCode.id));
    } catch {}
    addToast("Reset command template to default.", "info");
  };

  const handleInsertTokenToCommandTemplate = (tokenToInsert) => {
    const textarea = commandTemplateRef.current;
    if (!textarea) {
      setCommandTemplate((prev) => (prev ? `${prev} ${tokenToInsert}` : tokenToInsert));
      setCustomCommand("");
      return;
    }

    const start = textarea.selectionStart !== undefined ? textarea.selectionStart : (commandTemplate || "").length;
    const end = textarea.selectionEnd !== undefined ? textarea.selectionEnd : (commandTemplate || "").length;
    const currentVal = commandTemplate || "";

    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);

    const updated = before + tokenToInsert + after;
    setCommandTemplate(updated);
    setCustomCommand("");

    setTimeout(() => {
      if (commandTemplateRef.current) {
        commandTemplateRef.current.focus();
        const newPos = start + tokenToInsert.length;
        commandTemplateRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Form detection real-time preview (based on typed code in formParts & formFormatTemplate)
  const liveFormDetection = detectCodeFormat(formParts, formCategory, formName, formFormatTemplate);

  // Live sandbox calculation directly evaluated from selected Python code
  const liveTestResult = selectedCode
    ? transformFilenamePreview(testFilename, selectedCode.parts, showName, isSeriesPreset ? "series" : selectedCode.category, activeFormatOverride)
    : "";

  // Visual format tokens blueprint for anatomy legend
  const formatBlueprint = getFormatTokensBlueprint(
    detectedFormat?.parsedTemplate?.template || (isSeriesPreset ? "{show} - S{season:02d}E{episode:02d}{res_str}{ext}" : "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}"),
    isSeriesPreset ? "series" : "movie"
  );

  const handleApplyFormatPreset = async (newTemplate) => {
    if (!selectedCode || !newTemplate) return;
    const updatedParts = (selectedCode.parts || []).map((p) => ({
      ...p,
      code: updatePythonCodeFormat(p.code, newTemplate)
    }));
    const updatedObj = {
      ...selectedCode,
      formatTemplate: newTemplate,
      parts: updatedParts
    };
    try {
      const updatedList = await saveRenamerCode(updatedObj);
      setCodes(updatedList);
      setCustomWorkspaceFormat(newTemplate);
      setCustomTemplateInput(newTemplate);
      addToast(`Applied naming format: ${newTemplate}`, "success");
    } catch (err) {
      addToast("Failed to update format", "error");
    }
  };

  const handleSaveManualOutputAsTemplate = async (manualOutputText) => {
    if (!manualOutputText || !manualOutputText.trim()) return;
    const normalized = normalizeUserFormatInput(manualOutputText);
    await handleApplyFormatPreset(normalized);
    setManualMovieOutput("");
    setManualSubOutput("");
    setManualFolderOutput("");
    addToast(`Saved format template: ${normalized}`, "success");
  };

  const handleSavePresetAlignmentData = async () => {
    if (!selectedCode) return;

    // 1. Gather current test values specific to this preset
    const sandboxData = {
      testFilename,
      testSubFilename,
      testSubfolderPath,
      manualMovieOutput,
      manualSubOutput,
      manualFolderOutput
    };

    // 2. Persist specifically for this code in localStorage
    try {
      localStorage.setItem(getPresetSandboxKey(selectedCode.id), JSON.stringify(sandboxData));
    } catch {}

    // 3. If any output was manually edited, extract the format template & update python code
    const activeManual = manualMovieOutput || manualFolderOutput || manualSubOutput;
    let newTemplate = selectedCode.formatTemplate || "";
    if (activeManual && activeManual.trim()) {
      newTemplate = normalizeUserFormatInput(activeManual);
    }

    const updatedParts = (selectedCode.parts || []).map((p) => ({
      ...p,
      code: newTemplate ? updatePythonCodeFormat(p.code, newTemplate) : p.code
    }));

    const updatedObj = {
      ...selectedCode,
      formatTemplate: newTemplate || selectedCode.formatTemplate,
      sandboxData,
      parts: updatedParts
    };

    try {
      const updatedList = await saveRenamerCode(updatedObj);
      setCodes(updatedList);
      if (newTemplate) {
        setCustomWorkspaceFormat(newTemplate);
        setCustomTemplateInput(newTemplate);
      }
      addToast(`✓ Saved alignment settings specifically for "${selectedCode.name}"!`, "success");
    } catch (err) {
      addToast(`Error saving preset settings: ${err.message}`, "error");
    }
  };

  const handleClearAllInputs = () => {
    setTargetPath("");
    setScriptsFolder("");
    setFolderArgStyle("auto");
    setCustomMode("");
    setIncludeMode(false);
    setShowName("");
    setDryRun(true);
    setCustomCommand("");
    try {
      localStorage.removeItem(RENAMER_INPUTS_KEY);
    } catch {}
    addToast("Target folder and command parameters cleared.", "info");
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast("Copied PowerShell command!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleChooseDestFolder = async () => {
    if (!selectedCode) return;
    if (!window.showDirectoryPicker) {
      addToast("Folder picker not supported in this browser. Files will download normally.", "warning");
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      setDestFolders((prev) => ({
        ...prev,
        [selectedCode.id]: { handle: dirHandle, name: dirHandle.name }
      }));
      addToast(`Folder set for "${selectedCode.name}": ${dirHandle.name}`, "success");
    } catch (err) {
      if (err.name !== "AbortError") {
        addToast("Could not open folder picker.", "error");
      }
    }
  };

  const handleClearDestFolder = () => {
    if (!selectedCode) return;
    setDestFolders((prev) => {
      const updated = { ...prev };
      delete updated[selectedCode.id];
      return updated;
    });
    addToast("Destination folder cleared for this preset.", "info");
  };

  const handleDownloadAllParts = async (codeObj) => {
    if (!codeObj || !codeObj.parts || codeObj.parts.length === 0) return;
    const preset = destFolders[codeObj.id];
    const dirHandle = preset?.handle;
    const rawFolderName = codeObj.folderName || codeObj.name || "Renamer Scripts";
    const folderName = rawFolderName.replace(/[<>:"/\\|?*]/g, "_").trim();

    const isMulti = codeObj.parts.length > 1 || Boolean(codeObj.folderName) || codeObj.category === "multi_part";

    if (dirHandle) {
      // Write into a dedicated subfolder matching the exact original folder name
      try {
        const targetSubDir = isMulti
          ? await dirHandle.getDirectoryHandle(folderName, { create: true })
          : dirHandle;

        for (const part of codeObj.parts) {
          const relativeFilePath = (part.relativePath || part.name || "script.py").replace(/\\/g, "/");
          const pathSegments = relativeFilePath.split("/").filter(Boolean);
          const fileName = pathSegments.pop();

          let currDir = targetSubDir;
          for (const segment of pathSegments) {
            if (segment && segment !== ".") {
              currDir = await currDir.getDirectoryHandle(segment, { create: true });
            }
          }

          const fileHandle = await currDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(part.code || "");
          await writable.close();
        }

        if (isMulti) {
          addToast(`✅ Saved folder "${folderName}" with ${codeObj.parts.length} file(s) into "${dirHandle.name}"`, "success");
        } else {
          addToast(`✅ Saved "${codeObj.parts[0].name}" into "${dirHandle.name}"`, "success");
        }
      } catch (err) {
        if (err.name === "NotAllowedError") {
          addToast("Permission denied — please re-select the destination folder.", "error");
          setDestFolders((prev) => {
            const updated = { ...prev };
            delete updated[codeObj.id];
            return updated;
          });
        } else {
          addToast(`Failed to save to folder: ${err.message}`, "error");
        }
      }
    } else {
      // Fallback: browser downloads
      try {
        if (isMulti) {
          const zip = new JSZip();
          const rootZipFolder = zip.folder(folderName);
          codeObj.parts.forEach((part) => {
            const relPath = (part.relativePath || part.name || "script.py").replace(/\\/g, "/");
            rootZipFolder.file(relPath, part.code || "");
          });
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${folderName}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast(`✅ Downloaded "${folderName}.zip" (contains all ${codeObj.parts.length} files in folder "${folderName}")!`, "success");
        } else {
          handleDownloadFile(codeObj.parts[0].code, codeObj.parts[0].name, "text/x-python");
        }
      } catch (err) {
        codeObj.parts.forEach((part, idx) => {
          setTimeout(() => {
            handleDownloadFile(part.code, part.name, "text/plain");
          }, idx * 250);
        });
        if (codeObj.parts.length > 1) {
          addToast(`Downloading ${codeObj.parts.length} files…`, "info");
        }
      }
    }
  };

  const handleDownloadFile = (content, filename, type = "text/plain") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${filename}`, "info");
  };

  // Import an entire folder as a multi-part preset (including scripts, configs, keys, docs, logs)
  const handlePythonFolderImport = (event) => {
    const allFiles = Array.from(event.target.files || []);

    // Filter out temporary build/cache artifacts (__pycache__, .git, .DS_Store, Thumbs.db, .pyc, .pyo)
    const validFiles = allFiles.filter((f) => {
      const path = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
      if (path.includes("/__pycache__/") || path.includes("/.git/") || path.includes("/.idea/") || path.includes("/.vscode/")) {
        return false;
      }
      if (f.name === ".DS_Store" || f.name === "Thumbs.db" || f.name.endsWith(".pyc") || f.name.endsWith(".pyo")) {
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      addToast("No valid files found in the selected folder.", "warning");
      event.target.value = "";
      return;
    }

    // Detect root folder name from relative path
    const firstRelative = (validFiles[0].webkitRelativePath || validFiles[0].name).replace(/\\/g, "/");
    const rootFolderName = firstRelative.split("/")[0] || "Custom Pipeline";

    // Sort files: Python scripts first (main.py first), then config/key files, then txt/docs/logs
    const sortedFiles = validFiles.sort((a, b) => {
      const relA = (a.webkitRelativePath || a.name).replace(/\\/g, "/");
      const relB = (b.webkitRelativePath || b.name).replace(/\\/g, "/");
      const pathA = relA.includes("/") ? relA.replace(/^[^/]+\//, "") : relA;
      const pathB = relB.includes("/") ? relB.replace(/^[^/]+\//, "") : relB;
      const isMainA = /main\.py$/i.test(pathA);
      const isMainB = /main\.py$/i.test(pathB);
      if (isMainA && !isMainB) return -1;
      if (!isMainA && isMainB) return 1;
      const isPyA = pathA.endsWith(".py");
      const isPyB = pathB.endsWith(".py");
      if (isPyA && !isPyB) return -1;
      if (!isPyA && isPyB) return 1;
      return pathA.localeCompare(pathB, undefined, { numeric: true });
    });

    const readPromises = sortedFiles.map((file) =>
      new Promise((resolve) => {
        const rel = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
        const subPath = rel.includes("/") ? rel.replace(/^[^/]+\//, "") : file.name;

        const reader = new FileReader();
        reader.onload = (e) => resolve({
          name: subPath,
          relativePath: subPath,
          code: e.target.result || "",
          size: file.size
        });
        reader.onerror = () => resolve({
          name: subPath,
          relativePath: subPath,
          code: "",
          size: file.size
        });
        reader.readAsText(file);
      })
    );

    Promise.all(readPromises).then((importedFiles) => {
      const scriptParts = importedFiles.map((item, idx) => ({
        id: `part_${Date.now()}_${idx}`,
        name: item.name,
        relativePath: item.relativePath,
        code: item.code
      }));

      const pyFiles = importedFiles.filter((f) => (f.name || "").endsWith(".py"));
      const detection = detectCodeFormat(importedFiles);
      const autoCat = scriptParts.length > 1 ? "multi_part" : (detection.autoCategory || "movie");
      const autoFmt = detection.extractedTemplateStr || "";

      setEditingCodeObj(null);
      setFormName(rootFolderName.replace(/[_-]/g, " "));
      setFormFolderName(rootFolderName);
      setFormDesc(`Pipeline loaded from folder: ${rootFolderName} (${importedFiles.length} files: ${pyFiles.length} scripts + configs/docs)`);
      setFormCategory(autoCat);
      setFormFormatTemplate(autoFmt);
      setFormParts(scriptParts);
      setActivePartIndex(0);
      setIsModalOpen(true);
      addToast(`Loaded folder "${rootFolderName}" (${importedFiles.length} files)! (Auto-Detected: ${autoCat.toUpperCase()})`, "success");
    });

    event.target.value = "";
  };

  // Import Python files directly from Laptop File Explorer
  const handleFileImport = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const readPromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            code: e.target.result || ""
          });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(readPromises).then((importedFiles) => {
      const newParts = importedFiles.map((item, idx) => ({
        id: `part_${Date.now()}_${idx}`,
        name: item.name,
        code: item.code
      }));

      const detection = detectCodeFormat(newParts);
      const autoCat = newParts.length > 1 ? "multi_part" : (detection.autoCategory || "movie");
      const autoFmt = detection.extractedTemplateStr || "";

      if (isModalOpen) {
        if (formParts.length === 1 && (!formParts[0].code || formParts[0].code.includes("Write your python"))) {
          setFormParts(newParts);
          setActivePartIndex(0);
          setFormCategory(autoCat);
          setFormFormatTemplate(autoFmt);
        } else {
          setFormParts((prev) => [...prev, ...newParts]);
        }
        addToast(`Imported ${importedFiles.length} Python file(s) (Auto-Detected: ${autoCat.toUpperCase()})!`, "success");
      } else {
        const primaryTitle = files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase();
        setEditingCodeObj(null);
        setFormName(primaryTitle);
        setFormDesc(`Imported from local files: ${files.map((f) => f.name).join(", ")}`);
        setFormCategory(autoCat);
        setFormFormatTemplate(autoFmt);
        setFormParts(newParts);
        setActivePartIndex(0);
        setIsModalOpen(true);
        addToast(`Loaded ${files.length} Python file(s) from your PC (Auto-Detected: ${autoCat.toUpperCase()})!`, "success");
      }
    });

    event.target.value = "";
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingCodeObj(null);
    setFormName("");
    setFormFolderName("");
    setFormDesc("");
    setFormCategory("movie");
    setFormIsRenamer(true);
    setFormFormatTemplate("");
    setFormParts([
      {
        id: `part_${Date.now()}_1`,
        name: "1_custom_script.py",
        code: `# Custom Python Script\nimport os\nimport re\n\nTARGET_DIR = r"{TARGET_DIR}"\nDRY_RUN = True\n\nprint(f"Scanning target directory: {TARGET_DIR}")\n`
      }
    ]);
    setActivePartIndex(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (codeObj) => {
    setEditingCodeObj(codeObj);
    setFormName(codeObj.name || "");
    setFormFolderName(codeObj.folderName || codeObj.name || "");
    setFormDesc(codeObj.description || "");
    setFormCategory(codeObj.category || "movie");
    setFormIsRenamer(codeObj.isRenamer !== false);
    setFormFormatTemplate(codeObj.formatTemplate || "");
    setFormParts(
      codeObj.parts && codeObj.parts.length > 0
        ? JSON.parse(JSON.stringify(codeObj.parts))
        : [{ id: "part_1", name: "1_renamer.py", code: "# Python code..." }]
    );
    setActivePartIndex(0);
    setIsModalOpen(true);
  };

  const handleAddPartToForm = () => {
    const newPartNum = formParts.length + 1;
    const newPart = {
      id: `part_${Date.now()}_${newPartNum}`,
      name: `${newPartNum}_script_part.py`,
      code: `# Part ${newPartNum} Script\nimport os\n\nTARGET_DIR = r"{TARGET_DIR}"\nprint("Part ${newPartNum} executing...")\n`
    };
    setFormParts([...formParts, newPart]);
    setActivePartIndex(formParts.length);
  };

  const handleRemovePartFromForm = (idx) => {
    if (formParts.length <= 1) {
      addToast("A renamer preset must have at least one code part.", "warning");
      return;
    }
    const updated = formParts.filter((_, i) => i !== idx);
    setFormParts(updated);
    if (activePartIndex >= updated.length) {
      setActivePartIndex(updated.length - 1);
    }
  };

  const handleSaveCodeForm = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast("Please enter a renamer preset title.", "warning");
      return;
    }

    const newCodeObj = {
      id: editingCodeObj ? editingCodeObj.id : `custom_code_${Date.now()}`,
      name: formName.trim(),
      folderName: formFolderName.trim() || (formParts.length > 1 ? formName.trim() : ""),
      description: formDesc.trim(),
      category: formCategory,
      isRenamer: formIsRenamer,
      formatTemplate: formFormatTemplate.trim(),
      badge: formParts.length > 1 ? `${formParts.length} Parts` : `${formCategory.toUpperCase()} Script`,
      parts: formParts
    };

    try {
      const updatedList = await saveRenamerCode(newCodeObj);
      setCodes(updatedList);
      setSelectedCodeId(newCodeObj.id);
      setIsModalOpen(false);
      addToast(`Renamer preset '${newCodeObj.name}' saved!`, "success");
    } catch (err) {
      addToast(`Failed to save code: ${err.message}`, "error");
    }
  };

  const handleDeleteCode = async (codeId, codeName) => {
    if (!window.confirm(`Are you sure you want to delete '${codeName}'?`)) return;
    try {
      const updatedList = await deleteRenamerCode(codeId);
      setCodes(updatedList);
      if (selectedCodeId === codeId && updatedList.length > 0) {
        setSelectedCodeId(updatedList[0].id);
      }
      addToast(`Deleted renamer preset '${codeName}'`, "info");
    } catch (err) {
      addToast(`Failed to delete code: ${err.message}`, "error");
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Restore default preset templates?")) return;
    try {
      const defaultData = await resetRenamerPresetsToDefault();
      setCodes(defaultData);
      if (defaultData.length > 0) setSelectedCodeId(defaultData[0].id);
      addToast("Restored original renamer presets!", "info");
    } catch (err) {
      addToast(`Failed to reset presets: ${err.message}`, "error");
    }
  };

  const filteredCodes = codes.filter((c) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "multi_part") return c.parts && c.parts.length > 1;
    return c.category === filterCategory;
  });

  return (
    <div style={styles.container} className="renamer-container">
      {/* Hidden File Inputs for PC Explorer File Picking */}
      <input
        type="file"
        ref={headerFileInputRef}
        onChange={handleFileImport}
        accept=".py,.txt"
        multiple
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={modalFileInputRef}
        onChange={handleFileImport}
        accept=".py,.txt"
        multiple
        style={{ display: "none" }}
      />
      {/* Hidden input for importing a Python scripts folder as a multi-part preset */}
      <input
        type="file"
        ref={pythonFolderInputRef}
        onChange={handlePythonFolderImport}
        webkitdirectory="true"
        directory="true"
        style={{ display: "none" }}
      />

      {/* Top Banner Header */}
      <div style={styles.header} className="renamer-header">
        <div style={styles.headerTitleGroup}>
          <div style={styles.headerBadge}>
            <Terminal size={14} color="#e50914" />
            <span>Python & PowerShell Workspace</span>
          </div>
          <h1 style={styles.title}>Code Workspace</h1>
          <p style={styles.subtitle}>
            Manage Python media scripts, renamers, and custom folder organizers. Customize naming formats, test live simulations, and generate ready-to-run PowerShell execution commands.
          </p>
        </div>

        <div style={styles.headerActionsGroup} className="renamer-header-actions">
          <button
            style={styles.importFolderBtn}
            onClick={() => pythonFolderInputRef.current && pythonFolderInputRef.current.click()}
            title="Select a folder that contains multiple Python scripts — they will be loaded as a multi-part pipeline preset"
          >
            <FolderSearch size={16} /> Choose Scripts Folder
          </button>

          <button
            style={styles.importPcBtn}
            onClick={() => headerFileInputRef.current && headerFileInputRef.current.click()}
            title="Browse and select .py code files from your PC"
          >
            <UploadCloud size={16} /> Choose .py File from Laptop
          </button>

          <button style={styles.addBtn} onClick={handleOpenAddModal}>
            <Plus size={16} /> Add New Code Preset
          </button>
        </div>
      </div>

      {/* Main Grid & Generator Section */}
      <div style={styles.mainLayout} className="renamer-main-layout">
        {/* Left Column: Preset & Code Selector */}
        <div style={styles.sidebarColumn}>
          {/* Category Filters & Reset Option */}
          <div style={styles.filterBarHeader}>
            <div style={styles.filterBar}>
              {["all", "movie", "series", "subtitle", "multi_part"].map((cat) => (
                <button
                  key={cat}
                  style={{
                    ...styles.filterBtn,
                    backgroundColor: filterCategory === cat ? "var(--accent-red)" : "#1f1f1f",
                    color: filterCategory === cat ? "#ffffff" : "#a3a3a3"
                  }}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat === "all" && "All Presets"}
                  {cat === "movie" && "Movies"}
                  {cat === "series" && "TV Series"}
                  {cat === "subtitle" && "Subtitles"}
                  {cat === "multi_part" && "Multi-Part"}
                </button>
              ))}
            </div>

            <button
              style={styles.resetDefaultsBtn}
              onClick={handleResetDefaults}
              title="Reset presets list to original built-in templates"
            >
              <RotateCcw size={12} /> Reset Presets
            </button>
          </div>

          {/* List of Codes */}
          <div style={styles.presetList}>
            {filteredCodes.length === 0 ? (
              <div style={styles.emptyPresetsBox}>
                <p>No presets found in this category.</p>
                <button style={styles.quickPathBtn} onClick={handleResetDefaults}>
                  Restore Default Presets
                </button>
              </div>
            ) : (
              filteredCodes.map((codeItem) => {
                const isSelected = selectedCodeId === codeItem.id;
                const hasMultiParts = codeItem.parts && codeItem.parts.length > 1;
                const itemFormat = detectCodeFormat(codeItem.parts, codeItem.category, codeItem.name);

                return (
                  <div
                    key={codeItem.id}
                    style={{
                      ...styles.presetCard,
                      borderColor: isSelected ? "var(--accent-red)" : "#2a2a2a",
                      backgroundColor: isSelected ? "#1e1415" : "#141414"
                    }}
                    onClick={() => setSelectedCodeId(codeItem.id)}
                    className="glass-panel hover-card"
                  >
                    <div style={styles.presetCardHeader}>
                      <div style={styles.presetTitleGroup}>
                        {hasMultiParts ? (
                          <Layers size={18} color="#e50914" />
                        ) : codeItem.category === "series" ? (
                          <Tv size={18} color="#3b82f6" />
                        ) : codeItem.category === "subtitle" ? (
                          <FileText size={18} color="#10b981" />
                        ) : (
                          <Film size={18} color="#f59e0b" />
                        )}
                        <span style={styles.presetName}>{codeItem.name}</span>
                      </div>

                      <span style={styles.presetBadge}>
                        {hasMultiParts ? `${codeItem.parts.length} Parts` : itemFormat.badge || "Script"}
                      </span>
                    </div>

                    <p style={styles.presetDesc}>{codeItem.description}</p>

                    {/* Format Preview Badge */}
                    <div style={styles.presetFormatMiniPill} title={`Extracted format string: ${itemFormat.extractedTemplateStr}`}>
                      <Sparkles size={12} color="#e50914" />
                      <span>Extracted: {itemFormat.extractedTemplateStr || itemFormat.categoryName}</span>
                    </div>

                    <div style={styles.presetCardFooter}>
                      <span style={styles.presetSourceTag}>
                        {hasMultiParts ? "Pipeline" : "Python Script"}
                      </span>

                      <div style={styles.presetActions}>
                        <button
                          style={styles.iconBtn}
                          title="Edit Preset"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(codeItem);
                          }}
                        >
                          <Edit3 size={14} color="#a3a3a3" />
                        </button>

                        <button
                          style={styles.iconBtn}
                          title="Delete Preset"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCode(codeItem.id, codeItem.name);
                          }}
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Workspace & PowerShell Generator */}
        {selectedCode ? (
          <div style={styles.workspaceColumn} className="glass-panel">
            {/* Header Title & Quick Actions */}
            <div style={styles.inspectorHeader}>
              <div style={styles.inspectorTitleGroup}>
                <h2 style={styles.inspectorTitle}>{selectedCode.name}</h2>
                <span style={styles.inspectorBadge}>{detectedFormat?.badge || "Format"}</span>

                <div style={styles.presetTopActions}>
                  <button
                    style={styles.editHeaderBtn}
                    onClick={() => handleOpenEditModal(selectedCode)}
                  >
                    <Edit3 size={14} /> Edit Script
                  </button>

                  <button
                    style={styles.downloadHeaderBtn}
                    onClick={() => handleDownloadAllParts(selectedCode)}
                    title={
                      selectedCode.parts?.length > 1 || selectedCode.folderName
                        ? `Download folder "${selectedCode.folderName || selectedCode.name}" (${selectedCode.parts.length} files)`
                        : "Download Python script"
                    }
                  >
                    <Download size={14} />{" "}
                    {selectedCode.parts?.length > 1 || selectedCode.folderName
                      ? `Download Folder (${selectedCode.parts?.length || 0} files)`
                      : "Download Script"}
                  </button>

                  <button
                    style={styles.deleteHeaderBtn}
                    onClick={() => handleDeleteCode(selectedCode.id, selectedCode.name)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              <p style={styles.inspectorDesc}>{selectedCode.description}</p>
            </div>

            {/* 📁 DESTINATION FOLDER BAR (per-preset) */}
            {(() => {
              const currentFolder = destFolders[selectedCode.id];
              return (
                <div style={styles.destFolderBar}>
                  <div style={styles.destFolderLeft}>
                    <Folder size={15} color={currentFolder ? "#10b981" : "#737373"} />
                    <span style={styles.destFolderLabel}>Save scripts to:</span>
                    {currentFolder ? (
                      <span style={styles.destFolderName}>
                        <CheckCircle2 size={13} color="#10b981" /> {currentFolder.name}
                      </span>
                    ) : (
                      <span style={styles.destFolderNone}>Browser default download folder</span>
                    )}
                  </div>
                  <div style={styles.destFolderActions}>
                    <button
                      style={styles.chooseFolderBtn}
                      onClick={handleChooseDestFolder}
                      title="Pick a folder — scripts will be saved directly into it"
                    >
                      <FolderSearch size={13} /> {currentFolder ? "Change Folder" : "Choose Folder"}
                    </button>
                    {currentFolder && (
                      <button
                        style={styles.clearFolderBtn}
                        onClick={handleClearDestFolder}
                        title="Clear destination — use browser default"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 🎯 SECTION 1: VISUAL FILENAME FORMAT BLUEPRINT & LIVE PREVIEW 🎯 */}
            <div style={styles.formatPreviewCard}>
              <div style={styles.formatPreviewCardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Sparkles size={20} color="#e50914" />
                  <div>
                    <h3 style={styles.formatPreviewCardTitle}>
                      {renamePreviewEnabled ? "Renamed Output Format Anatomy & Blueprint" : "Code Configuration & Script Mode"}
                    </h3>
                    <span style={styles.formatCardSubtitle}>
                      {renamePreviewEnabled
                        ? "Formats Movies (.mkv, .mp4) and Subtitles (.srt, .ass) into standardized media patterns."
                        : "Filename renaming simulation is optional and currently disabled for this organizer/utility script."}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={{
                      ...styles.toggleCustomizerBtn,
                      backgroundColor: renamePreviewEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.12)",
                      color: renamePreviewEnabled ? "#4ade80" : "#38bdf8",
                      borderColor: renamePreviewEnabled ? "#16a34a" : "#0284c7"
                    }}
                    onClick={() => setRenamePreviewEnabled(!renamePreviewEnabled)}
                    title="Toggle between Rename Format Simulation Mode vs Non-Renaming / Organizer Mode"
                  >
                    {renamePreviewEnabled ? <CheckCircle2 size={13} /> : <FolderSync size={13} />}
                    {renamePreviewEnabled ? "Rename Simulation: Active" : "Rename Simulation: Disabled (Organizer Mode)"}
                  </button>
                </div>
              </div>

              {!renamePreviewEnabled ? (
                <div style={{
                  padding: "20px 24px",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  borderRadius: "10px",
                  border: "1px dashed #334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  margin: "12px 0 6px 0",
                  flexWrap: "wrap"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <FolderSync size={24} color="#38bdf8" />
                    <div>
                      <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "0.95rem" }}>
                        Non-Renaming / Organizer Script Mode Active
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.84rem", marginTop: "3px" }}>
                        This script operates as a folder organizer, metadata collector, or custom utility without renaming files. Rename preview is bypassed.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      padding: "8px 14px",
                      backgroundColor: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      border: "1px solid #0284c7",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                    onClick={() => setRenamePreviewEnabled(true)}
                  >
                    ⚡ Enable Rename Simulation
                  </button>
                </div>
              ) : (
                <>



              {/* 🎯 Interactive Category-Specific Alignment Hub (3 Parts for Series, 2 Parts for Movie) 🎯 */}
              <div style={styles.syncShowcaseCard}>
                <div style={styles.syncHeader}>
                  {isSeriesPreset ? <Tv size={16} color="#f59e0b" /> : <Film size={16} color="#f59e0b" />}
                  <div>
                    <span style={styles.syncTitle}>
                      {isSeriesPreset
                        ? "TV Series 3-Way Structure Alignment (Subfolder + Episode Video + Subtitle):"
                        : "Movie & Subtitle 2-Way Alignment (Movie Video + Subtitle):"}
                    </span>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#9ca3af", marginTop: "2px" }}>
                      {isSeriesPreset
                        ? "A series has 3 parts: 1- Subfolder, 2- Episode Video, 3- Episode Subtitle. Edit inputs on left or outputs on right:"
                        : "A movie collection has 2 parts: 1- Movie Video, 2- Subtitle File. Edit inputs on left or outputs on right:"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                  {/* SERIES ONLY: Part 1 - Series Subfolder */}
                  {isSeriesPreset && (
                    <div style={{ backgroundColor: "#12141a", padding: "10px 12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                      <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                        📁 1. Series Subfolder Path:
                      </span>
                      <div style={styles.sandboxInputRow}>
                        <input
                          type="text"
                          value={testSubfolderPath}
                          onChange={(e) => setTestSubfolderPath(e.target.value)}
                          placeholder="e.g. Season 01/loki.s01e01.2021.1080p.mkv"
                          style={{ ...styles.sandboxInput, borderColor: "#d97706" }}
                        />
                        <div style={styles.sandboxArrow}>➔</div>
                        <input
                          type="text"
                          value={manualFolderOutput || transformFilenamePreview(testSubfolderPath, selectedCode?.parts || [], showName, "series", activeFormatOverride) || ""}
                          onChange={(e) => setManualFolderOutput(e.target.value)}
                          placeholder="Expected subfolder outcome..."
                          title="Edit this to teach the website what the subfolder output should look like"
                          style={{
                            ...styles.sandboxInput,
                            color: manualFolderOutput ? "#fbbf24" : "#f59e0b",
                            borderColor: manualFolderOutput ? "#d97706" : "#78350f",
                            backgroundColor: manualFolderOutput ? "#1c1404" : "#0d1117",
                            fontFamily: "monospace",
                            fontSize: "0.82rem"
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Part 1 (Movie) / Part 2 (Series) - Video File */}
                  <div style={{ backgroundColor: "#12141a", padding: "10px 12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                    <span style={{ fontSize: "0.75rem", color: "#e50914", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                      {isSeriesPreset ? "📺 2. Series Episode Video File:" : "🎬 1. Movie Video File:"}
                    </span>
                    <div style={styles.sandboxInputRow}>
                      <input
                        type="text"
                        value={testFilename}
                        onChange={(e) => setTestFilename(e.target.value)}
                        placeholder={isSeriesPreset ? "e.g. loki.s01e01.2021.1080p.mkv" : "e.g. Gladiator.II.2024.2160p.WEB-DL.mkv"}
                        style={styles.sandboxInput}
                      />
                      <div style={styles.sandboxArrow}>➔</div>
                      <input
                        type="text"
                        value={manualMovieOutput || liveTestResult || ""}
                        onChange={(e) => setManualMovieOutput(e.target.value)}
                        placeholder={liveTestResult || "Expected renamed video output..."}
                        title="Edit this to teach the website what the video output should look like"
                        style={{
                          ...styles.sandboxInput,
                          color: manualMovieOutput ? "#4ade80" : "#10b981",
                          borderColor: manualMovieOutput ? "#059669" : "#166534",
                          backgroundColor: manualMovieOutput ? "#0a1f0a" : "#0d1117",
                          fontFamily: "monospace",
                          fontSize: "0.82rem"
                        }}
                      />
                    </div>
                  </div>

                  {/* Part 2 (Movie) / Part 3 (Series) - Subtitle File */}
                  <div style={{ backgroundColor: "#12141a", padding: "10px 12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                      {isSeriesPreset ? "💬 3. Series Episode Subtitle File:" : "💬 2. Movie Subtitle File:"}
                    </span>
                    <div style={styles.sandboxInputRow}>
                      <input
                        type="text"
                        value={testSubFilename}
                        onChange={(e) => setTestSubFilename(e.target.value)}
                        placeholder={isSeriesPreset ? "e.g. loki.s01e01.2021.1080p.Arabic.srt" : "e.g. Gladiator.II.2024.2160p.Arabic.srt"}
                        style={{ ...styles.sandboxInput, borderColor: "#0284c7" }}
                      />
                      <div style={styles.sandboxArrow}>➔</div>
                      <input
                        type="text"
                        value={manualSubOutput || transformFilenamePreview(testSubFilename, selectedCode?.parts || [], showName, "subtitle", activeFormatOverride) || ""}
                        onChange={(e) => setManualSubOutput(e.target.value)}
                        placeholder="Expected subtitle outcome..."
                        title="Edit this to teach the website what the subtitle output should look like"
                        style={{
                          ...styles.sandboxInput,
                          color: manualSubOutput ? "#38bdf8" : "#0ea5e9",
                          borderColor: manualSubOutput ? "#0284c7" : "#075985",
                          backgroundColor: manualSubOutput ? "#0a1520" : "#0d1117",
                          fontFamily: "monospace",
                          fontSize: "0.82rem"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar for Alignment Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={13} color="#10b981" />
                    <span style={{ fontSize: "0.76rem", color: "#9ca3af" }}>
                      {isSeriesPreset
                        ? "When episode video and subtitle match 100%, media players automatically load subtitles."
                        : "When movie and subtitle match 100%, VLC & smart TVs automatically load subtitles."}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="save-preset-settings-btn"
                      onClick={handleSavePresetAlignmentData}
                      title={`Save these test inputs & format specifically for "${selectedCode?.name}" so they persist on refresh without affecting other scripts`}
                    >
                      <FileCheck size={15} /> 💾 Save Settings for "{selectedCode?.name}"
                    </button>

                    {(manualMovieOutput || manualSubOutput || manualFolderOutput) && (
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "1px solid #333",
                          borderRadius: "6px",
                          color: "#a3a3a3",
                          fontSize: "0.75rem",
                          padding: "6px 10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onClick={() => { setManualMovieOutput(""); setManualSubOutput(""); setManualFolderOutput(""); }}
                      >
                        <RotateCcw size={11} /> Reset Outputs
                      </button>
                    )}
                  </div>
                </div>
              </div>
                </>
              )}
            </div>

            {/* 🎯 SECTION 2: TARGET FOLDER & SHORT POWERSHELL COMMAND GENERATOR 🎯 */}
            <div style={styles.configCard}>
              <div style={styles.configHeaderRow}>
                <h3 style={styles.configSectionTitle}>
                  <FolderSearch size={16} color="#e50914" /> Target Folder & Command Generator
                </h3>
                <div style={styles.autoSaveGroup}>
                  <span style={styles.autoSaveBadge} title="Input paths and parameters automatically saved to browser storage">
                    <CheckCircle2 size={13} color="#10b981" /> Auto-saved
                  </span>
                  <button
                    type="button"
                    style={styles.clearInputsBtn}
                    onClick={handleClearAllInputs}
                    title="Clear and reset all typed input folder paths and values"
                  >
                    <RotateCcw size={12} /> Clear All Inputs
                  </button>
                </div>
              </div>



              {/* Target Media Folder */}
              <div style={styles.inputGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ ...styles.inputLabel, margin: 0 }}>
                    🎬 Target Media Folder (folder containing your video files to rename):
                  </label>
                  {generatedCommands.detectedCli && (
                    <span
                      style={{
                        fontSize: "0.74rem",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        fontWeight: 600
                      }}
                      title="Auto-detected how your Python script accepts arguments"
                    >
                      Script expects: {generatedCommands.detectedCli.styleLabel}
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="e.g. C:\Users\Ahmed\Downloads\English\Marvel Films"
                  style={styles.pathInput}
                />

                {/* Folder Argument Format Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.76rem", color: "#9ca3af", fontWeight: 600 }}>Command Argument Style:</span>
                  {[
                    { id: "auto", label: `⚡ Auto (${generatedCommands.detectedCli?.styleLabel || 'Direct'})` },
                    { id: "positional", label: 'Direct: "C:\\path"' },
                    { id: "named_folder", label: '--folder "C:\\path"' },
                    { id: "none", label: 'In Current Folder (No path arg)' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      style={{
                        ...styles.quickPathBtn,
                        backgroundColor: folderArgStyle === opt.id ? "rgba(59, 130, 246, 0.2)" : "#1e1e1e",
                        color: folderArgStyle === opt.id ? "#60a5fa" : "#a3a3a3",
                        border: folderArgStyle === opt.id ? "1px solid #3b82f6" : "1px solid #333333",
                        fontSize: "0.75rem",
                        padding: "3px 9px",
                        fontWeight: folderArgStyle === opt.id ? 700 : 500
                      }}
                      onClick={() => setFolderArgStyle(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div style={styles.quickPathButtons}>
                  <span style={styles.quickLabel}>Examples:</span>
                  {[
                    "D:\\Movies\\Action",
                    "C:\\Media\\Series",
                    "C:\\Media\\Movies"
                  ].map((p) => (
                    <button
                      key={p}
                      style={{
                        ...styles.quickPathBtn,
                        backgroundColor: targetPath === p ? "rgba(229, 9, 20, 0.2)" : "#222222",
                        color: targetPath === p ? "#ffffff" : "#a3a3a3",
                        borderColor: targetPath === p ? "var(--accent-red)" : "#333333"
                      }}
                      onClick={() => setTargetPath(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>



              {/* Optional --mode value input */}
              <div style={styles.optionItem}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ ...styles.inputLabel, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⚙️ --mode argument:</span>
                    <span
                      style={{
                        fontSize: "0.74rem",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        backgroundColor: includeMode ? "rgba(34,197,94,0.15)" : "rgba(115,115,115,0.15)",
                        color: includeMode ? "#4ade80" : "#a3a3a3",
                        border: includeMode ? "1px solid rgba(34,197,94,0.3)" : "1px solid #333333",
                        fontWeight: 600
                      }}
                    >
                      {includeMode ? "Active in command" : "Optional (Omitted)"}
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", color: includeMode ? "#4ade80" : "#a3a3a3", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={includeMode}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIncludeMode(checked);
                        if (checked && !customMode) {
                          setCustomMode(selectedCode?.category === "series" ? "series" : "movies");
                        }
                      }}
                      style={{ cursor: "pointer", accentColor: "#e50914" }}
                    />
                    <span>Include <code style={{ color: "#f59e0b", backgroundColor: "#171717", padding: "1px 5px", borderRadius: "4px", fontSize: "0.78rem" }}>--mode</code> in command</span>
                  </label>
                </div>

                <input
                  type="text"
                  value={includeMode ? customMode : ""}
                  onChange={(e) => {
                    setCustomMode(e.target.value);
                    if (!includeMode && e.target.value.trim()) {
                      setIncludeMode(true);
                    }
                  }}
                  placeholder={includeMode ? `Mode value (e.g. ${selectedCode?.category === "series" ? "series" : "movies"})` : "Optional — omitted from command (click a mode below or check box to enable)"}
                  style={{
                    ...styles.textInputSmall,
                    color: includeMode ? "#ffffff" : "#666666",
                    borderColor: includeMode ? "rgba(245, 158, 11, 0.4)" : "#2a2a2a",
                    backgroundColor: includeMode ? "#141414" : "#0d0d0d"
                  }}
                />

                <div style={styles.quickPathButtons}>
                  <span style={styles.quickLabel}>Quick:</span>
                  <button
                    type="button"
                    style={{
                      ...styles.quickPathBtn,
                      backgroundColor: !includeMode ? "rgba(239, 68, 68, 0.15)" : "#222222",
                      color: !includeMode ? "#f87171" : "#a3a3a3",
                      border: !includeMode ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid #333333"
                    }}
                    onClick={() => {
                      setIncludeMode(false);
                      setCustomMode("");
                    }}
                    title="Omit the --mode argument entirely from the command"
                  >
                    None (Omit --mode)
                  </button>
                  {["movies", "series", "subtitles", "anime", "documentary"].map((m) => {
                    const isSelected = includeMode && (customMode === m || (!customMode && selectedCode?.category === m));
                    return (
                      <button
                        key={m}
                        type="button"
                        style={{
                          ...styles.quickPathBtn,
                          backgroundColor: isSelected ? "rgba(229,9,20,0.2)" : "#222222",
                          color: isSelected ? "#ffffff" : "#a3a3a3",
                          border: isSelected ? "1px solid var(--accent-red)" : "1px solid #333333"
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setIncludeMode(false);
                            setCustomMode("");
                          } else {
                            setIncludeMode(true);
                            setCustomMode(m);
                          }
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dry Run / Execute Toggle */}
              <div style={styles.optionItem}>
                <label style={styles.inputLabel}>Run Mode:</label>
                <div style={styles.toggleRow}>
                  <button
                    style={{
                      ...styles.toggleModeBtn,
                      backgroundColor: dryRun ? "#1a2e1a" : "#1a1a1a",
                      color: dryRun ? "#4ade80" : "#6b7280",
                      border: dryRun ? "1px solid #16a34a" : "1px solid #3a3a3a"
                    }}
                    onClick={() => setDryRun(true)}
                    title="Preview mode: --execute flag is omitted. Files will NOT be renamed."
                  >
                    👁 --dry-run (Preview Only)
                  </button>
                  <button
                    style={{
                      ...styles.toggleModeBtn,
                      backgroundColor: !dryRun ? "#2e1a1a" : "#1a1a1a",
                      color: !dryRun ? "#f87171" : "#6b7280",
                      border: !dryRun ? "1px solid #dc2626" : "1px solid #3a3a3a"
                    }}
                    onClick={() => setDryRun(false)}
                    title="Live rename: adds --execute flag. Files WILL be renamed!"
                  >
                    ⚡ --execute (Live Rename)
                  </button>
                </div>
              </div>

              {/* 🛠️ STEP 1: CUSTOM COMMAND TEMPLATE WITH {PATH} 🛠️ */}
              <div style={{ backgroundColor: "#0f131a", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px", marginTop: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ ...styles.inputLabel, margin: 0, display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8" }}>
                    <Code size={16} color="#38bdf8" /> Command Template:
                    <span style={{ fontSize: "0.74rem", padding: "1px 7px", borderRadius: "8px", backgroundColor: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", fontWeight: 600 }}>
                      Uses {'{PATH}'}
                    </span>
                  </label>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      style={{
                        padding: "5px 12px",
                        backgroundColor: "#166534",
                        color: "#4ade80",
                        border: "1px solid #22c55e",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                      onClick={handleSaveCommandTemplate}
                      title={`Save this template specifically for "${selectedCode?.name}" so it loads every time`}
                    >
                      <FileCheck size={13} /> 💾 Save Template for "{selectedCode?.name}"
                    </button>

                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "#94a3b8",
                        fontSize: "0.74rem",
                        padding: "5px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      onClick={handleResetCommandTemplate}
                      title="Reset template back to default"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  </div>
                </div>

                <textarea
                  ref={commandTemplateRef}
                  value={commandTemplate}
                  onChange={(e) => {
                    setCommandTemplate(e.target.value);
                    setCustomCommand("");
                  }}
                  placeholder='e.g. python "Marvel Films Renamer.py" "{PATH}"'
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  rows={2}
                  style={{
                    width: "100%",
                    backgroundColor: "#06090e",
                    border: "1px solid #38bdf860",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "#38bdf8",
                    fontFamily: "Consolas, Monaco, monospace",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                    lineHeight: "1.4"
                  }}
                />

                {/* Token Helper Chips */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>
                    Insert / Replace at Selection:
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      padding: "3px 9px",
                      backgroundColor: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      border: "1px solid #0284c7",
                      borderRadius: "5px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                    onClick={() => handleInsertTokenToCommandTemplate('"{PATH}"')}
                    title='Replace selected text or insert "{PATH}" at cursor'
                  >
                    + "{'{PATH}'}" (Target Folder)
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "rgba(56, 189, 248, 0.08)",
                      color: "#7dd3fc",
                      border: "1px solid #0369a1",
                      borderRadius: "5px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                    onClick={() => handleInsertTokenToCommandTemplate('{PATH}')}
                    title="Replace selected text or insert {PATH} (unquoted) at cursor"
                  >
                    + {'{PATH}'}
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "#6ee7b7",
                      border: "1px solid #059669",
                      borderRadius: "5px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                    onClick={() => handleInsertTokenToCommandTemplate('--folder "{PATH}"')}
                    title='Insert --folder "{PATH}" at cursor'
                  >
                    + --folder "{'{PATH}'}"
                  </button>
                </div>

                <p style={{ margin: "8px 0 0 0", fontSize: "0.76rem", color: "#94a3b8", lineHeight: "1.4" }}>
                  💡 <strong>How it works:</strong> Paste your exact running command above and keep <code style={{ color: "#38bdf8", backgroundColor: "#06090e", padding: "1px 5px", borderRadius: "3px" }}>{'{PATH}'}</code> where the folder goes. As you change <strong>Target Media Folder</strong> above, it automatically inserts it into the <strong>Ready-to-Run</strong> command below!
                </p>
              </div>

              {/* 🚀 STEP 2: READY-TO-RUN EVALUATED POWERSHELL COMMAND BOX 🚀 */}
              <div style={styles.shortCommandBox}>
                <div style={styles.shortCommandHeader}>
                  <span style={styles.shortCommandTitle}>
                    <Terminal size={15} color="#f59e0b" /> Ready-to-Run PowerShell Command:
                    {isCommandEdited && (
                      <span style={styles.commandEditedBadge} title="Command has been manually edited">
                        ✏️ Custom Edited
                      </span>
                    )}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isCommandEdited && (
                      <button
                        type="button"
                        style={styles.resetCommandBtn}
                        onClick={() => {
                          setCustomCommand("");
                          addToast("Reset command to template!", "info");
                        }}
                        title="Reset back to evaluated template"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    )}
                    <button
                      style={styles.copyBtn}
                      onClick={() => handleCopy(effectiveCommand)}
                      title="Copy final command with target path to clipboard"
                    >
                      {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copied ? "Copied Command!" : "Copy PowerShell Command"}
                    </button>
                  </div>
                </div>

                <textarea
                  value={effectiveCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder='e.g. python "Marvel Films Renamer.py" "C:\path\to\folder"'
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  rows={2}
                  style={{
                    ...styles.commandCodeBlock,
                    borderColor: isCommandEdited ? "#f59e0b" : "#3b82f640",
                    color: isCommandEdited ? "#fbbf24" : "#38bdf8",
                    backgroundColor: isCommandEdited ? "#120f04" : "#000000"
                  }}
                  title="Final evaluated command with your target path inserted"
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <p style={styles.commandHint}>
                    ⚡ Automatically updated with your Target Folder. Copy and paste into Windows PowerShell.
                  </p>
                  {isCommandEdited && (
                    <span style={{ fontSize: "0.74rem", color: "#f59e0b", fontWeight: 600 }}>
                      Manual command active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Python Technical Code Toggle */}
            <div style={styles.codeToggleSection}>
              <button
                style={styles.toggleCodeBtn}
                onClick={() => setShowRawCode(!showRawCode)}
              >
                {showRawCode ? <EyeOff size={14} /> : <Eye size={14} />}
                {showRawCode ? "Hide Python Source Code" : "Show Technical Python Source Code"}
              </button>

              {showRawCode && (
                <div style={styles.rawCodeCard}>
                  {generatedCommands.pythonStandaloneFiles.map((pyFile, idx) => (
                    <div key={pyFile.id} style={styles.pyFileBox}>
                      <div style={styles.pyFileHeader}>
                        <span style={styles.pyFileName}>
                          <FileCode size={16} color="#e50914" /> Script Part {idx + 1}: {pyFile.name}
                        </span>

                        <button
                          style={styles.miniCopyBtn}
                          onClick={() => handleDownloadFile(pyFile.code, pyFile.name, "text/x-python")}
                        >
                          <Download size={12} /> Download .py File
                        </button>
                      </div>
                      <pre style={styles.codeBlock}>{pyFile.code}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.workspaceColumn} className="glass-panel">
            <div style={styles.emptyWorkspace}>
              <h3>No Renamer Preset Selected</h3>
              <p>Select a preset from the sidebar or import Python files from your computer to generate PowerShell commands.</p>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Custom Code Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h2>{editingCodeObj ? `Edit Renamer Preset: ${formName}` : "Add New Renamer Code"}</h2>
              <button style={styles.closeModalBtn} onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCodeForm} style={styles.form}>
              <div style={styles.formRowDual}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Renamer Preset Title:</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. My Custom Movie & Series Renamer"
                    style={styles.textInput}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={styles.inputLabel}>Target Category:</label>
                    {liveFormDetection?.autoCategory && (
                      <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
                        Auto-Detected: {liveFormDetection.autoCategory.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      style={styles.selectInput}
                    >
                      <option value="movie">Movie Renamer</option>
                      <option value="series">TV Series Renamer</option>
                      <option value="subtitle">Subtitle Matcher / Renamer</option>
                      <option value="organizer">Folder Organizer / Cleaner</option>
                      <option value="utility">General Python Script / Utility</option>
                      <option value="multi_part">Multi-Part Pipeline</option>
                    </select>
                    {liveFormDetection?.autoCategory && formCategory !== liveFormDetection.autoCategory && (
                      <button
                        type="button"
                        style={{
                          backgroundColor: "#166534",
                          color: "#4ade80",
                          border: "1px solid #22c55e",
                          borderRadius: "12px",
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                        onClick={() => setFormCategory(liveFormDetection.autoCategory)}
                        title={`Switch category to auto-detected '${liveFormDetection.autoCategory}'`}
                      >
                        ⚡ Apply Auto ({liveFormDetection.autoCategory})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Checkbox: Does this script rename files? */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                backgroundColor: "rgba(255,255,255,0.03)",
                borderRadius: "8px",
                border: "1px solid #2d3748"
              }}>
                <input
                  type="checkbox"
                  id="formIsRenamerCheck"
                  checked={formIsRenamer}
                  onChange={(e) => setFormIsRenamer(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#e50914" }}
                />
                <label htmlFor="formIsRenamerCheck" style={{ color: "#f3f4f6", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                  This script renames media files (Enable Filename Format & Preview Simulation)
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.inputLabel}>
                  📁 Dedicated Subfolder Name (for downloads & directory creation):
                </label>
                <input
                  type="text"
                  value={formFolderName}
                  onChange={(e) => setFormFolderName(e.target.value)}
                  placeholder="e.g. Marvel Series Renamer (leave blank to use Preset Title)"
                  style={styles.textInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.inputLabel}>Description / Notes:</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explain what this code formats or cleans..."
                  style={styles.textInput}
                />
              </div>

              {/* 🎯 EDITABLE RENAMED OUTPUT FORMAT TEMPLATE INPUT (Optional) 🎯 */}
              {formIsRenamer ? (
                <div style={styles.formGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={styles.inputLabel}>
                      ✨ Renamed Output Format Template (Editable / Customizable):
                    </label>
                    {liveFormDetection?.extractedTemplateStr && (
                      <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>
                        Auto-Filled: {liveFormDetection.extractedTemplateStr}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formFormatTemplate}
                    onChange={(e) => setFormFormatTemplate(e.target.value)}
                    placeholder={liveFormDetection?.extractedTemplateStr || "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}  OR  (Year) - Movie Title - Resolution.ext"}
                    style={{
                      ...styles.textInput,
                      fontFamily: "monospace",
                      color: "#4ade80",
                      borderColor: "#059669",
                      backgroundColor: "#0d1117"
                    }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a3a3a3", fontWeight: 600 }}>Quick Format Presets:</span>
                    {[
                      { label: "Mxx Standard", tmpl: "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}" },
                      { label: "Plex Standard", tmpl: "{clean_title} ({year}){res_str}{ext}" },
                      { label: "Minimal", tmpl: "{clean_title} ({year}){ext}" },
                      { label: "TV Series", tmpl: "{show} - S{season:02d}E{episode:02d}{ext}" },
                      { label: "Year First", tmpl: "({year}) {clean_title}{res_str}{ext}" }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        style={{
                          backgroundColor: formFormatTemplate === item.tmpl ? "rgba(16, 185, 129, 0.25)" : "#222222",
                          color: formFormatTemplate === item.tmpl ? "#4ade80" : "#a3a3a3",
                          border: formFormatTemplate === item.tmpl ? "1px solid #10b981" : "1px solid #333333",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                        onClick={() => setFormFormatTemplate(item.tmpl)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "10px 14px",
                  backgroundColor: "rgba(56, 189, 248, 0.08)",
                  borderRadius: "8px",
                  border: "1px dashed #0284c7",
                  fontSize: "0.82rem",
                  color: "#38bdf8"
                }}>
                  ℹ️ Non-renaming organizer script: Filename format template & simulation are bypassed for this preset.
                </div>
              )}

              {/* Multi-Part Python Editor Selector */}
              <div style={styles.partsEditorSection}>
                <div style={styles.partsHeader}>
                  <label style={styles.inputLabel}>
                    Python Code Parts ({formParts.length} {formParts.length === 1 ? "File" : "Files / Sequence"}):
                  </label>

                  <div style={styles.partsHeaderActions}>
                    <button
                      type="button"
                      style={styles.importPcModalBtn}
                      onClick={() => modalFileInputRef.current && modalFileInputRef.current.click()}
                      title="Choose .py file from your PC explorer"
                    >
                      <UploadCloud size={14} /> Import .py File from PC
                    </button>

                    <button type="button" style={styles.addPartBtn} onClick={handleAddPartToForm}>
                      <Plus size={14} /> + Add Blank Part
                    </button>
                  </div>
                </div>

                {/* Tabs for Parts */}
                <div style={styles.partTabs}>
                  {formParts.map((part, idx) => (
                    <button
                      key={part.id}
                      type="button"
                      style={{
                        ...styles.partTabBtn,
                        backgroundColor: activePartIndex === idx ? "var(--accent-red)" : "#222222",
                        color: activePartIndex === idx ? "#ffffff" : "#a3a3a3"
                      }}
                      onClick={() => setActivePartIndex(idx)}
                    >
                      Part {idx + 1}: {part.name}
                    </button>
                  ))}
                </div>

                {/* Selected Part Editor */}
                {formParts[activePartIndex] && (
                  <div style={styles.activePartEditorBox}>
                    <div style={styles.partConfigRow}>
                      <div style={styles.formGroupFlex}>
                        <label style={styles.inputLabelSmall}>Script Filename:</label>
                        <input
                          type="text"
                          value={formParts[activePartIndex].name}
                          onChange={(e) => {
                            const updated = [...formParts];
                            updated[activePartIndex].name = e.target.value;
                            setFormParts(updated);
                          }}
                          style={styles.textInputSmall}
                        />
                      </div>

                      {formParts.length > 1 && (
                        <button
                          type="button"
                          style={styles.removePartBtn}
                          onClick={() => handleRemovePartFromForm(activePartIndex)}
                        >
                          <Trash2 size={14} /> Delete Part {activePartIndex + 1}
                        </button>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.inputLabelSmall}>Python Code (Part {activePartIndex + 1}):</label>
                      <textarea
                        rows={12}
                        value={formParts[activePartIndex].code}
                        onChange={(e) => {
                          const updated = [...formParts];
                          updated[activePartIndex].code = e.target.value;
                          setFormParts(updated);
                        }}
                        style={styles.codeTextarea}
                        placeholder="# Paste your python code here..."
                      />
                    </div>
                  </div>
                )}

                {/* 🎯 Real-Time Format Detection & Simulated Output Box inside Modal */}
                <div style={styles.modalLivePreviewBox}>
                  <div style={styles.modalLivePreviewHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={14} color="#e50914" />
                      <span style={styles.modalLivePreviewTitle}>
                        Live Code Simulation & Extracted Format:
                      </span>
                    </div>
                    <span style={styles.modalFormatBadge}>
                      {liveFormDetection?.categoryName}
                    </span>
                  </div>

                  {liveFormDetection?.extractedTemplateStr && (
                    <div style={{
                      backgroundColor: "rgba(229, 9, 20, 0.1)",
                      border: "1px solid rgba(229, 9, 20, 0.3)",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      marginBottom: "12px",
                      fontSize: "0.82rem",
                      color: "#fca5a5",
                      fontFamily: "monospace",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <Code size={13} color="#e50914" />
                      <span>Extracted Code Format: <strong>{liveFormDetection.extractedTemplateStr}</strong></span>
                    </div>
                  )}

                  {(() => {
                    const sampleInput =
                      formCategory === "series"
                        ? "loki.s01.2022.1080p.mkv"
                        : formCategory === "subtitle"
                          ? "Inception.2010.1080p.BluRay.Arabic.srt"
                          : "Inception.2010.1080p.BluRay.x264.mkv";

                    return (
                      <div style={styles.modalLivePreviewRow}>
                        <div style={styles.modalPreviewCol}>
                          <span style={styles.previewSubLabel}>
                            Test Input ({formCategory === "series" ? "TV Episode" : formCategory === "subtitle" ? "Subtitle File" : "Film/Movie File"}):
                          </span>
                          <code style={styles.modalPreviewBeforeCode}>
                            {sampleInput}
                          </code>
                        </div>
                        <ArrowRight size={16} color="#e50914" style={{ alignSelf: "center", marginTop: "14px" }} />
                        <div style={styles.modalPreviewCol}>
                          <span style={styles.previewSubLabelGreen}>Simulated Python Output:</span>
                          <code style={styles.modalPreviewAfterCode}>
                            {transformFilenamePreview(sampleInput, formParts, "", formCategory)}
                          </code>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.saveSubmitBtn}>
                  Save Renamer Code Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Component Styles
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
    color: "#ffffff"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px"
  },
  headerTitleGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  headerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    borderRadius: "12px",
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    border: "1px solid rgba(229, 9, 20, 0.3)",
    color: "var(--accent-red)",
    fontSize: "0.82rem",
    fontWeight: 700,
    width: "fit-content"
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.5px"
  },
  subtitle: {
    color: "#a3a3a3",
    fontSize: "0.98rem",
    margin: 0,
    maxWidth: "750px"
  },
  headerActionsGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  importFolderBtn: {
    backgroundColor: "#0f2820",
    color: "#34d399",
    border: "1px solid #059669",
    padding: "10px 18px",
    borderRadius: "20px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s"
  },
  importPcBtn: {
    backgroundColor: "#1f2937",
    color: "#38bdf8",
    border: "1px solid #0284c7",
    padding: "10px 18px",
    borderRadius: "20px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s"
  },
  addBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "20px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
    transition: "all 0.2s"
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "24px"
  },
  sidebarColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  filterBarHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px"
  },
  filterBtn: {
    border: "none",
    padding: "6px 12px",
    borderRadius: "14px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  resetDefaultsBtn: {
    backgroundColor: "transparent",
    color: "#737373",
    border: "none",
    fontSize: "0.75rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    alignSelf: "flex-end"
  },
  presetList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  emptyPresetsBox: {
    padding: "30px",
    textAlign: "center",
    backgroundColor: "#141414",
    borderRadius: "12px",
    color: "#a3a3a3",
    fontSize: "0.9rem"
  },
  presetCard: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  presetCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  presetTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  presetName: {
    fontWeight: 700,
    fontSize: "0.98rem"
  },
  presetBadge: {
    fontSize: "0.75rem",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "#2a2a2a",
    color: "#a3a3a3",
    fontWeight: 600
  },
  presetDesc: {
    fontSize: "0.85rem",
    color: "#a3a3a3",
    margin: "0 0 10px 0",
    lineHeight: "1.4"
  },
  presetFormatMiniPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.75rem",
    color: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: "4px 8px",
    borderRadius: "6px",
    marginBottom: "12px",
    fontWeight: 600
  },
  presetCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  presetSourceTag: {
    fontSize: "0.75rem",
    color: "#6b7280"
  },
  presetActions: {
    display: "flex",
    gap: "6px"
  },
  iconBtn: {
    background: "none",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    borderRadius: "4px"
  },
  workspaceColumn: {
    padding: "24px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  emptyWorkspace: {
    padding: "60px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px"
  },
  inspectorHeader: {
    borderBottom: "1px solid #2a2a2a",
    paddingBottom: "16px"
  },
  inspectorTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "6px",
    justifyContent: "space-between"
  },
  inspectorTitle: {
    fontSize: "1.5rem",
    fontWeight: 800,
    margin: 0
  },
  inspectorBadge: {
    backgroundColor: "rgba(229, 9, 20, 0.2)",
    color: "var(--accent-red)",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: 700
  },
  presetTopActions: {
    display: "flex",
    gap: "8px",
    marginLeft: "auto"
  },
  editHeaderBtn: {
    backgroundColor: "#262626",
    color: "#ffffff",
    border: "1px solid #3a3a3a",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  downloadHeaderBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.35)",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background-color 0.2s, border-color 0.2s"
  },
  // Destination folder bar
  destFolderBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111114",
    border: "1px solid #252528",
    borderRadius: "10px",
    padding: "10px 14px",
    gap: "12px",
    flexWrap: "wrap"
  },
  destFolderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: 0
  },
  destFolderLabel: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#737373",
    whiteSpace: "nowrap"
  },
  destFolderName: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#10b981",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  destFolderNone: {
    fontSize: "0.82rem",
    color: "#4a4a4a",
    fontStyle: "italic"
  },
  destFolderActions: {
    display: "flex",
    gap: "6px",
    flexShrink: 0
  },
  chooseFolderBtn: {
    backgroundColor: "rgba(59,130,246,0.1)",
    color: "#60a5fa",
    border: "1px solid rgba(59,130,246,0.3)",
    padding: "5px 11px",
    borderRadius: "7px",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px"
  },
  clearFolderBtn: {
    backgroundColor: "transparent",
    color: "#4a4a4a",
    border: "1px solid #2a2a2a",
    padding: "5px 10px",
    borderRadius: "7px",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  deleteHeaderBtn: {
    backgroundColor: "#ef444420",
    color: "#ef4444",
    border: "1px solid #ef444440",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  inspectorDesc: {
    color: "#a3a3a3",
    margin: "0 0 4px 0",
    fontSize: "0.92rem"
  },
  // Visual Formatter Preview Box
  formatPreviewCard: {
    backgroundColor: "#141416",
    borderRadius: "14px",
    border: "1px solid rgba(229, 9, 20, 0.3)",
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.35)"
  },
  formatPreviewCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    borderBottom: "1px solid #26262a",
    paddingBottom: "12px"
  },
  formatPreviewCardTitle: {
    fontSize: "1.1rem",
    fontWeight: 800,
    margin: 0,
    color: "#ffffff"
  },
  formatCardSubtitle: {
    fontSize: "0.8rem",
    color: "#a3a3a3",
    display: "block",
    marginTop: "2px"
  },
  toggleCustomizerBtn: {
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    color: "#ef4444",
    border: "1px solid rgba(229, 9, 20, 0.4)",
    padding: "6px 14px",
    borderRadius: "16px",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s"
  },
  // Token Anatomy Chips
  tokenChipsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backgroundColor: "#0d0d10",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #222226"
  },
  tokenChipsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  tokenChipsTitle: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#d4d4d8",
    letterSpacing: "0.3px"
  },
  tokenChipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  },
  tokenChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "0.78rem"
  },
  tokenChipKey: {
    fontWeight: 800,
    fontFamily: "monospace"
  },
  tokenChipLabel: {
    fontWeight: 600,
    opacity: 0.9
  },
  tokenChipExample: {
    fontFamily: "monospace",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.74rem",
    fontWeight: 700
  },
  // Movie vs Subtitle Sync Showcase
  syncShowcaseCard: {
    backgroundColor: "#0c0d10",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid #1f2937",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  syncHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  syncTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#f59e0b"
  },
  syncRows: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  syncItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#14151a",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #27272a"
  },
  syncTagMovie: {
    fontSize: "0.76rem",
    fontWeight: 700,
    color: "#38bdf8",
    minWidth: "100px"
  },
  syncCodeMovie: {
    color: "#ffffff",
    fontFamily: "monospace",
    fontWeight: 700,
    fontSize: "0.86rem"
  },
  syncTagSub: {
    fontSize: "0.76rem",
    fontWeight: 700,
    color: "#34d399",
    minWidth: "100px"
  },
  syncCodeSub: {
    color: "#34d399",
    fontFamily: "monospace",
    fontWeight: 700,
    fontSize: "0.86rem"
  },
  syncNoteBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
    marginTop: "2px"
  },
  syncNote: {
    fontSize: "0.75rem",
    color: "#a1a1aa",
    lineHeight: "1.4"
  },
  // Customizer Drawer
  customizerDrawer: {
    backgroundColor: "#0b0b0e",
    border: "1px solid rgba(229, 9, 20, 0.4)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  customizerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  customizerTitle: {
    fontSize: "0.88rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  presetButtonsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "10px"
  },
  formatPresetBtn: {
    border: "1px solid",
    borderRadius: "10px",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    transition: "all 0.2s"
  },
  formatPresetBtnTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  activeFormatBadge: {
    fontSize: "0.68rem",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 800
  },
  formatPresetTemplate: {
    fontSize: "0.78rem",
    fontFamily: "monospace",
    color: "#38bdf8",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: "4px 8px",
    borderRadius: "4px"
  },
  formatPresetExample: {
    fontSize: "0.72rem",
    color: "#a3a3a3"
  },
  manualFormatRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    borderTop: "1px solid #222226",
    paddingTop: "12px"
  },
  manualFormatLabel: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#e4e4e7"
  },
  manualFormatInputGroup: {
    display: "flex",
    gap: "10px"
  },
  manualFormatInput: {
    flex: 1,
    backgroundColor: "#16161a",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    padding: "8px 12px",
    color: "#ffffff",
    fontFamily: "monospace",
    fontSize: "0.85rem"
  },
  applyManualFormatBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer"
  },
  tokenInsertRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap"
  },
  insertTokenBtn: {
    backgroundColor: "#18181b",
    color: "#a1a1aa",
    border: "1px solid #27272a",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "0.72rem",
    fontFamily: "monospace",
    cursor: "pointer"
  },
  examplesList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  exampleRow: {
    display: "grid",
    gridTemplateColumns: "1fr 40px 1fr",
    alignItems: "center",
    backgroundColor: "#0a0a0c",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #262626"
  },
  exampleBeforeBox: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  exampleLabel: {
    fontSize: "0.72rem",
    color: "#ef4444",
    fontWeight: 700
  },
  beforeCode: {
    fontSize: "0.86rem",
    color: "#a3a3a3",
    fontFamily: "monospace"
  },
  arrowBox: {
    display: "flex",
    justifyContent: "center"
  },
  exampleAfterBox: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  exampleLabelGreen: {
    fontSize: "0.72rem",
    color: "#10b981",
    fontWeight: 700
  },
  afterCode: {
    fontSize: "0.9rem",
    color: "#38bdf8",
    fontWeight: 700,
    fontFamily: "monospace"
  },
  sandboxBox: {
    backgroundColor: "#0f0f12",
    padding: "12px",
    borderRadius: "8px",
    border: "1px dashed #333333",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  sandboxTitle: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#f59e0b"
  },
  sandboxInputRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  sandboxInput: {
    flex: 1,
    backgroundColor: "#16161a",
    border: "1px solid #333333",
    borderRadius: "6px",
    padding: "8px 12px",
    color: "#ffffff",
    fontSize: "0.88rem",
    fontFamily: "monospace"
  },
  sandboxArrow: {
    color: "#e50914",
    fontWeight: 800
  },
  sandboxResult: {
    flex: 1,
    backgroundColor: "#111b15",
    border: "1px solid #10b981",
    borderRadius: "6px",
    padding: "8px 12px",
    color: "#34d399",
    fontWeight: 700,
    fontSize: "0.88rem",
    fontFamily: "monospace"
  },

  configCard: {
    backgroundColor: "#141414",
    padding: "18px",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  configSectionTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  inputLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#d4d4d4"
  },
  pathInputWrapper: {
    display: "flex",
    gap: "8px"
  },
  pathInput: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    border: "1px solid #333333",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#ffffff",
    fontSize: "0.92rem",
    fontFamily: "monospace"
  },
  browseFolderBtn: {
    backgroundColor: "#1f2937",
    color: "#38bdf8",
    border: "1px solid #0284c7",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  },
  browseFolderBtnActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    border: "1px solid #10b981",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  },
  trustedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    padding: "2px 8px",
    borderRadius: "10px",
    border: "1px solid rgba(16, 185, 129, 0.3)"
  },
  folderFilesInfoPill: {
    fontSize: "0.8rem",
    color: "#a3a3a3",
    backgroundColor: "#111116",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #22222a",
    marginTop: "2px"
  },
  quickPathButtons: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "4px"
  },
  quickLabel: {
    fontSize: "0.75rem",
    color: "#737373"
  },
  quickPathBtn: {
    backgroundColor: "#222222",
    border: "1px solid #333333",
    color: "#a3a3a3",
    fontSize: "0.75rem",
    padding: "3px 8px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  optionItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  textInputSmall: {
    backgroundColor: "#0d0d0d",
    border: "1px solid #333333",
    borderRadius: "6px",
    padding: "6px 10px",
    color: "#ffffff",
    fontSize: "0.88rem"
  },
  toggleRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  toggleModeBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s"
  },

  // Short Clean PowerShell Command Box
  shortCommandBox: {
    backgroundColor: "#0a0a0d",
    borderRadius: "10px",
    border: "1px solid #2a2a30",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  shortCommandHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  shortCommandTitle: {
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#f59e0b",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  copyBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  commandCodeBlock: {
    backgroundColor: "#000000",
    border: "1px solid #3b82f640",
    borderRadius: "6px",
    padding: "12px 14px",
    color: "#38bdf8",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.95rem",
    fontWeight: 700,
    wordBreak: "break-all",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "58px",
    resize: "vertical",
    outline: "none",
    lineHeight: "1.45"
  },
  commandEditedBadge: {
    fontSize: "0.72rem",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    fontWeight: 600
  },
  resetCommandBtn: {
    background: "none",
    border: "1px solid #444444",
    borderRadius: "8px",
    color: "#fbbf24",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "6px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.2s ease"
  },
  commandHint: {
    fontSize: "0.78rem",
    color: "#737373",
    margin: 0
  },

  codeToggleSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  toggleCodeBtn: {
    backgroundColor: "transparent",
    color: "#a3a3a3",
    border: "none",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    alignSelf: "flex-start"
  },
  rawCodeCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: "10px",
    border: "1px solid #262626",
    padding: "14px"
  },
  pyFileBox: {
    marginBottom: "12px"
  },
  pyFileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px"
  },
  pyFileName: {
    fontWeight: 700,
    fontSize: "0.88rem",
    color: "#e2e8f0"
  },
  miniCopyBtn: {
    backgroundColor: "#222222",
    border: "1px solid #333333",
    color: "#d4d4d4",
    fontSize: "0.75rem",
    padding: "4px 8px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  codeBlock: {
    margin: 0,
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.85rem",
    color: "#38bdf8",
    whiteSpace: "pre-wrap"
  },

  // Modal Styles
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modalContent: {
    backgroundColor: "#121212",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "850px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "24px",
    border: "1px solid #333333"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #2a2a2a",
    paddingBottom: "12px"
  },
  closeModalBtn: {
    background: "none",
    border: "none",
    color: "#a3a3a3",
    fontSize: "1.2rem",
    cursor: "pointer"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  formRowDual: {
    display: "grid",
    gridTemplateColumns: "1fr 200px",
    gap: "16px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  formGroupFlex: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  inputLabelSmall: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#a3a3a3"
  },
  textInput: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333333",
    borderRadius: "8px",
    padding: "10px",
    color: "#ffffff",
    fontSize: "0.9rem"
  },
  selectInput: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333333",
    borderRadius: "8px",
    padding: "10px",
    color: "#ffffff",
    fontSize: "0.9rem"
  },
  partsEditorSection: {
    backgroundColor: "#181818",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  partsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  partsHeaderActions: {
    display: "flex",
    gap: "8px"
  },
  importPcModalBtn: {
    backgroundColor: "#1f2937",
    color: "#38bdf8",
    border: "1px solid #0284c7",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  addPartBtn: {
    backgroundColor: "#262626",
    color: "#ffffff",
    border: "1px solid #3a3a3a",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  partTabs: {
    display: "flex",
    gap: "8px",
    overflowX: "auto"
  },
  partTabBtn: {
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  activePartEditorBox: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  partConfigRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  removePartBtn: {
    backgroundColor: "#ef444420",
    color: "#ef4444",
    border: "1px solid #ef444440",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  codeTextarea: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #2e2e2e",
    borderRadius: "8px",
    padding: "12px",
    color: "#38bdf8",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.88rem",
    lineHeight: "1.4"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "12px"
  },
  cancelBtn: {
    backgroundColor: "#262626",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer"
  },
  saveSubmitBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: 700,
    cursor: "pointer"
  },
  configHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "10px"
  },
  autoSaveGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  autoSaveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#4ade80",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    padding: "3px 8px",
    borderRadius: "6px"
  },
  clearInputsBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#a3a3a3",
    backgroundColor: "#222222",
    border: "1px solid #333333",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  modalLivePreviewBox: {
    backgroundColor: "#111111",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "14px 16px",
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  modalLivePreviewHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  modalLivePreviewTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  modalFormatBadge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--accent-red)",
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    border: "1px solid rgba(229, 9, 20, 0.3)",
    padding: "2px 8px",
    borderRadius: "6px",
    marginLeft: "auto"
  },
  modalLivePreviewRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#080808",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #1f1f1f"
  },
  modalPreviewCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0
  },
  previewSubLabel: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#888888"
  },
  previewSubLabelGreen: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#4ade80"
  },
  modalPreviewBeforeCode: {
    fontSize: "0.82rem",
    color: "#e5e7eb",
    fontFamily: "Consolas, Monaco, monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  modalPreviewAfterCode: {
    fontSize: "0.82rem",
    color: "#4ade80",
    fontWeight: 700,
    fontFamily: "Consolas, Monaco, monospace",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
};
