import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Link, Video } from "lucide-react";
import { classRecordsApi } from "../api/classRecords.api";
import { courseModulesApi } from "../../courseModules/api/courseModules.api";
import CustomDropdown from "./CustomDropdown";

const BRAND = "#6b1d3e";
const BRAND_DARK = "#5a1630";

const ClassRecordModal = ({ isOpen, onClose, onSubmit, record }) => {
  const isEdit = Boolean(record);
  const prevSemesterIdRef = useRef("");
  const prevCourseIdRef = useRef("");
  const prevCourseIdForModulesRef = useRef("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    courseId: "",
    sectionId: "",
    semesterId: "",
    courseModuleId: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courseModules, setCourseModules] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [loadingCourseModules, setLoadingCourseModules] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Populate form when editing
    if (record) {
      setFormData({
        title: record.title || "",
        description: record.description || "",
        url: record.url || "",
        courseId: record.courseId || "",
        sectionId: record.sectionId || "",
        semesterId: record.semesterId || "",
        courseModuleId: record.courseModule?.id || record.courseModuleId || "",
      });
    }
    const fetchDropdowns = async () => {
      try {
        setLoadingDropdowns(true);
        const [cRes, sRes, smRes] = await Promise.all([
          classRecordsApi.getCourses(),
          classRecordsApi.getSections(),
          classRecordsApi.getSemesters(),
        ]);
        const coursesList = cRes.data?.data || [];
        const sectionsData = Array.isArray(sRes.data) ? sRes.data : sRes || [];
        const semestersData = Array.isArray(smRes.data)
          ? smRes.data
          : smRes || [];

        setCourses(coursesList);
        setSections(sectionsData);
        setSemesters(semestersData);

        // Build semester -> courses map
        const semCxMap = {};
        coursesList.forEach((course) => {
          const semId = course.semesterId;
          if (semId) {
            if (!semCxMap[semId]) semCxMap[semId] = [];
            if (!semCxMap[semId].includes(course.id)) {
              semCxMap[semId].push(course.id);
            }
          }
        });

        // Build course -> sections map
        const cxSecMap = {};
        sectionsData.forEach((section) => {
          const courseId = section.courseId;
          if (courseId) {
            if (!cxSecMap[courseId]) cxSecMap[courseId] = [];
            if (!cxSecMap[courseId].includes(section.id)) {
              cxSecMap[courseId].push(section.id);
            }
          }
        });

        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);

        // If editing, fetch course modules for the record's course
        if (
          record &&
          record.semesterId &&
          record.courseId &&
          record.sectionId
        ) {
          try {
            const modulesRes = await courseModulesApi.list({
              semesterId: record.semesterId,
              courseId: record.courseId,
              sectionId: record.sectionId,
              status: "active",
            });
            setCourseModules(modulesRes.data?.modules || []);
          } catch (err) {
            console.error("Error fetching course modules:", err);
            setCourseModules([]);
          }
        }
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdowns();
  }, [isOpen, record]);

  // Filter courses based on selected semester
  useEffect(() => {
    if (formData.semesterId && semesterCourseMap[formData.semesterId]) {
      const courseIds = semesterCourseMap[formData.semesterId];
      setFilteredCourses(courses.filter((c) => courseIds.includes(c.id)));
    } else {
      setFilteredCourses([]);
    }

    // Only reset course and section if semester actually changed (not on initial load)
    if (
      prevSemesterIdRef.current !== "" &&
      prevSemesterIdRef.current !== formData.semesterId
    ) {
      setFormData((prev) => ({
        ...prev,
        courseId: "",
        sectionId: "",
      }));
    }
    prevSemesterIdRef.current = formData.semesterId;
  }, [formData.semesterId, semesterCourseMap, courses]);

  // Filter sections based on selected course
  useEffect(() => {
    if (formData.courseId && courseSectionMap[formData.courseId]) {
      const sectionIds = courseSectionMap[formData.courseId];
      setFilteredSections(sections.filter((s) => sectionIds.includes(s.id)));
    } else {
      setFilteredSections([]);
    }

    // Only reset section if course actually changed (not on initial load)
    if (
      prevCourseIdRef.current !== "" &&
      prevCourseIdRef.current !== formData.courseId
    ) {
      setFormData((prev) => ({
        ...prev,
        sectionId: "",
      }));
    }
    prevCourseIdRef.current = formData.courseId;
  }, [formData.courseId, courseSectionMap, sections]);

  // Fetch active course modules when semesterId, courseId, or sectionId changes
  useEffect(() => {
    if (formData.semesterId && formData.courseId && formData.sectionId) {
      setLoadingCourseModules(true);
      courseModulesApi
        .list({
          semesterId: formData.semesterId,
          courseId: formData.courseId,
          sectionId: formData.sectionId,
          status: "active",
        })
        .then((res) => {
          setCourseModules(res.data?.modules || []);
          setLoadingCourseModules(false);
        })
        .catch(() => {
          setCourseModules([]);
          setLoadingCourseModules(false);
        });
    } else {
      setCourseModules([]);
      setLoadingCourseModules(false);
    }

    // Only reset courseModuleId if course actually changed (not on initial load during edit)
    if (
      prevCourseIdForModulesRef.current !== "" &&
      prevCourseIdForModulesRef.current !== formData.courseId
    ) {
      setFormData((prev) => ({ ...prev, courseModuleId: "" }));
    }
    prevCourseIdForModulesRef.current = formData.courseId;
  }, [formData.semesterId, formData.courseId, formData.sectionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Clear error for this field when user starts typing/selecting
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateUrl = (url) => {
    if (!url.trim()) return "URL is required";
    if (!url.trim().startsWith("https://"))
      return "URL must start with https:// (http:// is not allowed)";
    try {
      new URL(url.trim());
    } catch {
      return "Please enter a valid URL";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const newErrors = {};

    // Validate all required fields
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.semesterId) {
      newErrors.semesterId = "Please select a Semester";
    }
    if (!formData.courseId) {
      newErrors.courseId = "Please select a Course";
    }
    if (!formData.sectionId) {
      newErrors.sectionId = "Please select a Section";
    }
    if (!formData.courseModuleId) {
      newErrors.courseModuleId = "Please select a Course Module";
    }

    const urlErr = validateUrl(formData.url);
    if (urlErr) {
      newErrors.url = urlErr;
    }

    // If there are errors, set them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if validation passes
    setErrors({});

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description || undefined,
        url: formData.url.trim(),
        courseId: formData.courseId,
        sectionId: formData.sectionId || undefined,
        semesterId: formData.semesterId || undefined,
        courseModuleId: formData.courseModuleId,
      };
      await onSubmit(payload);
      handleClose();
    } catch (err) {
      console.error("Error submitting:", err);
      setErrors({
        submit:
          err?.response?.data?.error || "Failed to save. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      url: "",
      courseId: "",
      sectionId: "",
      semesterId: "",
      courseModuleId: "",
    });
    setErrors({});
    prevSemesterIdRef.current = "";
    prevCourseIdRef.current = "";
    prevCourseIdForModulesRef.current = "";
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg sm:max-w-[630px] max-h-[90vh] shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5" style={{ color: BRAND }} />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {isEdit ? "Edit Class Record" : "Add Class Record"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto"
        >
          {/* Title */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Recording Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Lecture 01 - Introduction to Algorithms"
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 ${
                errors.title ? "border-red-400" : "border-gray-300"
              }`}
              style={!errors.title ? { "--tw-ring-color": BRAND } : {}}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Description{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of this recording..."
              rows="3"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 resize-none"
              style={{ "--tw-ring-color": BRAND }}
            />
          </div>

          {/* Recording URL */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Recording URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://drive.google.com/... or https://youtube.com/..."
                className={`w-full pl-9 pr-4 py-2 sm:py-2.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 ${
                  errors.url ? "border-red-400" : "border-gray-300"
                }`}
                style={!errors.url ? { "--tw-ring-color": BRAND } : {}}
              />
            </div>
            {errors.url && (
              <p className="text-xs text-red-500 mt-1">{errors.url}</p>
            )}
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Semester */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Semester <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  { id: "", name: "Select Semester" },
                  ...semesters.map((s) => ({
                    id: s.id,
                    name: `${s.name || "Untitled Semester"} ${s.year ? `(${s.year})` : ""}`,
                  })),
                ]}
                value={formData.semesterId}
                onChange={(val) =>
                  handleChange({ target: { name: "semesterId", value: val } })
                }
                placeholder="Select Semester"
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={loadingDropdowns}
                dropdownAlign="right"
                dropdownDirection="up"
              />
              {errors.semesterId && (
                <p className="text-xs text-red-500 mt-1">{errors.semesterId}</p>
              )}
            </div>

            {/* Course */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name: formData.semesterId
                      ? `Select Course (${filteredCourses.length})`
                      : "Select Semester First",
                  },
                  ...filteredCourses.map((c) => ({ id: c.id, name: c.title })),
                ]}
                value={formData.courseId}
                onChange={(val) =>
                  handleChange({ target: { name: "courseId", value: val } })
                }
                placeholder="Select Course"
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={loadingDropdowns || !formData.semesterId}
                dropdownAlign="right"
                dropdownDirection="up"
              />
              {errors.courseId && (
                <p className="text-xs text-red-500 mt-1">{errors.courseId}</p>
              )}
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Section <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name: formData.courseId
                      ? `Select Section (${filteredSections.length})`
                      : "Select Course First",
                  },
                  ...filteredSections.map((s) => ({ id: s.id, name: s.name })),
                ]}
                value={formData.sectionId}
                onChange={(val) =>
                  handleChange({ target: { name: "sectionId", value: val } })
                }
                placeholder="Select Section"
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={loadingDropdowns || !formData.courseId}
                dropdownDirection="up"
              />
              {errors.sectionId && (
                <p className="text-xs text-red-500 mt-1">{errors.sectionId}</p>
              )}
            </div>

            {/* Course Module */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Course Module <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name: loadingCourseModules
                      ? "Loading…"
                      : !formData.semesterId
                        ? "Select semester first"
                        : !formData.courseId
                          ? "Select course first"
                          : !formData.sectionId
                            ? "Select section first"
                            : courseModules.length === 0
                              ? "No modules available"
                              : "Select module…",
                  },
                  ...courseModules.map((m) => ({ id: m.id, name: m.name })),
                ]}
                value={formData.courseModuleId}
                onChange={(val) =>
                  handleChange({
                    target: { name: "courseModuleId", value: val },
                  })
                }
                placeholder="Select module"
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={
                  loadingCourseModules ||
                  !formData.semesterId ||
                  !formData.courseId ||
                  !formData.sectionId ||
                  courseModules.length === 0
                }
                dropdownDirection="up"
              />
              {errors.courseModuleId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.courseModuleId}
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 sm:gap-4 justify-end p-4 sm:p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={(e) =>
              !loading && (e.currentTarget.style.backgroundColor = BRAND_DARK)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = BRAND)
            }
          >
            <Video className="w-4 h-4" />
            <span>
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Add Recording"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassRecordModal;
