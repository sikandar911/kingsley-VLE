import { useState, useEffect } from "react";
import { sectionsApi } from "../api/sections.api";
import { coursesApi } from "../../courses/api/courses.api";
import { academicApi } from "../../academic/api/academic.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const DAYS_OF_WEEK = [
  { id: "Monday", short: "Mon" },
  { id: "Tuesday", short: "Tue" },
  { id: "Wednesday", short: "Wed" },
  { id: "Thursday", short: "Thu" },
  { id: "Friday", short: "Fri" },
  { id: "Saturday", short: "Sat" },
  { id: "Sunday", short: "Sun" },
];

const INITIAL = {
  name: "",
  courseId: "",
  semesterId: "",
  daysOfWeek: [],
  startTime: "",
  endTime: "",
};

// Generate hour options (00-23)
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  id: String(i).padStart(2, "0"),
  name: String(i).padStart(2, "0"),
}));

// Generate minute options (00-59)
const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  id: String(i).padStart(2, "0"),
  name: String(i).padStart(2, "0"),
}));

export default function SectionFormModal({ onClose, onSaved, editSection }) {
  const isEdit = Boolean(editSection);

  // Parse daysOfWeek - can be array, comma-separated string, or single day string
  const parseDaysOfWeek = (data) => {
    if (Array.isArray(data)) return data.filter((d) => d);
    if (typeof data === "string" && data) {
      return data
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
    }
    return [];
  };

  const [form, setForm] = useState(
    isEdit
      ? {
          name: editSection.name || "",
          courseId: editSection.courseId || "",
          semesterId: editSection.semesterId || "",
          daysOfWeek: parseDaysOfWeek(editSection.daysOfWeek),
          startTime: editSection.startTime || "",
          endTime: editSection.endTime || "",
        }
      : INITIAL,
  );
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([coursesApi.list({ limit: 200 }), academicApi.semesters.list()])
      .then(([coursesRes, semestersRes]) => {
        setCourses(coursesRes.data?.data || []);
        setSemesters(semestersRes.data || []);
      })
      .catch(() => setError("Failed to load form data"))
      .finally(() => setMetaLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "courseId") {
      // Auto-populate semester from the selected course
      const course = courses.find((c) => c.id === value);
      setForm((prev) => ({
        ...prev,
        courseId: value,
        semesterId: course?.semesterId || prev.semesterId || "",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (day) => {
    setForm((prev) => {
      const isSelected = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: isSelected
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day],
      };
    });
  };

  const handleTimeChange = (type, value) => {
    if (type === "startHour") {
      const minute = form.startTime.split(":")[1] || "00";
      setForm((prev) => ({ ...prev, startTime: `${value}:${minute}` }));
    } else if (type === "startMinute") {
      const hour = form.startTime.split(":")[0] || "00";
      setForm((prev) => ({ ...prev, startTime: `${hour}:${value}` }));
    } else if (type === "endHour") {
      const minute = form.endTime.split(":")[1] || "00";
      setForm((prev) => ({ ...prev, endTime: `${value}:${minute}` }));
    } else if (type === "endMinute") {
      const hour = form.endTime.split(":")[0] || "00";
      setForm((prev) => ({ ...prev, endTime: `${hour}:${value}` }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Section name is required");
      return;
    }
    if (!form.courseId) {
      setError("Please select a course");
      return;
    }
    // Validate time logic: end time must be after start time
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      setError("End time must be after start time");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        courseId: form.courseId,
        semesterId: form.semesterId || null,
        daysOfWeek: form.daysOfWeek.length > 0 ? form.daysOfWeek : null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
      };
      if (isEdit) {
        await sectionsApi.update(editSection.id, payload);
      } else {
        await sectionsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save section");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay ">
      <div className="modal overflow-visible">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Edit Section" : "Create Section"}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Section Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Section A"
              className="form-input"
              disabled={metaLoading}
            />
          </div>

          <div className="form-group ">
            <label className="form-label">Course *</label>
            <CustomDropdown
              options={[
                { id: "", name: metaLoading ? "Loading…" : "Select course…" },
                ...courses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={form.courseId}
              onChange={(val) => {
                const course = courses.find((c) => c.id === val);
                setForm((prev) => ({
                  ...prev,
                  courseId: val,
                  semesterId: course?.semesterId || prev.semesterId || "",
                }));
              }}
              placeholder={metaLoading ? "Loading…" : "Select course…"}
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
              dropdownDirection="up"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Semester</label>
            <CustomDropdown
              options={[
                { id: "", name: "No semester selected" },
                ...semesters.map((s) => ({
                  id: s.id,
                  name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                })),
              ]}
              value={form.semesterId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, semesterId: val }))
              }
              placeholder="No semester selected"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
              dropdownDirection="up"
            />
          </div>

          {/* Schedule Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Class Schedule (Optional)
            </h3>

            <div className="form-group">
              <label className="form-label">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      form.daysOfWeek.includes(day.id)
                        ? "bg-[#6b1142] text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              {form.daysOfWeek.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Selected: {form.daysOfWeek.join(", ")}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {/* Start Time */}
              <div className="form-group">
                <label className="form-label">Start Time (24-hour)</label>
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    options={[{ id: "", name: "HH" }, ...HOURS]}
                    value={form.startTime.split(":")[0] || ""}
                    onChange={(val) => handleTimeChange("startHour", val)}
                    placeholder="HH"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                  />
                  <span className="text-lg font-semibold text-gray-600">:</span>
                  <CustomDropdown
                    options={[{ id: "", name: "MM" }, ...MINUTES]}
                    value={form.startTime.split(":")[1] || ""}
                    onChange={(val) => handleTimeChange("startMinute", val)}
                    placeholder="MM"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                  />
                </div>
              </div>

              {/* End Time */}
              <div className="form-group">
                <label className="form-label">End Time (24-hour)</label>
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    options={[{ id: "", name: "HH" }, ...HOURS]}
                    value={form.endTime.split(":")[0] || ""}
                    onChange={(val) => handleTimeChange("endHour", val)}
                    placeholder="HH"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                  />
                  <span className="text-lg font-semibold text-gray-600">:</span>
                  <CustomDropdown
                    options={[{ id: "", name: "MM" }, ...MINUTES]}
                    value={form.endTime.split(":")[1] || ""}
                    onChange={(val) => handleTimeChange("endMinute", val)}
                    placeholder="MM"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || metaLoading}
              className="btn-primary"
            >
              {loading
                ? "Saving…"
                : isEdit
                  ? "Update Section"
                  : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
