import { useState, useEffect, useRef } from "react";
import { eventsApi } from "../api/events.api";
import { coursesApi } from "../../courses/api/courses.api";
import { sectionsApi } from "../../sections/api/sections.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

export default function CreateEventModal({
  isOpen,
  onClose,
  onSuccess,
  editEvent = null,
}) {
  const [semesters, setSemesters] = useState([]);
  const [allCourses, setAllCourses] = useState([]); // ALL courses for filtering
  const [courses, setCourses] = useState([]); // Filtered courses for display
  const [allSections, setAllSections] = useState([]); // ALL sections for filtering
  const [sections, setSections] = useState([]); // Filtered sections for display
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    location: "",
    color: "#3B82F6",
    semesterId: "",
    courseId: "",
    sectionId: "",
    startTime: "",
    endTime: "",
  });

  // Track if this is the initial load for edit mode
  const isInitialLoadRef = useRef(true);
  const prevSemesterRef = useRef("");
  const prevCourseRef = useRef("");

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError("");

      // Reset refs for new modal open
      isInitialLoadRef.current = true;
      prevSemesterRef.current = "";
      prevCourseRef.current = "";
      eventsApi
        .getSemesters()
        .then((res) => {
          const semesterList = res.data || [];
          setSemesters(Array.isArray(semesterList) ? semesterList : []);
        })
        .catch(() => setSemesters([]));

      // Load ALL courses and sections once on modal open
      coursesApi
        .list({ limit: 500 })
        .then((res) => {
          const courseList = res.data?.data || res.data || [];
          console.log(
            "[Modal] Loaded all courses:",
            courseList.length,
            "First course:",
            courseList[0],
          );
          setAllCourses(Array.isArray(courseList) ? courseList : []);
        })
        .catch((err) => {
          console.log("[Modal] Error loading courses:", err);
          setAllCourses([]);
        });

      sectionsApi
        .list({ limit: 500 })
        .then((res) => {
          const sectionList = res.data || [];
          setAllSections(Array.isArray(sectionList) ? sectionList : []);
        })
        .catch(() => setAllSections([]));

      if (editEvent) {
        console.log("[Modal] Edit Event data:", {
          type: editEvent.type,
          semesterId: editEvent.semesterId,
          courseId: editEvent.courseId,
          sectionId: editEvent.sectionId,
          course: editEvent.course,
          section: editEvent.section,
        });
        setFormData({
          type: editEvent.type,
          title: editEvent.title,
          description: editEvent.description || "",
          location: editEvent.location || "",
          color: editEvent.color || "#3B82F6",
          semesterId: editEvent.semesterId || "",
          courseId: editEvent.courseId || "",
          sectionId: editEvent.sectionId || "",
          startTime: editEvent.startTime
            ? new Date(editEvent.startTime).toISOString().slice(0, 16)
            : "",
          endTime: editEvent.endTime
            ? new Date(editEvent.endTime).toISOString().slice(0, 16)
            : "",
        });
      } else {
        // Reset form for create mode
        setFormData({
          type: "",
          title: "",
          description: "",
          location: "",
          color: "#3B82F6",
          semesterId: "",
          courseId: "",
          sectionId: "",
          startTime: "",
          endTime: "",
        });
      }
    } else {
      // Reset everything when modal closes
      setFormData({
        type: "",
        title: "",
        description: "",
        location: "",
        color: "#3B82F6",
        semesterId: "",
        courseId: "",
        sectionId: "",
        startTime: "",
        endTime: "",
      });
    }
  }, [isOpen, editEvent]);

  // Filter courses when semester changes
  useEffect(() => {
    if (formData.semesterId && formData.type !== "institution") {
      // Filter allCourses by semester (handle both semesterId and semester.id)
      const filtered = allCourses.filter((c) => {
        const coursesSemesterId = c.semesterId || c.semester?.id;
        return coursesSemesterId === formData.semesterId;
      });
      console.log("[FilterCourses] Semester:", formData.semesterId);
      console.log("[FilterCourses] Looking for courseId:", formData.courseId);
      console.log(
        "[FilterCourses] Available courses:",
        filtered.map((c) => ({ id: c.id, title: c.title })),
      );
      console.log(
        "[FilterCourses] Filtered:",
        filtered.length,
        "All:",
        allCourses.length,
      );
      setCourses(filtered);

      // Only clear courseId if user manually changed semester (not initial load)
      const semesterChanged =
        prevSemesterRef.current &&
        prevSemesterRef.current !== formData.semesterId;
      if (semesterChanged) {
        console.log("[FilterCourses] User changed semester, clearing courseId");
        setFormData((prev) => ({ ...prev, courseId: "", sectionId: "" }));
        setSections([]);
      } else if (isInitialLoadRef.current) {
        console.log(
          "[FilterCourses] Initial load, keeping courseId:",
          formData.courseId,
        );
        isInitialLoadRef.current = false;
      }
      prevSemesterRef.current = formData.semesterId;
    } else if (!formData.semesterId) {
      setCourses([]);
      setSections([]);
      setFormData((prev) => ({ ...prev, courseId: "", sectionId: "" }));
    }
  }, [formData.semesterId, formData.type, allCourses]);

  // Filter sections when course changes
  useEffect(() => {
    if (formData.courseId) {
      // Filter allSections by course
      const filtered = allSections.filter(
        (s) => s.courseId === formData.courseId,
      );
      console.log("[FilterSections] Course:", formData.courseId);
      console.log(
        "[FilterSections] Looking for sectionId:",
        formData.sectionId,
      );
      console.log(
        "[FilterSections] Available sections:",
        filtered.map((s) => ({ id: s.id, name: s.name })),
      );
      setSections(filtered);

      // Only clear sectionId if user manually changed course (not initial load)
      const courseChanged =
        prevCourseRef.current && prevCourseRef.current !== formData.courseId;
      if (courseChanged) {
        console.log("[FilterSections] Course changed, clearing sectionId");
        setFormData((prev) => ({ ...prev, sectionId: "" }));
      } else {
        console.log(
          "[FilterSections] Initial load or same course, keeping sectionId:",
          formData.sectionId,
        );
      }
      prevCourseRef.current = formData.courseId;
    } else {
      setSections([]);
    }
  }, [formData.courseId, allSections]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.type) {
      setError("Event type is required");
      setLoading(false);
      return;
    }

    if (formData.type !== "institution" && !formData.courseId) {
      setError("Course is required for this event type");
      setLoading(false);
      return;
    }

    if (formData.type !== "institution" && !formData.sectionId) {
      setError("Section is required for this event type");
      setLoading(false);
      return;
    }

    if (!formData.startTime) {
      setError("Start time is required");
      setLoading(false);
      return;
    }

    if (!formData.endTime) {
      setError("End time is required");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        color: formData.color || undefined,
        semesterId: formData.semesterId || undefined,
        courseId: formData.courseId || undefined,
        sectionId: formData.sectionId || undefined,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
      };

      console.log("[CreateEventModal] Payload to send:", payload);

      if (editEvent) {
        console.log("[CreateEventModal] Updating event:", editEvent.id);
        await eventsApi.update(editEvent.id, payload);
      } else {
        console.log("[CreateEventModal] Creating new event");
        await eventsApi.create(payload);
      }

      setFormData({
        type: "",
        title: "",
        description: "",
        location: "",
        color: "#3B82F6",
        courseId: "",
        sectionId: "",
        semesterId: "",
        startTime: "",
        endTime: "",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md md:max-w-[580px] w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {editEvent ? "Edit Event" : "Create Event"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }}
          className="px-6 py-4 space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type *
            </label>
            <CustomDropdown
              options={[
                { id: "", name: "Select event type" },
                { id: "institution", name: "Institution-wide" },
                { id: "course", name: "Course" },
              ]}
              value={formData.type}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, type: val }))
              }
              placeholder="Select event type…"
              isSmallScreen={false}
              BRAND={BRAND}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Semester Final Exam"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Event details…"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Auditorium, Room 101"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calendar Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* Course (if type is course or section) */}
          {formData.type !== "institution" && (
            <>
              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <CustomDropdown
                  options={[
                    { id: "", name: "Select a semester" },
                    ...(Array.isArray(semesters)
                      ? semesters.map((s) => ({
                          id: s.id,
                          name: `${s.year}-${s.name}`,
                        }))
                      : []),
                  ]}
                  value={formData.semesterId}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, semesterId: val }))
                  }
                  placeholder="Select a semester"
                  isSmallScreen={false}
                  BRAND={BRAND}
                  dropdownDirection="up"
                />
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <CustomDropdown
                  options={[
                    { id: "", name: "Select a course" },
                    ...(Array.isArray(courses)
                      ? courses.map((c) => ({ id: c.id, name: c.title }))
                      : []),
                  ]}
                  value={formData.courseId}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, courseId: val }))
                  }
                  placeholder="Select a course"
                  isSmallScreen={false}
                  BRAND={BRAND}
                  disabled={!formData.semesterId}
                  dropdownDirection="up"
                />
                {!formData.semesterId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select a semester first
                  </p>
                )}
              </div>
            </>
          )}

          {/* Section (always show for non-institution events) */}
          {formData.type !== "institution" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section *
              </label>
              <CustomDropdown
                options={[
                  { id: "", name: "Select a section" },
                  ...(Array.isArray(sections)
                    ? sections.map((s) => ({ id: s.id, name: s.name }))
                    : []),
                ]}
                value={formData.sectionId}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, sectionId: val }))
                }
                placeholder="Select a section"
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!formData.courseId}
                dropdownDirection="up"
              />
              {!formData.courseId && (
                <p className="text-xs text-gray-500 mt-1">
                  Select a course first
                </p>
              )}
            </div>
          )}

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time *
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#6b1142] text-white rounded-lg text-sm font-medium hover:bg-[#5a0d38] disabled:opacity-50"
            >
              {loading ? "Saving..." : editEvent ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
