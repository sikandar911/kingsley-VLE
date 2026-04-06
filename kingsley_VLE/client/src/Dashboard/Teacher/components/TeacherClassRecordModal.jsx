import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Link, Video } from "lucide-react";
import { classRecordsApi } from "../../../features/classRecords/api/classRecords.api";
import { teacherClassRecordsApi } from "../api/classRecords/teacherClassRecords.api";
import CustomDropdown from "../../../features/classRecords/components/CustomDropdown";

const BRAND = "#6b1d3e";
const BRAND_DARK = "#5a1630";

const TeacherClassRecordModal = ({ isOpen, onClose, onSubmit, record }) => {
  const isEdit = Boolean(record);
  const [inputMode, setInputMode] = useState("url"); // "url" | "file"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    semesterId: "",
    courseId: "",
    sectionId: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [urlError, setUrlError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [courseError, setCourseError] = useState("");
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const prevSemesterIdRef = useRef(null);
  const prevCourseIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Populate form when editing
    if (record) {
      setFormData({
        title: record.title || "",
        description: record.description || "",
        url: record.url || "",
        semesterId: record.semesterId || "",
        courseId: record.courseId || "",
        sectionId: record.sectionId || "",
      });
      // Initialize refs with the existing values so they don't get cleared
      prevSemesterIdRef.current = record.semesterId || "";
      prevCourseIdRef.current = record.courseId || "";
      setInputMode("url");
    }

    const fetchDropdowns = async () => {
      try {
        setLoadingDropdowns(true);

        // Fetch teacher's assigned courses and ALL courses (for semesterId)
        const { courses: teacherCoursesList } =
          await teacherClassRecordsApi.getTeacherCourses();
        const allCoursesRes = await classRecordsApi.getCourses();
        const allCourses = allCoursesRes.data?.data || [];

        // Fetch all sections and semesters
        const [sectionsRes, semestersRes] = await Promise.all([
          classRecordsApi.getSections(),
          classRecordsApi.getSemesters(),
        ]);
        const sectionsData = Array.isArray(sectionsRes.data)
          ? sectionsRes.data
          : sectionsRes || [];
        const semestersData = Array.isArray(semestersRes.data)
          ? semestersRes.data
          : semestersRes || [];

        // Get teacher's course IDs
        const teacherCourseIds = teacherCoursesList.map((c) => c.id);

        // Filter ALL courses to only include those assigned to teacher, and enrich with semesterId
        const enrichedTeacherCourses = allCourses.filter((c) =>
          teacherCourseIds.includes(c.id),
        );

        console.log("Teacher Assigned Course IDs:", teacherCourseIds);
        console.log("All Courses:", allCourses);
        console.log("Enriched Teacher Courses:", enrichedTeacherCourses);
        console.log("All Sections:", sectionsData);
        console.log("All Semesters:", semestersData);

        setCourses(enrichedTeacherCourses);
        setSections(sectionsData);
        setSemesters(semestersData);

        // Build semester -> courses map from enriched teacher courses
        const semCxMap = {};
        enrichedTeacherCourses.forEach((course) => {
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

        console.log("Semester course map:", semCxMap);
        console.log("Course section map:", cxSecMap);
        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);
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

    // Only reset course and section if the semester actually changed by user action
    if (
      formData.semesterId !== prevSemesterIdRef.current &&
      prevSemesterIdRef.current !== null
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
      // Sections already filtered via map
    } else {
      // Reset section only if course actually changed by user action
      if (
        formData.courseId !== prevCourseIdRef.current &&
        prevCourseIdRef.current !== null
      ) {
        setFormData((prev) => ({
          ...prev,
          sectionId: "",
        }));
      }
    }
    prevCourseIdRef.current = formData.courseId;
  }, [formData.courseId, courseSectionMap]);

  const getFilteredSections = () => {
    if (formData.courseId && courseSectionMap[formData.courseId]) {
      const sectionIds = courseSectionMap[formData.courseId];
      return sections.filter((s) => sectionIds.includes(s.id));
    }
    return [];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "url") setUrlError("");
    if (name === "title") setTitleError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeSwitch = (mode) => {
    setInputMode(mode);
    setUrlError("");
    setFormData((prev) => ({ ...prev, url: "" }));
    setUploadedFileName("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFile(true);
      const res = await classRecordsApi.uploadFile(file);
      const fileData = res.data;
      setFormData((prev) => ({ ...prev, url: fileData.fileUrl }));
      setUploadedFileName(fileData.name || file.name);
      setUrlError("");
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
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

    let hasError = false;

    if (!formData.title.trim()) {
      setTitleError("Title is required");
      hasError = true;
    } else {
      setTitleError("");
    }

    if (!formData.courseId) {
      setCourseError("Please select a Course");
      hasError = true;
    } else {
      setCourseError("");
    }

    if (hasError) return;

    const urlErr = validateUrl(formData.url);
    if (urlErr) {
      setUrlError(urlErr);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description || undefined,
        url: formData.url.trim(),
        semesterId: formData.semesterId || undefined,
        courseId: formData.courseId,
        sectionId: formData.sectionId || undefined,
      };
      await onSubmit(payload);
      handleClose();
    } catch (err) {
      console.error("Error submitting:", err);
      alert(err?.response?.data?.error || "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      url: "",
      semesterId: "",
      courseId: "",
      sectionId: "",
    });
    setUrlError("");
    setTitleError("");
    setCourseError("");
    setUploadedFileName("");
    setInputMode("url");
    onClose();
  };

  if (!isOpen) return null;

  const filteredSections = getFilteredSections();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg sm:max-w-[680px] max-h-[90vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white">
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
          onSubmit={(e) => e.preventDefault()}
          className="p-4 sm:p-6 space-y-4 sm:space-y-5"
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
                titleError ? "border-red-400" : "border-gray-300"
              }`}
              style={{ "--tw-ring-color": BRAND }}
            />
            {titleError && (
              <p className="text-xs text-red-500 mt-1">{titleError}</p>
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

          {/* URL / File toggle */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Recording Source <span className="text-red-500">*</span>
            </label>

            <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-3">
              <button
                type="button"
                onClick={() => handleModeSwitch("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium transition ${
                  inputMode === "url"
                    ? "text-white"
                    : "text-gray-600 bg-white hover:bg-gray-50"
                }`}
                style={inputMode === "url" ? { backgroundColor: BRAND } : {}}
              >
                <Link className="w-4 h-4" />
                Enter URL
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium transition border-l border-gray-300 ${
                  inputMode === "file"
                    ? "text-white"
                    : "text-gray-600 bg-white hover:bg-gray-50"
                }`}
                style={inputMode === "file" ? { backgroundColor: BRAND } : {}}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
            </div>

            {/* URL Input */}
            {inputMode === "url" && (
              <div>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/... or https://youtube.com/..."
                    className={`w-full pl-9 pr-4 py-2 sm:py-2.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 ${
                      urlError ? "border-red-400" : "border-gray-300"
                    }`}
                    style={!urlError ? { "--tw-ring-color": BRAND } : {}}
                  />
                </div>
                {urlError && (
                  <p className="text-xs text-red-500 mt-1">{urlError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Only https:// URLs are accepted
                </p>
              </div>
            )}

            {/* File Upload */}
            {inputMode === "file" && (
              <div>
                {!uploadedFileName ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <input
                      type="file"
                      accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                      id="record-file-upload"
                    />
                    <label
                      htmlFor="record-file-upload"
                      className="cursor-pointer block"
                    >
                      <Video className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs sm:text-sm font-medium text-gray-700">
                        {uploadingFile
                          ? "Uploading..."
                          : "Click to upload video file"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        MP4, MOV, AVI, MKV, etc.
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="border border-green-300 bg-green-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg
                          className="w-5 h-5 text-green-600 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {uploadedFileName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileName("");
                          setFormData((prev) => ({ ...prev, url: "" }));
                        }}
                        className="ml-2 text-red-600 hover:text-red-800 text-xs font-medium flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                {urlError && (
                  <p className="text-xs text-red-500 mt-1">{urlError}</p>
                )}
              </div>
            )}
          </div>

          {/* Dropdowns */}
          <div className="space-y-4 sm:space-y-5">
            {/* Loading Indicator */}
            {loadingDropdowns && (
              <div className="flex items-center justify-center gap-2 p-4">
                <div
                  className="w-5 h-5 border-2 border-gray-200 rounded-full animate-spin"
                  style={{ borderTopColor: BRAND }}
                />
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  Loading courses...
                </p>
              </div>
            )}

            {/* Semester and Course Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Semester */}
              <div>
                <CustomDropdown
                  options={semesters.map((s) => ({
                    id: s.id,
                    name: s.name || "Untitled Semester",
                  }))}
                  value={formData.semesterId}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      semesterId: val,
                    }))
                  }
                  placeholder="Select Semester"
                  label="Semester"
                  isSmallScreen={false}
                  BRAND={BRAND}
                  disabled={loadingDropdowns}
                />
              </div>

              {/* Course */}
              <div>
                <CustomDropdown
                  options={filteredCourses.map((c) => ({
                    id: c.id,
                    name: c.title || "Untitled Course",
                  }))}
                  value={formData.courseId}
                  onChange={(val) => {
                    setCourseError("");
                    setFormData((prev) => ({
                      ...prev,
                      courseId: val,
                    }));
                  }}
                  placeholder="Select Course"
                  label="Course"
                  isSmallScreen={false}
                  BRAND={BRAND}
                  disabled={loadingDropdowns || !formData.semesterId}
                />
                {formData.semesterId && filteredCourses.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mt-2">
                    <p className="text-xs sm:text-sm text-blue-800 font-medium">
                      No courses assigned to you. Please contact the
                      administrator.
                    </p>
                  </div>
                ) : (
                  courseError && (
                    <p className="text-xs text-red-500 mt-1">{courseError}</p>
                  )
                )}
              </div>

              {/* Section */}
              <div>
                <CustomDropdown
                  options={getFilteredSections().map((s) => ({
                    id: s.id,
                    name: s.name || "Untitled Section",
                  }))}
                  value={formData.sectionId}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      sectionId: val,
                    }))
                  }
                  placeholder="Select Section"
                  label="Section"
                  isSmallScreen={false}
                  BRAND={BRAND}
                  disabled={loadingDropdowns || !formData.courseId}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 sm:gap-4 justify-end p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
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
            disabled={
              loading ||
              uploadingFile ||
              loadingDropdowns ||
              courses.length === 0
            }
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={(e) =>
              !loading &&
              !uploadingFile &&
              !loadingDropdowns &&
              courses.length > 0 &&
              (e.currentTarget.style.backgroundColor = BRAND_DARK)
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

export default TeacherClassRecordModal;
