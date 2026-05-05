import { useState, useEffect } from "react";
import { sectionsApi } from "../api/sections.api";
import { coursesApi } from "../../courses/api/courses.api";
import { academicApi } from "../../academic/api/academic.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";
import { convert24To12, convert12To24 } from "../../../utils/timeFormat";

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

// Generate hour options (1-12 for 12-hour format)
const HOURS = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1).padStart(2, "0"),
  name: String(i + 1).padStart(2, "0"),
}));

// Generate minute options (00-59)
const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  id: String(i).padStart(2, "0"),
  name: String(i).padStart(2, "0"),
}));

// AM/PM options
const PERIODS = [
  { id: "AM", name: "AM" },
  { id: "PM", name: "PM" },
];

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

  // Helper to initialize time display in 12-hour format
  const initializeTimeDisplay = (time24) => {
    if (!time24) return { hour: "", minute: "", period: "AM" };
    return convert24To12(time24);
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

  // Track 12-hour format display values separately
  const [timeDisplay, setTimeDisplay] = useState({
    startHour: initializeTimeDisplay(form.startTime).hour,
    startMinute: initializeTimeDisplay(form.startTime).minute,
    startPeriod: initializeTimeDisplay(form.startTime).period,
    endHour: initializeTimeDisplay(form.endTime).hour,
    endMinute: initializeTimeDisplay(form.endTime).minute,
    endPeriod: initializeTimeDisplay(form.endTime).period,
  });

  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredCourses = form.semesterId
    ? courses.filter((course) => course.semesterId === form.semesterId)
    : [];

  // Update timeDisplay whenever form times change (important for edit mode)
  useEffect(() => {
    setTimeDisplay({
      startHour: initializeTimeDisplay(form.startTime).hour,
      startMinute: initializeTimeDisplay(form.startTime).minute,
      startPeriod: initializeTimeDisplay(form.startTime).period,
      endHour: initializeTimeDisplay(form.endTime).hour,
      endMinute: initializeTimeDisplay(form.endTime).minute,
      endPeriod: initializeTimeDisplay(form.endTime).period,
    });
  }, [isEdit]); // Only run when entering edit mode

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
    setTimeDisplay((prev) => {
      const updated = { ...prev };

      if (type === "startHour") {
        updated.startHour = value;
      } else if (type === "startMinute") {
        updated.startMinute = value;
      } else if (type === "startPeriod") {
        updated.startPeriod = value;
      } else if (type === "endHour") {
        updated.endHour = value;
      } else if (type === "endMinute") {
        updated.endMinute = value;
      } else if (type === "endPeriod") {
        updated.endPeriod = value;
      }

      // Update form with 24-hour format
      if (updated.startHour && updated.startMinute) {
        const time24 = convert12To24(
          updated.startHour,
          updated.startMinute,
          updated.startPeriod,
        );
        setForm((prev) => ({ ...prev, startTime: time24 }));
      }

      if (updated.endHour && updated.endMinute) {
        const time24 = convert12To24(
          updated.endHour,
          updated.endMinute,
          updated.endPeriod,
        );
        setForm((prev) => ({ ...prev, endTime: time24 }));
      }

      return updated;
    });
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
    if (!form.semesterId) {
      setError("Please select a semester");
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
    <div className="modal-overlay items-start overflow-y-auto py-6">
      <div className="modal overflow-visible max-h-none">
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

          <div className="form-group">
            <label className="form-label">Semester *</label>
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
                setForm((prev) => ({
                  ...prev,
                  semesterId: val,
                  courseId: "",
                }))
              }
              placeholder="No semester selected"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
              dropdownDirection="down"
            />
          </div>

          <div className="form-group ">
            <label className="form-label">Course *</label>
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: !form.semesterId
                    ? "Select a semester first…"
                    : filteredCourses.length === 0
                      ? "No courses available"
                      : "Select course…",
                },
                ...filteredCourses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={form.courseId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, courseId: val }))
              }
              placeholder={metaLoading ? "Loading…" : "Select course…"}
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading || !form.semesterId}
              dropdownDirection="down"
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
                <label className="form-label">Start Time (12-hour)</label>
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    options={[{ id: "", name: "HH" }, ...HOURS]}
                    value={timeDisplay.startHour}
                    onChange={(val) => handleTimeChange("startHour", val)}
                    placeholder="HH"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                    dropdownAlign="right"
                    dropdownDirection="up"
                  />
                  <span className="text-lg font-semibold text-gray-600">:</span>
                  <CustomDropdown
                    options={[{ id: "", name: "MM" }, ...MINUTES]}
                    value={timeDisplay.startMinute}
                    onChange={(val) => handleTimeChange("startMinute", val)}
                    placeholder="MM"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                    dropdownDirection="up"
                  />
                  <CustomDropdown
                    options={PERIODS}
                    value={timeDisplay.startPeriod}
                    onChange={(val) => handleTimeChange("startPeriod", val)}
                    placeholder="AM/PM"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                    dropdownDirection="up"
                  />
                </div>
              </div>

              {/* End Time */}
              <div className="form-group">
                <label className="form-label">End Time (12-hour)</label>
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    options={[{ id: "", name: "HH" }, ...HOURS]}
                    value={timeDisplay.endHour}
                    onChange={(val) => handleTimeChange("endHour", val)}
                    placeholder="HH"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                    dropdownAlign="right"
                    dropdownDirection="up"
                  />
                  <span className="text-lg font-semibold text-gray-600">:</span>
                  <CustomDropdown
                    options={[{ id: "", name: "MM" }, ...MINUTES]}
                    value={timeDisplay.endMinute}
                    onChange={(val) => handleTimeChange("endMinute", val)}
                    placeholder="MM"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                    dropdownDirection="up"
                  />
                  <CustomDropdown
                    options={PERIODS}
                    value={timeDisplay.endPeriod}
                    onChange={(val) => handleTimeChange("endPeriod", val)}
                    placeholder="AM/PM"
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                    dropdownDirection="up"
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
