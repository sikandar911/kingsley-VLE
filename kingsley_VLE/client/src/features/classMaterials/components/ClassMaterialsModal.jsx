import React, { useState, useEffect } from "react";
import { X, Upload, Link } from "lucide-react";
import { classMaterialsApi } from "../api/classMaterials.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";
const BRAND_DARK = "#5a1630";

const ClassMaterialsModal = ({ isOpen, onClose, onSubmit }) => {
  const [inputMode, setInputMode] = useState("file"); // "file" | "url"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fileId: "",
    fileUrl: "",
    courseId: "",
    sectionId: "",
    semesterId: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [urlError, setUrlError] = useState("");
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const [coursesRes, sectionsRes, semestersRes] = await Promise.all([
          classMaterialsApi.getCourses(),
          classMaterialsApi.getSections(),
          classMaterialsApi.getSemesters(),
        ]);
        const coursesList =
          coursesRes.data?.data ||
          coursesRes.data?.courses ||
          coursesRes.data ||
          [];
        const sectionsData = Array.isArray(sectionsRes.data)
          ? sectionsRes.data
          : sectionsRes.data?.data || sectionsRes.data || [];
        const semestersData = Array.isArray(semestersRes.data)
          ? semestersRes.data
          : semestersRes.data?.data || semestersRes.data || [];

        setCourses(coursesList);
        setSections(sectionsData);
        setSemesters(semestersData);
        setFilteredCourses(coursesList);
        setFilteredSections([]);
        setFilteredSemesters(semestersData);

        // Build semester -> courses map
        const semCourseMap = {};
        coursesList.forEach((course) => {
          const semId = course.semesterId;
          if (semId) {
            if (!semCourseMap[semId]) semCourseMap[semId] = [];
            if (!semCourseMap[semId].includes(course.id)) {
              semCourseMap[semId].push(course.id);
            }
          }
        });

        // Build course -> sections map
        const courseSectionMap = {};
        sectionsData.forEach((section) => {
          const cId = section.courseId;
          if (cId) {
            if (!courseSectionMap[cId]) courseSectionMap[cId] = [];
            if (!courseSectionMap[cId].includes(section.id)) {
              courseSectionMap[cId].push(section.id);
            }
          }
        });

        setSemesterCourseMap(semCourseMap);
        setCourseSectionMap(courseSectionMap);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        setCourses([]);
        setSections([]);
        setSemesters([]);
        setFilteredCourses([]);
        setFilteredSections([]);
        setFilteredSemesters([]);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    if (isOpen) fetchDropdownData();
  }, [isOpen]);

  // Filter courses based on selected semester
  useEffect(() => {
    if (formData.semesterId) {
      // If semester is selected, filter courses for that semester
      if (semesterCourseMap[formData.semesterId]) {
        const courseIds = semesterCourseMap[formData.semesterId];
        const filtered = courses.filter((c) => courseIds.includes(c.id));
        setFilteredCourses(filtered);
      } else {
        // Semester selected but has no courses
        setFilteredCourses([]);
      }
    } else {
      // No semester selected, show all courses
      setFilteredCourses(courses);
    }
    // Reset course and section when semester changes
    setFormData((prev) => ({
      ...prev,
      courseId: "",
      sectionId: "",
    }));
  }, [formData.semesterId, semesterCourseMap, courses]);

  // Filter sections based on selected course
  useEffect(() => {
    if (formData.courseId && courseSectionMap[formData.courseId]) {
      const sectionIds = courseSectionMap[formData.courseId];
      const filtered = sections.filter((s) => sectionIds.includes(s.id));
      setFilteredSections(filtered);
    } else {
      setFilteredSections([]);
    }
    // Reset section when course changes
    setFormData((prev) => ({
      ...prev,
      sectionId: "",
    }));
  }, [formData.courseId, courseSectionMap, sections]);

  // Ensure all semesters are always available
  useEffect(() => {
    setFilteredSemesters(semesters);
  }, [semesters]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFile(true);
      const response = await classMaterialsApi.uploadFile(
        file,
        "class_material",
      );
      const uploadedFileData = response.data;
      setUploadedFile(uploadedFileData);
      setFormData((prev) => ({
        ...prev,
        fileId: uploadedFileData.id,
        fileUrl: "",
      }));
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file. Please try again.");
      setUploadedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "fileUrl") {
      setUrlError("");
      setFormData((prev) => ({ ...prev, fileUrl: value, fileId: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleModeSwitch = (mode) => {
    setInputMode(mode);
    setUrlError("");
    setFormData((prev) => ({ ...prev, fileId: "", fileUrl: "" }));
    setUploadedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Material title is required");
      return;
    }
    if (!formData.courseId || !formData.sectionId || !formData.semesterId) {
      alert("Please select a Course, Section, and Semester");
      return;
    }

    if (inputMode === "file" && !formData.fileId) {
      alert("Please upload a file");
      return;
    }

    if (inputMode === "url") {
      const err = validateUrl(formData.fileUrl);
      if (err) {
        setUrlError(err);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        courseId: formData.courseId,
        sectionId: formData.sectionId,
        semesterId: formData.semesterId,
      };
      if (inputMode === "file") {
        payload.fileId = formData.fileId;
      } else {
        payload.fileUrl = formData.fileUrl.trim();
      }
      await onSubmit(payload);
      handleClose();
    } catch (err) {
      console.error("Error submitting form:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      fileId: "",
      fileUrl: "",
      courseId: "",
      sectionId: "",
      semesterId: "",
    });
    setUploadedFile(null);
    setUrlError("");
    setInputMode("file");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg sm:max-w-[635px] max-h-[90vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Add New Class Material
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 sm:space-y-5"
        >
          {/* Title */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Material Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Lecture 01 - Introduction to DBMS"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400"
              style={{ "--tw-ring-color": BRAND }}
            />
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
              placeholder="Provide a brief overview of the material..."
              rows="3"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 resize-none"
              style={{ "--tw-ring-color": BRAND }}
            />
          </div>

          {/* File / URL toggle */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Material Source <span className="text-red-500">*</span>
            </label>

            {/* Mode tabs */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-3">
              <button
                type="button"
                onClick={() => handleModeSwitch("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium transition ${
                  inputMode === "file"
                    ? "text-white"
                    : "text-gray-600 bg-white hover:bg-gray-50"
                }`}
                style={inputMode === "file" ? { backgroundColor: BRAND } : {}}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium transition border-l border-gray-300 ${
                  inputMode === "url"
                    ? "text-white"
                    : "text-gray-600 bg-white hover:bg-gray-50"
                }`}
                style={inputMode === "url" ? { backgroundColor: BRAND } : {}}
              >
                <Link className="w-4 h-4" />
                Enter URL
              </button>
            </div>

            {/* File upload zone */}
            {inputMode === "file" && (
              <div>
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer block"
                    >
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs sm:text-sm font-medium text-gray-700">
                        {uploadingFile
                          ? "Uploading..."
                          : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOCX, PPTX, etc.
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
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {uploadedFile.id?.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setFormData((prev) => ({ ...prev, fileId: "" }));
                        }}
                        className="ml-2 text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* URL input */}
            {inputMode === "url" && (
              <div>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="fileUrl"
                    value={formData.fileUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/file.pdf"
                    className={`w-full pl-9 pr-4 py-2 sm:py-2.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 ${
                      urlError
                        ? "border-red-400 focus:ring-red-300"
                        : "border-gray-300"
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
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Semester - First selector */}
            <div>
              <CustomDropdown
                options={[
                  { id: "", name: "Select semester…" },
                  ...filteredSemesters.map((s) => ({
                    id: s.id,
                    name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                  })),
                ]}
                value={formData.semesterId}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, semesterId: val }))
                }
                placeholder={loadingDropdowns ? "Loading…" : "Select semester…"}
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={loadingDropdowns}
              />
            </div>

            {/* Course - Second selector (depends on semester) */}
            <div>
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name: !formData.semesterId
                      ? "Select semester first"
                      : "Select course…",
                  },
                  ...filteredCourses.map((c) => ({
                    id: c.id,
                    name: c.title,
                  })),
                ]}
                value={formData.courseId}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, courseId: val }))
                }
                placeholder={
                  !formData.semesterId
                    ? "Select semester first"
                    : "Select course…"
                }
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!formData.semesterId || loadingDropdowns}
              />
            </div>

            {/* Section - Third selector (depends on course) */}
            <div>
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name: !formData.courseId
                      ? "Select course first"
                      : "Select section…",
                  },
                  ...filteredSections.map((s) => ({
                    id: s?.id,
                    name: s?.name,
                  })),
                ]}
                value={formData.sectionId}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, sectionId: val }))
                }
                placeholder={
                  !formData.courseId ? "Select course first" : "Select section…"
                }
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!formData.courseId || loadingDropdowns}
              />
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
            disabled={loading || uploadingFile}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={(e) =>
              !loading &&
              !uploadingFile &&
              (e.currentTarget.style.backgroundColor = BRAND_DARK)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = BRAND)
            }
          >
            {inputMode === "file" ? (
              <Upload className="w-4 h-4" />
            ) : (
              <Link className="w-4 h-4" />
            )}
            <span>{loading ? "Saving..." : "Add Material"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassMaterialsModal;
