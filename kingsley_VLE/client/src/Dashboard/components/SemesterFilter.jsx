import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export default function SemesterFilter({
  semesters,
  selectedSemesterId,
  onSelect,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);
  const displayName = selectedSemester
    ? `${selectedSemester.name} - ${selectedSemester.year}`
    : "All Semesters";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = event.target.closest(".semester-filter-container");
      if (!dropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block w-full sm:w-72 semester-filter-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || semesters.length === 0}
        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#6b1142] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-between"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown
          size={18}
          className={`text-gray-500 flex-shrink-0 ml-2 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
        {/* "All Semesters" option */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-4 py-3 text-sm transition ${
            !selectedSemesterId
              ? "bg-[#6b1142] text-white font-medium"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          All Semesters
        </button>

        {/* Divider */}
        {semesters.length > 0 && <div className="border-t border-gray-200" />}

        {/* Semester options */}
        {semesters.map((semester) => (
          <button
            key={semester.id}
            onClick={() => onSelect(semester.id)}
            className={`w-full text-left px-4 py-3 text-sm transition ${
              selectedSemesterId === semester.id
                ? "bg-[#6b1142] text-white font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{semester.name}</span>
              <span className="text-xs opacity-75">{semester.year}</span>
            </div>
          </button>
        ))}

        {semesters.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            No semesters available
          </div>
        )}
      </div>
      )}
    </div>
  );
}
