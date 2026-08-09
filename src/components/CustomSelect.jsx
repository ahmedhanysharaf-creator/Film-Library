import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ArrowUpDown, Check } from "lucide-react";

export const CustomSelect = ({ options, value, onChange, icon: Icon = ArrowUpDown }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        type="button"
        style={{
          ...styles.triggerBtn,
          ...(isOpen ? styles.triggerBtnOpen : {})
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div style={styles.triggerLeft}>
          {Icon && <Icon size={16} color="var(--text-muted)" />}
          <span style={styles.selectedLabel}>{selectedOption ? selectedOption.label : ""}</span>
        </div>
        <ChevronDown
          size={16}
          color="var(--text-muted)"
          style={{
            ...styles.chevron,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
          }}
        />
      </button>

      {isOpen && (
        <div style={styles.menu} role="listbox" className="animate-pop">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
              >
                <span style={styles.optionLabel}>{option.label}</span>
                {isSelected && <Check size={14} color="#ffffff" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: "relative",
    display: "inline-block"
  },
  triggerBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "9px 14px",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: "160px",
    outline: "none"
  },
  triggerBtnOpen: {
    borderColor: "var(--accent-red)",
    boxShadow: "0 0 0 2px rgba(229, 9, 20, 0.25)",
    backgroundColor: "var(--bg-elevated)"
  },
  triggerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  selectedLabel: {
    color: "#ffffff",
    whiteSpace: "nowrap"
  },
  chevron: {
    transition: "transform 0.2s ease"
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    minWidth: "100%",
    width: "max-content",
    backgroundColor: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "6px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.85)",
    zIndex: 150,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    backdropFilter: "blur(16px)"
  },
  optionLabel: {
    fontWeight: 600
  }
};
