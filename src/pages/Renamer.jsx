import React, { useState, useEffect } from "react";
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
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  FileCode,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { getRenamerCodes, saveRenamerCode, deleteRenamerCode } from "../services/renamerStorage";
import { detectCodeFormat } from "../utils/codeDetector";
import { generatePowerShellCommands } from "../utils/powershellGenerator";

export const Renamer = () => {
  const { addToast } = useToast();

  const [codes, setCodes] = useState([]);
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // PowerShell Generator parameters
  const [targetPath, setTargetPath] = useState("D:\\Movies\\Action");
  const [dryRun, setDryRun] = useState(true);
  const [showName, setShowName] = useState("");
  const [activeOutputTab, setActiveOutputTab] = useState("ps1"); // "ps1" | "oneliner" | "python"
  const [copiedType, setCopiedType] = useState(null); // null | "ps1" | "oneliner" | "python"

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
    ? generatePowerShellCommands(selectedCode, targetPath, { dryRun, showName })
    : { powershellScript: "", powershellOneLiner: "", pythonStandaloneFiles: [] };

  // Form detection real-time preview
  const liveFormDetection = detectCodeFormat(formParts);

  const handleCopy = (text, typeKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    addToast("Copied code to clipboard!", "success");
    setTimeout(() => setCopiedType(null), 2500);
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
      isBuiltin: false,
      parts: formParts
    };

    try {
      const updatedList = await saveRenamerCode(newCodeObj);
      setCodes(updatedList);
      setSelectedCodeId(newCodeObj.id);
      setIsModalOpen(false);
      addToast(`Renamer code '${newCodeObj.name}' saved successfully!`, "success");
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

  const filteredCodes = codes.filter((c) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "multi_part") return c.parts && c.parts.length > 1;
    return c.category === filterCategory;
  });

  return (
    <div style={styles.container}>
      {/* Top Banner Header */}
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <div style={styles.headerBadge}>
            <Terminal size={14} color="#e50914" />
            <span>Python & PowerShell Workspace</span>
          </div>
          <h1 style={styles.title}>Media File Renamer Suite</h1>
          <p style={styles.subtitle}>
            Manage single or multi-part Python renamers for movies and series, automatically detect code formats, and generate ready-to-run PowerShell execution commands.
          </p>
        </div>

        <button style={styles.addBtn} onClick={handleOpenAddModal}>
          <Plus size={16} /> Add New Renamer Code
        </button>
      </div>

      {/* Main Grid & Generator Section */}
      <div style={styles.mainLayout}>
        {/* Left Column: Preset & Code Selector */}
        <div style={styles.sidebarColumn}>
          {/* Category Filters */}
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

          {/* List of Codes */}
          <div style={styles.presetList}>
            {filteredCodes.map((codeItem) => {
              const isSelected = selectedCodeId === codeItem.id;
              const hasMultiParts = codeItem.parts && codeItem.parts.length > 1;

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
                      {hasMultiParts ? `${codeItem.parts.length} Parts` : codeItem.badge || "Script"}
                    </span>
                  </div>

                  <p style={styles.presetDesc}>{codeItem.description}</p>

                  <div style={styles.presetCardFooter}>
                    <span style={styles.presetSourceTag}>
                      {codeItem.isBuiltin ? "Official Preset" : "Custom Code"}
                    </span>

                    <div style={styles.presetActions}>
                      <button
                        style={styles.iconBtn}
                        title="View / Edit Code"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(codeItem);
                        }}
                      >
                        <Edit3 size={14} color="#a3a3a3" />
                      </button>

                      {!codeItem.isBuiltin && (
                        <button
                          style={styles.iconBtn}
                          title="Delete Custom Code"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCode(codeItem.id, codeItem.name);
                          }}
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Code Inspector & PowerShell Generator Workspace */}
        {selectedCode && (
          <div style={styles.workspaceColumn} className="glass-panel">
            {/* Active Code Inspector Banner */}
            <div style={styles.inspectorHeader}>
              <div style={styles.inspectorTitleGroup}>
                <h2 style={styles.inspectorTitle}>{selectedCode.name}</h2>
                <span style={styles.inspectorBadge}>{detectedFormat?.badge || "Format"}</span>
              </div>
              <p style={styles.inspectorDesc}>{selectedCode.description}</p>

              {/* Format Detection Breakdown */}
              <div style={styles.detectionBox}>
                <div style={styles.detectionRow}>
                  <Sparkles size={16} color="#e50914" />
                  <span style={styles.detectionText}>{detectedFormat?.summary}</span>
                </div>

                <div style={styles.tagsRow}>
                  {detectedFormat?.detectedPatterns.map((pat, idx) => (
                    <span key={idx} style={styles.formatTag}>
                      ✓ {pat.label}
                    </span>
                  ))}
                  {detectedFormat?.hasDryRun && (
                    <span style={{ ...styles.formatTag, borderColor: "#3b82f6", color: "#60a5fa" }}>
                      🛡️ Safe Dry-Run Support
                    </span>
                  )}
                  {detectedFormat?.partsCount > 1 && (
                    <span style={{ ...styles.formatTag, borderColor: "#f59e0b", color: "#fbbf24" }}>
                      🔗 Multi-Part Sequence ({detectedFormat.partsCount} Scripts)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Path & Options Configuration Bar */}
            <div style={styles.configCard}>
              <h3 style={styles.configSectionTitle}>
                <Folder size={16} color="#e50914" /> Target Location & Execution Parameters
              </h3>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Local Media Folder Path (Where the code will run):</label>
                <div style={styles.pathInputWrapper}>
                  <input
                    type="text"
                    value={targetPath}
                    onChange={(e) => setTargetPath(e.target.value)}
                    placeholder="e.g. D:\Movies\Inception or C:\Media\TV Shows"
                    style={styles.pathInput}
                  />
                </div>
                <div style={styles.quickPathButtons}>
                  <span style={styles.quickLabel}>Quick Paths:</span>
                  {["D:\\Movies\\Action", "C:\\Media\\Series", "E:\\Downloads\\Unprocessed"].map((p) => (
                    <button key={p} style={styles.quickPathBtn} onClick={() => setTargetPath(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.optionsRow}>
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

                <div style={styles.optionItem}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      style={styles.checkbox}
                    />
                    Enable Dry-Run Mode (Preview changes without renaming actual files)
                  </label>
                </div>
              </div>
            </div>

            {/* PowerShell Commands Output Box */}
            <div style={styles.outputCard}>
              <div style={styles.outputHeader}>
                <div style={styles.outputTabs}>
                  <button
                    style={{
                      ...styles.outputTabBtn,
                      borderBottom: activeOutputTab === "ps1" ? "2px solid var(--accent-red)" : "none",
                      color: activeOutputTab === "ps1" ? "#ffffff" : "#a3a3a3"
                    }}
                    onClick={() => setActiveOutputTab("ps1")}
                  >
                    <Terminal size={15} /> PowerShell Script (.ps1)
                  </button>

                  <button
                    style={{
                      ...styles.outputTabBtn,
                      borderBottom: activeOutputTab === "oneliner" ? "2px solid var(--accent-red)" : "none",
                      color: activeOutputTab === "oneliner" ? "#ffffff" : "#a3a3a3"
                    }}
                    onClick={() => setActiveOutputTab("oneliner")}
                  >
                    <ArrowRight size={15} /> PowerShell One-Liner
                  </button>

                  <button
                    style={{
                      ...styles.outputTabBtn,
                      borderBottom: activeOutputTab === "python" ? "2px solid var(--accent-red)" : "none",
                      color: activeOutputTab === "python" ? "#ffffff" : "#a3a3a3"
                    }}
                    onClick={() => setActiveOutputTab("python")}
                  >
                    <Code size={15} /> Python Source Files ({generatedCommands.pythonStandaloneFiles.length})
                  </button>
                </div>

                <div style={styles.outputActions}>
                  {activeOutputTab === "ps1" && (
                    <>
                      <button
                        style={styles.copyBtn}
                        onClick={() => handleCopy(generatedCommands.powershellScript, "ps1")}
                      >
                        {copiedType === "ps1" ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        {copiedType === "ps1" ? "Copied!" : "Copy PowerShell Script"}
                      </button>

                      <button
                        style={styles.downloadBtn}
                        onClick={() =>
                          handleDownloadFile(
                            generatedCommands.powershellScript,
                            `run_renamer_${selectedCode.id}.ps1`,
                            "text/plain"
                          )
                        }
                      >
                        <Download size={14} /> Download .ps1
                      </button>
                    </>
                  )}

                  {activeOutputTab === "oneliner" && (
                    <button
                      style={styles.copyBtn}
                      onClick={() => handleCopy(generatedCommands.powershellOneLiner, "oneliner")}
                    >
                      {copiedType === "oneliner" ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedType === "oneliner" ? "Copied!" : "Copy One-Liner"}
                    </button>
                  )}
                </div>
              </div>

              {/* Code Viewer Panel */}
              <div style={styles.codeContainer}>
                {activeOutputTab === "ps1" && (
                  <pre style={styles.codeBlock}>{generatedCommands.powershellScript}</pre>
                )}

                {activeOutputTab === "oneliner" && (
                  <div style={styles.oneLinerBox}>
                    <p style={styles.oneLinerInstruction}>
                      Copy and paste this command into any Windows PowerShell terminal to execute immediately:
                    </p>
                    <pre style={styles.codeBlock}>{generatedCommands.powershellOneLiner}</pre>
                  </div>
                )}

                {activeOutputTab === "python" && (
                  <div style={styles.pyFilesContainer}>
                    {generatedCommands.pythonStandaloneFiles.map((pyFile, idx) => (
                      <div key={pyFile.id} style={styles.pyFileBox}>
                        <div style={styles.pyFileHeader}>
                          <span style={styles.pyFileName}>
                            <FileCode size={16} color="#e50914" /> Part {idx + 1}: {pyFile.name}
                          </span>

                          <div style={styles.pyFileHeaderActions}>
                            <button
                              style={styles.miniCopyBtn}
                              onClick={() => handleCopy(pyFile.code, `py_${idx}`)}
                            >
                              <Copy size={12} /> Copy Code
                            </button>

                            <button
                              style={styles.miniCopyBtn}
                              onClick={() => handleDownloadFile(pyFile.code, pyFile.name, "text/x-python")}
                            >
                              <Download size={12} /> Download .py
                            </button>
                          </div>
                        </div>

                        <pre style={styles.codeBlock}>{pyFile.code}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Custom Code Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h2>{editingCodeObj ? "Edit Custom Renamer Code" : "Add Custom Renamer Code"}</h2>
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
                  <button type="button" style={styles.addPartBtn} onClick={handleAddPartToForm}>
                    <Plus size={14} /> + Add Another Code Part
                  </button>
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

              {/* Real-time Code Format Detector Preview */}
              <div style={styles.liveDetectionCard}>
                <div style={styles.liveDetectionTitle}>
                  <Sparkles size={14} color="#e50914" /> Auto-Detected Code Format Inspector:
                </div>
                <p style={styles.liveDetectionText}>{liveFormDetection.summary}</p>
                <div style={styles.tagsRow}>
                  {liveFormDetection.detectedVariables.map((v, i) => (
                    <span key={i} style={styles.formatTag}>
                      Var: {v.key}
                    </span>
                  ))}
                  {liveFormDetection.detectedModules.map((m, i) => (
                    <span key={i} style={{ ...styles.formatTag, borderColor: "#3b82f6", color: "#60a5fa" }}>
                      Import: {m}
                    </span>
                  ))}
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
  presetList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
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
    margin: "0 0 12px 0",
    lineHeight: "1.4"
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
  inspectorHeader: {
    borderBottom: "1px solid #2a2a2a",
    paddingBottom: "16px"
  },
  inspectorTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "6px"
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
  inspectorDesc: {
    color: "#a3a3a3",
    margin: "0 0 14px 0",
    fontSize: "0.92rem"
  },
  detectionBox: {
    backgroundColor: "#161616",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #282828",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  detectionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  detectionText: {
    fontSize: "0.88rem",
    color: "#e5e5e5",
    fontWeight: 600
  },
  tagsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "4px"
  },
  formatTag: {
    fontSize: "0.75rem",
    padding: "2px 8px",
    borderRadius: "8px",
    backgroundColor: "#202020",
    border: "1px solid #333333",
    color: "#10b981",
    fontWeight: 600
  },
  configCard: {
    backgroundColor: "#141414",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
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
  optionsRow: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
    flexWrap: "wrap"
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
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.88rem",
    color: "#f59e0b",
    fontWeight: 600,
    cursor: "pointer"
  },
  checkbox: {
    accentColor: "#f59e0b"
  },
  outputCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    overflow: "hidden"
  },
  outputHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#161616",
    padding: "10px 16px",
    borderBottom: "1px solid #2a2a2a"
  },
  outputTabs: {
    display: "flex",
    gap: "12px"
  },
  outputTabBtn: {
    background: "none",
    border: "none",
    padding: "8px 12px",
    fontSize: "0.88rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  outputActions: {
    display: "flex",
    gap: "8px"
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
  downloadBtn: {
    backgroundColor: "#262626",
    color: "#ffffff",
    border: "1px solid #3a3a3a",
    padding: "6px 14px",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  codeContainer: {
    padding: "16px",
    maxHeight: "450px",
    overflowY: "auto"
  },
  codeBlock: {
    margin: 0,
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
    fontSize: "0.88rem",
    color: "#38bdf8",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5"
  },
  oneLinerBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  oneLinerInstruction: {
    fontSize: "0.85rem",
    color: "#a3a3a3",
    margin: 0
  },
  pyFilesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  pyFileBox: {
    backgroundColor: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "12px"
  },
  pyFileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    borderBottom: "1px solid #262626",
    paddingBottom: "8px"
  },
  pyFileName: {
    fontWeight: 700,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  pyFileHeaderActions: {
    display: "flex",
    gap: "6px"
  },
  miniCopyBtn: {
    backgroundColor: "#222222",
    border: "1px solid #333333",
    color: "#d4d4d4",
    fontSize: "0.75rem",
    padding: "4px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px"
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
  addPartBtn: {
    backgroundColor: "#262626",
    color: "#ffffff",
    border: "1px solid #3a3a3a",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.8rem",
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
  liveDetectionCard: {
    backgroundColor: "#161616",
    padding: "12px",
    borderRadius: "8px",
    border: "1px dashed #333333"
  },
  liveDetectionTitle: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#e50914",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "4px"
  },
  liveDetectionText: {
    fontSize: "0.82rem",
    color: "#a3a3a3",
    margin: "0 0 6px 0"
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
