import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const CustomDropdown = ({
  options = [],
  value = "",
  onChange = () => {},
  placeholder = "Select an option",
  label = "",
  isSmallScreen = false,
  BRAND = "#6b1d3e",
  countText = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get selected option object
  const selectedOption = options.find((opt) => opt.id === value);
  const displayText = selectedOption ? selectedOption.name : placeholder;

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      {label && (
        <label
          className="text-xs sm:text-sm font-semibold mb-1.5"
          style={{
            color: isSmallScreen ? "#374151" : "white",
          }}
        >
          {label}
          {countText && <span className="ml-1 text-gray-500">{countText}</span>}
        </label>
      )}

      {/* Dropdown Button */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="relative w-full px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-left focus:outline-none focus:ring-2 transition flex items-center justify-between disabled:cursor-not-allowed border border-gray-300"
          style={{
            "--tw-ring-color": BRAND,
            backgroundColor: isSmallScreen ? "#5f1834" : "white",
            color: isSmallScreen ? "white" : "#374151",
            padding: isSmallScreen ? "10px 8px" : "10px 16px",
            minHeight: "40px",
            opacity: disabled ? 0.6 : 1,
            borderColor: isSmallScreen ? "#a1416e" : "#d1d5db",
          }}
        >
          <span className="truncate flex-1 text-left">{displayText}</span>
          <ChevronDown
            className="w-4 h-4 ml-2 flex-shrink-0 transition-transform"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div
            className="absolute z-50 w-full bg-white rounded-lg shadow-lg border border-gray-200 top-full mt-1"
            style={{
              minWidth: "220px",
              maxWidth: "calc(100vw - 20px)",
            }}
          >
            <div className="max-h-60 overflow-y-auto">
              {/* Empty option */}
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition flex items-center"
              >
                <span className="truncate">Clear Selection</span>
              </button>

              {/* Options */}
              {options.length > 0 ? (
                options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHoveredId(option.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="w-full px-4 py-2 text-left text-xs sm:text-sm font-medium transition break-words whitespace-normal"
                    style={{
                      backgroundColor:
                        value === option.id
                          ? "#f0f4ff"
                          : hoveredId === option.id
                            ? "#f3f4f6"
                            : "transparent",
                      color: value === option.id ? BRAND : "#374151",
                      borderLeft:
                        value === option.id
                          ? `3px solid ${BRAND}`
                          : "3px solid transparent",
                      paddingLeft: value === option.id ? "13px" : "16px",
                    }}
                  >
                    {option.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-xs text-gray-500">
                  No options available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDropdown;
