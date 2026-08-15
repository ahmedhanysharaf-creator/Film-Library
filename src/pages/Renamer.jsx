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
  FileCheck
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { getRenamerCodes, saveRenamerCode, deleteRenamerCode, resetRenamerPresetsToDefault } from "../services/renamerStorage";
import { detectCodeFormat, transformFilenamePreview } from "../utils/codeDetector";
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
  const folderInputRef = useRef(null);
  const pythonFolderInputRef = useRef(null);

  // PowerShell Generator parameters (empty by default, no hardcoded paths)
  const [targetPath, setTargetPath] = useState(() => {
    return localStorage.getItem("renamer_target_path") || "";
  });
  const [scriptsFolder, setScriptsFolder] = useState(() => {
    return localStorage.getItem("renamer_scripts_folder") || "";
  });
  const [customMode, setCustomMode] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [showName, setShowName] = useState("");
  const [copied, setCopied] = useState(false);
  const scriptsFolderInputRef = useRef(null);
  const [scriptsFolderCopied, setScriptsFolderCopied] = useState(false);
  // Holds the FileSystemDirectoryHandle with readwrite permission for the session
  const dirHandleRef = useRef(null);
  const [folderPermissionGranted, setFolderPermissionGranted] = useState(false);
  const [folderFilesCount, setFolderFilesCount] = useState(null);
  const [folderMediaFiles, setFolderMediaFiles] = useState([]);

  // Persist user-entered path choices to localStorage
  useEffect(() => {
    if (targetPath) {
      localStorage.setItem("renamer_target_path", targetPath);
    }
  }, [targetPath]);

  useEffect(() => {
    if (scriptsFolder) {
      localStorage.setItem("renamer_scripts_folder", scriptsFolder);
    }
  }, [scriptsFolder]);

  // Custom Test Filename Sandbox
  const [testFilename, setTestFilename] = useState("Inception.2010.1080p.BluRay.x264.mkv");
  const [showRawCode, setShowRawCode] = useState(false);

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
  const detectedFormat = selectedCode ? detectCodeFormat(selectedCode.parts) : null;
  const generatedCommands = selectedCode
    ? generatePowerShellCommands(selectedCode, targetPath, { dryRun, showName, scriptsFolder, customMode })
    : { powershellShortCommand: "", powershellScript: "", pythonStandaloneFiles: [] };

  // Form detection real-time preview
  const liveFormDetection = detectCodeFormat(formParts);

  // Live sandbox calculation
  const liveTestResult = selectedCode
    ? transformFilenamePreview(testFilename, selectedCode.category || detectedFormat?.category, showName)
    : "";

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast("Copied PowerShell command!", "success");
    setTimeout(() => setCopied(false), 2500);
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

  // Folder Selector Handler — requests readwrite access so the browser trusts the site
  // to edit the folder contents without prompting again during the session.
  const handlePickTargetFolder = async () => {
    if (window.showDirectoryPicker) {
      try {
        // 'readwrite' mode: grants permission to list AND modify folder contents
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });

        if (handle && handle.name) {
          // Explicitly request (and persist) readwrite permission for this session
          const permission = await handle.requestPermission({ mode: "readwrite" });

          if (permission === "granted") {
            dirHandleRef.current = handle;
            setFolderPermissionGranted(true);

            // Scan files in folder to verify and display detected media files
            const mediaExtensions = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".srt", ".ass", ".vtt"];
            const foundFiles = [];
            try {
              for await (const entry of handle.values()) {
                if (entry.kind === "file") {
                  foundFiles.push(entry.name);
                }
              }
              const mediaOnly = foundFiles.filter(f => mediaExtensions.some(ext => f.toLowerCase().endsWith(ext)));
              setFolderFilesCount(foundFiles.length);
              setFolderMediaFiles(mediaOnly);
            } catch (scanErr) {
              console.warn("Could not list folder entries:", scanErr);
            }

            // Update path without injecting any hardcoded paths
            setTargetPath((prev) => {
              const cleanPrev = (prev || "").trim().replace(/\//g, "\\");
              if (/^[a-zA-Z]:\\/.test(cleanPrev)) {
                const lastSlashIdx = cleanPrev.lastIndexOf("\\");
                const parentDir = lastSlashIdx > 2 ? cleanPrev.substring(0, lastSlashIdx) : cleanPrev;
                return `${parentDir}\\${handle.name}`;
              }
              return handle.name;
            });
            addToast(
              `Selected "${handle.name}" (Access granted).`,
              "success"
            );
          } else {
            setFolderPermissionGranted(false);
            addToast("Permission denied — read-only access only.", "warning");
          }
        }
      } catch (err) {
        if (err.name !== "AbortError" && folderInputRef.current) {
          folderInputRef.current.click();
        }
      }
    } else if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  const handleFolderInputChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = firstFile.webkitRelativePath || firstFile.name;
      const folderName = relativePath.split("/")[0] || relativePath.split("\\")[0];
      
      setTargetPath((prev) => {
        const cleanPrev = (prev || "").trim().replace(/\//g, "\\");
        if (/^[a-zA-Z]:\\/.test(cleanPrev)) {
          const lastSlashIdx = cleanPrev.lastIndexOf("\\");
          const parentDir = lastSlashIdx > 2 ? cleanPrev.substring(0, lastSlashIdx) : cleanPrev;
          return `${parentDir}\\${folderName}`;
        }
        return folderName;
      });
      addToast(`Selected folder: "${folderName}"`, "success");
    }
    event.target.value = "";
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
      setEditingCodeObj(null);
      setFormName(folderName.replace(/[_-]/g, " "));
      setFormDesc(`Pipeline loaded from folder: ${folderName} (${importedFiles.length} scripts)`);
      setFormCategory("multi_part");
      setFormParts(
        importedFiles.map((item, idx) => ({
          id: `part_${Date.now()}_${idx}`,
          name: item.name,
          code: item.code
        }))
      );
      setActivePartIndex(0);
      setIsModalOpen(true);
      addToast(`Loaded ${importedFiles.length} Python file(s) from "${folderName}"!`, "success");
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
      if (isModalOpen) {
        const newParts = importedFiles.map((item, idx) => ({
          id: `part_${Date.now()}_${idx}`,
          name: item.name,
          code: item.code
        }));
        
        if (formParts.length === 1 && (!formParts[0].code || formParts[0].code.includes("Write your python"))) {
          setFormParts(newParts);
          setActivePartIndex(0);
        } else {
          setFormParts((prev) => [...prev, ...newParts]);
        }
        addToast(`Imported ${importedFiles.length} Python file(s)!`, "success");
      } else {
        const primaryTitle = files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase();
        setEditingCodeObj(null);
        setFormName(primaryTitle);
        setFormDesc(`Imported from local files: ${files.map((f) => f.name).join(", ")}`);
        setFormCategory("movie");
        setFormParts(
          importedFiles.map((item, idx) => ({
            id: `part_${Date.now()}_${idx}`,
            name: item.name,
            code: item.code
          }))
        );
        setActivePartIndex(0);
        setIsModalOpen(true);
        addToast(`Loaded ${files.length} Python file(s) from your PC!`, "success");
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
    <div style={styles.container}>
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
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        webkitdirectory="true"
        directory="true"
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
      <div style={styles.header}>
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

        <div style={styles.headerActionsGroup}>
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
      <div style={styles.mainLayout}>
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
                const itemFormat = detectCodeFormat(codeItem.parts);

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
                    <div style={styles.presetFormatMiniPill}>
                      <Sparkles size={12} color="#e50914" />
                      <span>Format: {itemFormat.categoryName}</span>
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
                    style={styles.deleteHeaderBtn}
                    onClick={() => handleDeleteCode(selectedCode.id, selectedCode.name)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
              <p style={styles.inspectorDesc}>{selectedCode.description}</p>
            </div>

            {/* 🎯 SECTION 1: VISUAL FILENAME FORMAT PREVIEW (BEFORE ➔ AFTER) 🎯 */}
            <div style={styles.formatPreviewCard}>
              <div style={styles.formatPreviewCardHeader}>
                <Sparkles size={18} color="#e50914" />
                <h3 style={styles.formatPreviewCardTitle}>
                  Renamed Output Format (Final Look Preview)
                </h3>
              </div>

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
                <span style={styles.sandboxTitle}>🧪 Try Your Own Filename:</span>
                <div style={styles.sandboxInputRow}>
                  <input
                    type="text"
                    value={testFilename}
                    onChange={(e) => setTestFilename(e.target.value)}
                    placeholder="e.g. Gladiator.II.2024.2160p.WEB-DL.mkv"
                    style={styles.sandboxInput}
                  />
                  <div style={styles.sandboxArrow}>➔</div>
                  <div style={styles.sandboxResult}>{liveTestResult || "Formatted Filename"}</div>
                </div>
              </div>
            </div>

            {/* 🎯 SECTION 2: TARGET FOLDER & SHORT POWERSHELL COMMAND GENERATOR 🎯 */}
            <div style={styles.configCard}>
              <h3 style={styles.configSectionTitle}>
                <FolderSearch size={16} color="#e50914" /> Target Folder & Command Generator
              </h3>

              {/* Scripts Folder — where main.py lives */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>
                  📂 Scripts Folder (where your Python scripts / <code style={{color:"#f59e0b"}}>main.py</code> are saved):
                </label>
                <div style={styles.pathInputWrapper}>
                  <input
                    type="text"
                    value={scriptsFolder}
                    onChange={(e) => setScriptsFolder(e.target.value)}
                    placeholder="e.g. C:\Users\Ahmed\Downloads\Marvel Renamer Scripts"
                    style={styles.pathInput}
                  />
                  <button
                    type="button"
                    style={styles.browseFolderBtn}
                    onClick={() => scriptsFolderInputRef.current && scriptsFolderInputRef.current.click()}
                    title="Select the folder where your Python scripts (main.py) are located"
                  >
                    <FolderSearch size={16} /> Browse...
                  </button>
                </div>
                <input
                  type="file"
                  ref={scriptsFolderInputRef}
                  webkitdirectory="true"
                  directory="true"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) {
                      const rel = f.webkitRelativePath || f.name;
                      const folder = rel.split("/")[0] || rel.split("\\")[0];
                      setScriptsFolder((prev) => {
                        const cleanPrev = (prev || "").trim().replace(/\//g, "\\");
                        if (/^[a-zA-Z]:\\/.test(cleanPrev)) {
                          const lastSlashIdx = cleanPrev.lastIndexOf("\\");
                          const parentDir = lastSlashIdx > 2 ? cleanPrev.substring(0, lastSlashIdx) : cleanPrev;
                          return `${parentDir}\\${folder}`;
                        }
                        return folder;
                      });
                      addToast(`Scripts folder set to: ${folder}`, "success");
                    }
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Target Media Folder */}
              <div style={styles.inputGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={styles.inputLabel}>
                    🎬 Target Media Folder (folder containing your video files to rename):
                  </label>
                  {folderPermissionGranted && (
                    <span style={styles.trustedBadge}>
                      <CheckCircle2 size={13} color="#10b981" /> Edit Access Trusted
                    </span>
                  )}
                </div>
                <div style={styles.pathInputWrapper}>
                  <input
                    type="text"
                    value={targetPath}
                    onChange={(e) => setTargetPath(e.target.value)}
                    placeholder="e.g. D:\Movies\Action or C:\Users\Ahmed\Downloads\Marvel Films"
                    style={styles.pathInput}
                  />
                  <button
                    type="button"
                    style={folderPermissionGranted ? styles.browseFolderBtnActive : styles.browseFolderBtn}
                    onClick={handlePickTargetFolder}
                    title="Select the folder and grant edit permissions for direct access"
                  >
                    <FolderSearch size={16} /> {folderPermissionGranted ? "Change Folder..." : "Browse & Grant Access..."}
                  </button>
                </div>

                {folderPermissionGranted && folderFilesCount !== null && (
                  <div style={styles.folderFilesInfoPill}>
                    <span>📁 Selected Folder scanned: <strong>{folderMediaFiles.length}</strong> media file(s) found out of {folderFilesCount} total files.</span>
                  </div>
                )}

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
                  <label style={styles.inputLabel}>Target Category:</label>
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
    borderRadius: "12px",
    border: "1px solid rgba(229, 9, 20, 0.3)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
  },
  formatPreviewCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  formatPreviewCardTitle: {
    fontSize: "1.05rem",
    fontWeight: 800,
    margin: 0,
    color: "#ffffff"
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
  }
};
