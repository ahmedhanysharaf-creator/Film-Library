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
  HelpCircle
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { getRenamerCodes, saveRenamerCode, deleteRenamerCode, resetRenamerPresetsToDefault } from "../services/renamerStorage";
import {
  detectCodeFormat,
  transformFilenamePreview,
  getFormatTokensBlueprint,
  updatePythonCodeFormat,
  COMMON_FORMAT_PRESETS
} from "../utils/codeDetector";
import { generatePowerShellCommands } from "../utils/powershellGenerator";

export const Renamer = () => {
  const { addToast } = useToast();

  const [codes, setCodes] = useState([]);
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // File explorer hidden inputs refs
  const headerFileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);
  const pythonFolderInputRef = useRef(null);

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
  const [customMode, setCustomMode] = useState(initialInputs.customMode || "");
  const [dryRun, setDryRun] = useState(initialInputs.dryRun !== undefined ? initialInputs.dryRun : true);
  const [showName, setShowName] = useState(initialInputs.showName || "");
  const [copied, setCopied] = useState(false);

  // Destination folder per preset: { [presetId]: { handle, name } }
  const [destFolders, setDestFolders] = useState({});

  // Custom Test Filename Sandbox (persisted)
  const [testFilename, setTestFilename] = useState(
    initialInputs.testFilename || "Inception.2010.1080p.BluRay.x264.mkv"
  );
  const [showRawCode, setShowRawCode] = useState(false);
  const [showFormatCustomizer, setShowFormatCustomizer] = useState(false);
  const [customTemplateInput, setCustomTemplateInput] = useState("");

  // Auto-save all typed input fields to localStorage on every change
  useEffect(() => {
    const dataToSave = {
      targetPath,
      scriptsFolder,
      customMode,
      dryRun,
      showName,
      testFilename
    };
    try {
      localStorage.setItem(RENAMER_INPUTS_KEY, JSON.stringify(dataToSave));
    } catch {}
  }, [targetPath, scriptsFolder, customMode, dryRun, showName, testFilename]);

  // Modal State for Adding/Editing Code
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCodeObj, setEditingCodeObj] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("movie");
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

  const selectedCode = codes.find((c) => c.id === selectedCodeId) || codes[0];

  // Active Code Detection & PowerShell Outputs
  const detectedFormat = selectedCode ? detectCodeFormat(selectedCode.parts, selectedCode.category, selectedCode.name) : null;
  const generatedCommands = selectedCode
    ? generatePowerShellCommands(selectedCode, targetPath, { dryRun, showName, scriptsFolder, customMode })
    : { powershellShortCommand: "", powershellScript: "", pythonStandaloneFiles: [] };

  // Form detection real-time preview (based on typed code in formParts)
  const liveFormDetection = detectCodeFormat(formParts, formCategory, formName);

  // Live sandbox calculation directly evaluated from selected Python code
  const liveTestResult = selectedCode
    ? transformFilenamePreview(testFilename, selectedCode.parts, showName, selectedCode.category)
    : "";

  // Visual format tokens blueprint for anatomy legend
  const formatBlueprint = getFormatTokensBlueprint(
    detectedFormat?.parsedTemplate?.template || "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}"
  );

  const handleApplyFormatPreset = async (newTemplate) => {
    if (!selectedCode || !newTemplate) return;
    const updatedParts = (selectedCode.parts || []).map((p) => ({
      ...p,
      code: updatePythonCodeFormat(p.code, newTemplate)
    }));
    const updatedObj = {
      ...selectedCode,
      parts: updatedParts
    };
    try {
      const updatedList = await saveRenamerCode(updatedObj);
      setCodes(updatedList);
      setCustomTemplateInput(newTemplate);
      addToast(`Applied naming format: ${newTemplate}`, "success");
    } catch (err) {
      addToast("Failed to update format", "error");
    }
  };

  const handleClearAllInputs = () => {
    setTargetPath("");
    setScriptsFolder("");
    setCustomMode("");
    setShowName("");
    setDryRun(true);
    setTestFilename("Inception.2010.1080p.BluRay.x264.mkv");
    try {
      localStorage.removeItem(RENAMER_INPUTS_KEY);
    } catch {}
    addToast("All input fields cleared and reset.", "info");
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

    if (dirHandle) {
      // Write directly into the chosen destination folder for this preset
      try {
        for (const part of codeObj.parts) {
          const fileHandle = await dirHandle.getFileHandle(part.name, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(part.code);
          await writable.close();
        }
        addToast(`✅ Saved ${codeObj.parts.length} script(s) into "${dirHandle.name}"`, "success");
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
      // Fallback: regular browser downloads
      codeObj.parts.forEach((part, idx) => {
        setTimeout(() => {
          handleDownloadFile(part.code, part.name, "text/x-python");
        }, idx * 400);
      });
      if (codeObj.parts.length > 1) {
        addToast(`Downloading ${codeObj.parts.length} script files…`, "info");
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

  // Import an entire folder of Python scripts as a multi-part preset
  const handlePythonFolderImport = (event) => {
    const allFiles = Array.from(event.target.files || []);
    // Filter only .py files and sort by name so 1_xxx.py runs before 2_xxx.py
    const pyFiles = allFiles
      .filter((f) => f.name.endsWith(".py"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (pyFiles.length === 0) {
      addToast("No Python (.py) files found in the selected folder.", "warning");
      event.target.value = "";
      return;
    }

    // Detect folder name from the first file's relative path
    const firstRelative = pyFiles[0].webkitRelativePath || pyFiles[0].name;
    const folderName = firstRelative.split("/")[0] || firstRelative.split("\\")[0];

    const readPromises = pyFiles.map((file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, code: e.target.result || "" });
        reader.readAsText(file);
      })
    );

    Promise.all(readPromises).then((importedFiles) => {
      const parts = importedFiles.map((item, idx) => ({
        id: `part_${Date.now()}_${idx}`,
        name: item.name,
        code: item.code
      }));
      const detection = detectCodeFormat(parts);
      const autoCat = parts.length > 1 ? "multi_part" : (detection.autoCategory || "movie");

      setEditingCodeObj(null);
      setFormName(folderName.replace(/[_-]/g, " "));
      setFormDesc(`Pipeline loaded from folder: ${folderName} (${importedFiles.length} scripts)`);
      setFormCategory(autoCat);
      setFormParts(parts);
      setActivePartIndex(0);
      setIsModalOpen(true);
      addToast(`Loaded ${importedFiles.length} Python file(s) from "${folderName}" (Auto-Detected: ${autoCat.toUpperCase()})!`, "success");
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

      if (isModalOpen) {
        if (formParts.length === 1 && (!formParts[0].code || formParts[0].code.includes("Write your python"))) {
          setFormParts(newParts);
          setActivePartIndex(0);
          setFormCategory(autoCat);
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
    setFormDesc("");
    setFormCategory("movie");
    setFormParts([
      {
        id: `part_${Date.now()}_1`,
        name: "1_custom_renamer.py",
        code: `# Custom Python Renamer Code\nimport os\nimport re\n\nTARGET_DIR = r"{TARGET_DIR}"\nDRY_RUN = True\n\nprint(f"Scanning target directory: {TARGET_DIR}")\n`
      }
    ]);
    setActivePartIndex(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (codeObj) => {
    setEditingCodeObj(codeObj);
    setFormName(codeObj.name || "");
    setFormDesc(codeObj.description || "");
    setFormCategory(codeObj.category || "movie");
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
      addToast("Please enter a name for your renamer code.", "warning");
      return;
    }

    const newCodeObj = {
      id: editingCodeObj ? editingCodeObj.id : `custom_renamer_${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim(),
      category: formCategory,
      badge: formParts.length > 1 ? `${formParts.length}-Step Pipeline` : `${formCategory.toUpperCase()} Code`,
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
          <h1 style={styles.title}>Media File Renamer Suite</h1>
          <p style={styles.subtitle}>
            Select target media folders from your computer, view live BEFORE ➔ AFTER filename format previews, and copy short PowerShell execution commands directly.
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
                    title={selectedCode.parts?.length > 1 ? `Download all ${selectedCode.parts.length} Python scripts` : "Download Python script"}
                  >
                    <Download size={14} /> Download Script{selectedCode.parts?.length > 1 ? `s (${selectedCode.parts.length})` : ""}
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
                      Renamed Output Format Anatomy & Blueprint
                    </h3>
                    <span style={styles.formatCardSubtitle}>
                      Formats both <strong>Movies (.mkv, .mp4)</strong> and <strong>Subtitles (.srt, .ass)</strong> into standardized media patterns.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  style={styles.toggleCustomizerBtn}
                  onClick={() => setShowFormatCustomizer(!showFormatCustomizer)}
                >
                  <Sliders size={13} /> {showFormatCustomizer ? "Close Format Customizer" : "Customize / Change Format"}
                </button>
              </div>

              {/* Format Tokens Anatomy Legend (Color Coded Chips) */}
              <div style={styles.tokenChipsContainer}>
                <div style={styles.tokenChipsHeader}>
                  <Tag size={13} color="#f59e0b" />
                  <span style={styles.tokenChipsTitle}>Active Format Tokens Breakdown:</span>
                </div>
                <div style={styles.tokenChipsRow}>
                  {formatBlueprint.tokens.map((tok, idx) => (
                    <div
                      key={idx}
                      style={{
                        ...styles.tokenChip,
                        color: tok.color,
                        backgroundColor: tok.bg,
                        borderColor: tok.border
                      }}
                      title={tok.desc}
                    >
                      <span style={styles.tokenChipKey}>{`{${tok.key}}`}</span>
                      <span style={styles.tokenChipLabel}>{tok.label}</span>
                      <span style={styles.tokenChipExample}>{tok.example}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🎬 Movie vs Subtitle 1:1 Matching Visualization Showcase */}
              <div style={styles.syncShowcaseCard}>
                <div style={styles.syncHeader}>
                  <Film size={14} color="#f59e0b" />
                  <span style={styles.syncTitle}>Movie & Subtitle 1:1 Name Alignment (Guaranteed Auto-Sync):</span>
                </div>
                <div style={styles.syncRows}>
                  <div style={styles.syncItem}>
                    <span style={styles.syncTagMovie}>🎬 Movie File:</span>
                    <code style={styles.syncCodeMovie}>
                      {transformFilenamePreview("Gladiator.II.2024.2160p.WEB-DL.mkv", selectedCode.parts, showName, selectedCode.category)}
                    </code>
                  </div>
                  <div style={styles.syncItem}>
                    <span style={styles.syncTagSub}>💬 Subtitle File:</span>
                    <code style={styles.syncCodeSub}>
                      {transformFilenamePreview("Gladiator.II.2024.2160p.Arabic.srt", selectedCode.parts, showName, "subtitle")}
                    </code>
                  </div>
                </div>
                <div style={styles.syncNoteBox}>
                  <CheckCircle2 size={13} color="#10b981" />
                  <span style={styles.syncNote}>
                    When subtitle and movie filenames match 100% (excluding extension), VLC, Smart TVs (Samsung/LG USB), Plex, Infuse, and Kodi automatically play subtitles without manual selection.
                  </span>
                </div>
              </div>

              {/* ⚡ Quick Format Switcher & Customizer Drawer */}
              {showFormatCustomizer && (
                <div style={styles.customizerDrawer}>
                  <div style={styles.customizerHeader}>
                    <Settings2 size={15} color="#e50914" />
                    <span style={styles.customizerTitle}>Instant Format Preset Switcher (1-Click Change):</span>
                  </div>
                  <div style={styles.presetButtonsGrid}>
                    {COMMON_FORMAT_PRESETS.map((p) => {
                      const isCurrent = detectedFormat?.parsedTemplate?.template === p.template;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          style={{
                            ...styles.formatPresetBtn,
                            borderColor: isCurrent ? "var(--accent-red)" : "#2e2e32",
                            backgroundColor: isCurrent ? "rgba(229, 9, 20, 0.15)" : "#131316"
                          }}
                          onClick={() => handleApplyFormatPreset(p.template)}
                        >
                          <div style={styles.formatPresetBtnTop}>
                            <span style={{ fontWeight: 700, color: isCurrent ? "#ffffff" : "#e5e5e5" }}>{p.label}</span>
                            {isCurrent && <span style={styles.activeFormatBadge}>Active</span>}
                          </div>
                          <code style={styles.formatPresetTemplate}>{p.template}</code>
                          <span style={styles.formatPresetExample}>Preview: {p.movieExample}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual Custom Template Input */}
                  <div style={styles.manualFormatRow}>
                    <span style={styles.manualFormatLabel}>Or Type Custom Format Template:</span>
                    <div style={styles.manualFormatInputGroup}>
                      <input
                        type="text"
                        value={customTemplateInput || detectedFormat?.parsedTemplate?.template || ""}
                        onChange={(e) => setCustomTemplateInput(e.target.value)}
                        placeholder="{m_prefix} - ({year}) - {clean_title}{res_str}{ext}"
                        style={styles.manualFormatInput}
                      />
                      <button
                        type="button"
                        style={styles.applyManualFormatBtn}
                        onClick={() => handleApplyFormatPreset(customTemplateInput || detectedFormat?.parsedTemplate?.template)}
                      >
                        Apply Format to Python Script
                      </button>
                    </div>
                    <div style={styles.tokenInsertRow}>
                      <span style={{ fontSize: "0.75rem", color: "#a3a3a3", fontWeight: 600 }}>Quick Insert Tokens:</span>
                      {["{m_prefix}", "{year}", "{clean_title}", "{part_str}", "{res_str}", "{ext}"].map((tok) => (
                        <button
                          key={tok}
                          type="button"
                          style={styles.insertTokenBtn}
                          onClick={() => setCustomTemplateInput(prev => (prev || detectedFormat?.parsedTemplate?.template || "") + tok)}
                        >
                          + {tok}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Transformation Examples (Before ➔ After) */}
              <div style={styles.examplesList}>
                {detectedFormat?.examples.map((ex, idx) => (
                  <div key={idx} style={styles.exampleRow}>
                    <div style={styles.exampleBeforeBox}>
                      <span style={styles.exampleLabel}>Original Messy Filename:</span>
                      <code style={styles.beforeCode}>{ex.before}</code>
                    </div>

                    <div style={styles.arrowBox}>
                      <ArrowRight size={18} color="#e50914" />
                    </div>

                    <div style={styles.exampleAfterBox}>
                      <span style={styles.exampleLabelGreen}>Renamed Final Look:</span>
                      <code style={styles.afterCode}>{ex.after}</code>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Test Sandbox */}
              <div style={styles.sandboxBox}>
                <span style={styles.sandboxTitle}>🧪 Try Your Own Filename (Movie or Subtitle):</span>
                <div style={styles.sandboxInputRow}>
                  <input
                    type="text"
                    value={testFilename}
                    onChange={(e) => setTestFilename(e.target.value)}
                    placeholder="e.g. Gladiator.II.2024.2160p.WEB-DL.mkv or movie.arabic.srt"
                    style={styles.sandboxInput}
                  />
                  <div style={styles.sandboxArrow}>➔</div>
                  <div style={styles.sandboxResult}>{liveTestResult || "Formatted Filename"}</div>
                </div>
              </div>
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

              {/* Scripts Folder — where main.py lives */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  📂 Scripts Folder (where your Python scripts / <code style={{ color: "#f59e0b" }}>main.py</code> are saved):
                </label>
                <input
                  type="text"
                  value={scriptsFolder}
                  onChange={(e) => setScriptsFolder(e.target.value)}
                  placeholder="e.g. C:\Users\Ahmed\Downloads\MediaOrganizerTool"
                  style={styles.pathInput}
                />
              </div>

              {/* Target Media Folder */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  🎬 Target Media Folder (folder containing your video files to rename):
                </label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="e.g. C:\Users\Ahmed\Downloads\English\Marvel Films"
                  style={styles.pathInput}
                />
                <div style={styles.quickPathButtons}>
                  <span style={styles.quickLabel}>Examples / Quick:</span>
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

              {selectedCode.category === "series" && (
                <div style={styles.optionItem}>
                  <label style={styles.inputLabel}>Show Name Override (Optional):</label>
                  <input
                    type="text"
                    value={showName}
                    onChange={(e) => setShowName(e.target.value)}
                    placeholder="e.g. Breaking Bad"
                    style={styles.textInputSmall}
                  />
                </div>
              )}

              {/* --mode value input */}
              <div style={styles.optionItem}>
                <label style={styles.inputLabel}>
                  --mode value{" "}
                  <span style={{ color: "#737373", fontWeight: 400 }}>
                    (the mode your script expects — leave blank to use preset default)
                  </span>
                </label>
                <input
                  type="text"
                  value={customMode}
                  onChange={(e) => setCustomMode(e.target.value)}
                  placeholder={`Auto: ${selectedCode.category === "series" ? "series" : "movies"}`}
                  style={styles.textInputSmall}
                />
                <div style={styles.quickPathButtons}>
                  <span style={styles.quickLabel}>Quick:</span>
                  {["movies", "series", "subtitles", "anime", "documentary"].map((m) => (
                    <button
                      key={m}
                      style={{
                        ...styles.quickPathBtn,
                        backgroundColor: customMode === m ? "rgba(229,9,20,0.15)" : "#222222",
                        color: customMode === m ? "#e50914" : "#a3a3a3",
                        border: customMode === m ? "1px solid rgba(229,9,20,0.4)" : "1px solid #333333"
                      }}
                      onClick={() => setCustomMode(customMode === m ? "" : m)}
                    >
                      {m}
                    </button>
                  ))}
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

              {/* 🚀 SHORT CLEAN POWERSHELL COMMAND BOX 🚀 */}
              <div style={styles.shortCommandBox}>
                <div style={styles.shortCommandHeader}>
                  <span style={styles.shortCommandTitle}>
                    <Terminal size={15} color="#f59e0b" /> Ready-to-Run PowerShell Command:
                  </span>
                  <button
                    style={styles.copyBtn}
                    onClick={() => handleCopy(generatedCommands.powershellShortCommand)}
                  >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copied ? "Copied Command!" : "Copy PowerShell Command"}
                  </button>
                </div>

                <div style={styles.commandCodeBlock}>
                  {generatedCommands.powershellShortCommand}
                </div>
                <p style={styles.commandHint}>
                  Copy and paste this short command into Windows PowerShell terminal to execute.
                </p>
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
                      <option value="movie">Movie</option>
                      <option value="series">TV Series</option>
                      <option value="subtitle">Subtitle</option>
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
    wordBreak: "break-all"
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
