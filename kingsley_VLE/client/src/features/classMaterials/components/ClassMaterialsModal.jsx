import React, { useState, useEffect } from "react";
import { X, Upload, Link } from "lucide-react";
import Swal from "sweetalert2";
import { classMaterialsApi } from "../api/classMaterials.api";
import { courseModulesApi } from "../../courseModules/api/courseModules.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";
const BRAND_DARK = "#5a1630";

const ClassMaterialsModal = ({ isOpen, onClose, onSubmit, editMaterial }) => {
  const isEdit = Boolean(editMaterial);
  const [inputMode, setInputMode] = useState("file"); // "file" | "url"
  const [formData, setFormData] = useState(() =>
    isEdit
      ? {
          title: editMaterial.title || "",
          description: editMaterial.description || "",
          fileId: editMaterial.fileId || "",
          fileUrl: editMaterial.fileUrl || "",
          courseId: editMaterial.courseId || "",
          sectionId: editMaterial.sectionId || "",
          semesterId: editMaterial.semesterId || "",
          courseModuleId:
            editMaterial.courseModule?.id || editMaterial.courseModuleId || "",
        }
      : {
          title: "",
          description: "",
          fileId: "",
          fileUrl: "",
          courseId: "",
          sectionId: "",
          semesterId: "",
          courseModuleId: "",
        },
  );

  // Update form data when editMaterial changes (on modal open during edit)
  useEffect(() => {
    if (isEdit && editMaterial) {
      setFormData({
        title: editMaterial.title || "",
        description: editMaterial.description || "",
        fileId: editMaterial.fileId || "",
        fileUrl: editMaterial.fileUrl || "",
        courseId: editMaterial.courseId || "",
        sectionId: editMaterial.sectionId || "",
        semesterId: editMaterial.semesterId || "",
        courseModuleId:
          editMaterial.courseModule?.id || editMaterial.courseModuleId || "",
      });

      // Set initial input mode and display previously uploaded file/URL
      if (editMaterial.fileUrl) {
        setInputMode("url");
        setUploadedFile(null);
      } else if (editMaterial.fileId) {
        setInputMode("file");
        // Set uploadedFile so previously uploaded file is displayed
        setUploadedFile({
          name:
            editMaterial.file.name ||
            `File-${editMaterial.fileId?.substring(0, 8)}`,
        });
      } else {
        setInputMode("file");
        setUploadedFile(null);
      }
    } else if (!isEdit && isOpen) {
      // Reset form when opening create modal (not in edit mode)
      setFormData({
        title: "",
        description: "",
        fileId: "",
        fileUrl: "",
        courseId: "",
        sectionId: "",
        semesterId: "",
        courseModuleId: "",
      });
      setInputMode("file");
      setUploadedFile(null);
      setUrlError("");
      setFieldErrors({});
    }
  }, [editMaterial, isEdit, isOpen]);

  // console.log("Edit Material:", editMaterial);

  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [urlError, setUrlError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courseModules, setCourseModules] = useState([]);
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
    // Only reset course and section when creating new material
    if (!isEdit) {
      setFormData((prev) => ({
        ...prev,
        courseId: "",
        sectionId: "",
      }));
    }
  }, [formData.semesterId, semesterCourseMap, courses, isEdit]);

  // Filter sections based on selected course
  useEffect(() => {
    if (formData.courseId && courseSectionMap[formData.courseId]) {
      const sectionIds = courseSectionMap[formData.courseId];
      const filtered = sections.filter((s) => sectionIds.includes(s.id));
      setFilteredSections(filtered);
    } else {
      setFilteredSections([]);
    }
    // Only reset section when creating new material
    if (!isEdit) {
      setFormData((prev) => ({
        ...prev,
        sectionId: "",
      }));
    }
  }, [formData.courseId, courseSectionMap, sections, isEdit]);

  // Ensure all semesters are always available
  useEffect(() => {
    setFilteredSemesters(semesters);
  }, [semesters]);

  // Fetch active course modules when courseId or sectionId changes
  useEffect(() => {
    if (formData.courseId) {
      courseModulesApi
        .list({
          courseId: formData.courseId,
          ...(formData.sectionId ? { sectionId: formData.sectionId } : {}),
          status: "active",
        })
        .then((res) => setCourseModules(res.data?.modules || []))
        .catch(() => setCourseModules([]));
    } else {
      setCourseModules([]);
    }
    // Only reset courseModuleId when creating new material
    if (!isEdit) {
      setFormData((prev) => ({ ...prev, courseModuleId: "" }));
    }
  }, [formData.courseId, formData.sectionId, isEdit]);

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
      // Clear materialSource error when file is uploaded
      setFieldErrors((prev) => ({ ...prev, materialSource: "" }));
    } catch (err) {
      console.error("Error uploading file:", err);
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: "Failed to upload file. Please try again.",
        confirmButtonText: "OK",
      });
      setUploadedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async () => {
    if (!uploadedFile || !uploadedFile.id) return;

    try {
      // Call delete API to remove file from Azure storage
      await classMaterialsApi.deleteFile(uploadedFile.id);

      // On success, update UI state
      setUploadedFile(null);
      setFormData((prev) => ({ ...prev, fileId: "" }));

      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "File removed successfully.",
        confirmButtonText: "OK",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error removing file:", err);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.error ||
          "Failed to remove file. Please try again.",
        confirmButtonText: "OK",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "fileUrl") {
      setUrlError("");
      setFormData((prev) => ({ ...prev, fileUrl: value, fileId: "" }));
      // Clear materialSource error when URL is entered
      if (value.trim()) {
        setFieldErrors((prev) => ({ ...prev, materialSource: "" }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear field error when user starts typing
      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
      }
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
    // Prevent mode switching in edit mode if a file/URL already exists
    if (isEdit && (formData.fileId || formData.fileUrl)) {
      return;
    }

    setInputMode(mode);
    setUrlError("");

    // In edit mode, preserve existing file/URL and only clear the non-active mode
    if (isEdit) {
      if (mode === "file") {
        // Switching to file mode - clear URL, keep file
        setFormData((prev) => ({ ...prev, fileUrl: "" }));
      } else {
        // Switching to URL mode - clear file, keep URL
        setFormData((prev) => ({ ...prev, fileId: "" }));
        setUploadedFile(null);
      }
    } else {
      // In create mode, clear everything
      setFormData((prev) => ({ ...prev, fileId: "", fileUrl: "" }));
      setUploadedFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    // Check title field
    if (!formData.title.trim()) {
      errors.title = "Material title is required";
    }

    // Check each field individually
    if (!formData.semesterId) {
      errors.semesterId = "Please select a Semester";
    }
    if (!formData.courseId) {
      errors.courseId = "Please select a Course";
    }
    if (!formData.sectionId) {
      errors.sectionId = "Please select a Section";
    }
    if (!formData.courseModuleId) {
      errors.courseModuleId = "Please select a Course Module";
    }

    // If there are errors, set them and return
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    // For new materials, require a file or URL
    if (!isEdit) {
      if (inputMode === "file" && !formData.fileId) {
        setFieldErrors((prev) => ({
          ...prev,
          materialSource: "Please upload a file",
        }));
        return;
      }

      if (inputMode === "url") {
        const err = validateUrl(formData.fileUrl);
        if (err) {
          setFieldErrors((prev) => ({
            ...prev,
            materialSource: err,
          }));
          return;
        }
      }
    } else {
      // For edits, only validate if changing to a different mode
      if (inputMode === "file" && !formData.fileId) {
        setFieldErrors((prev) => ({
          ...prev,
          materialSource: "Please upload a file or use the URL mode",
        }));
        return;
      }

      if (inputMode === "url") {
        const err = validateUrl(formData.fileUrl);
        if (err) {
          setFieldErrors((prev) => ({
            ...prev,
            materialSource: err,
          }));
          return;
        }
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
        courseModuleId: formData.courseModuleId || null,
      };
      if (inputMode === "file") {
        payload.fileId = formData.fileId;
      } else {
        payload.fileUrl = formData.fileUrl.trim();
      }

      if (isEdit) {
        await classMaterialsApi.update(editMaterial.id, payload);
      } else {
        await onSubmit(payload);
      }

      await Swal.fire({
        icon: "success",
        title: "Success",
        text: isEdit
          ? "Class material updated successfully!"
          : "Class material created successfully!",
        confirmButtonText: "OK",
      });

      // For edit mode, call onSubmit to refresh the list
      if (isEdit && onSubmit) {
        onSubmit();
      }

      handleClose();
    } catch (err) {
      console.error("Error submitting form:", err);
      const errorMessage =
        err.response?.data?.error ||
        "Failed to save material. Please try again.";
      await Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: errorMessage,
        confirmButtonText: "OK",
      });
      // Don't close modal on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(
      isEdit
        ? {
            title: editMaterial.title || "",
            description: editMaterial.description || "",
            fileId: editMaterial.fileId || "",
            fileUrl: editMaterial.fileUrl || "",
            courseId: editMaterial.courseId || "",
            sectionId: editMaterial.sectionId || "",
            semesterId: editMaterial.semesterId || "",
            courseModuleId:
              editMaterial.courseModule?.id ||
              editMaterial.courseModuleId ||
              "",
          }
        : {
            title: "",
            description: "",
            fileId: "",
            fileUrl: "",
            courseId: "",
            sectionId: "",
            semesterId: "",
            courseModuleId: "",
          },
    );
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
            {isEdit ? "Edit Class Material" : "Add New Class Material"}
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
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 ${
                fieldErrors.title
                  ? "border-red-400 focus:ring-red-300"
                  : "border-gray-300"
              }`}
              style={!fieldErrors.title ? { "--tw-ring-color": BRAND } : {}}
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>
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
                disabled={isEdit && (formData.fileId || formData.fileUrl)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium transition ${
                  inputMode === "file"
                    ? "text-white"
                    : "text-gray-600 bg-white hover:bg-gray-50"
                } ${isEdit && (formData.fileId || formData.fileUrl) ? "opacity-50 cursor-not-allowed" : ""}`}
                style={
                  inputMode === "file" &&
                  !(isEdit && (formData.fileId || formData.fileUrl))
                    ? { backgroundColor: BRAND }
                    : inputMode === "file"
                      ? { backgroundColor: "#999" }
                      : {}
                }
                title={
                  isEdit && (formData.fileId || formData.fileUrl)
                    ? "Material source cannot be changed"
                    : ""
                }
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("url")}
                disabled={isEdit && (formData.fileId || formData.fileUrl)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium transition border-l border-gray-300 ${
                  inputMode === "url"
                    ? "text-white"
                    : "text-gray-600 bg-white hover:bg-gray-50"
                } ${isEdit && (formData.fileId || formData.fileUrl) ? "opacity-50 cursor-not-allowed" : ""}`}
                style={
                  inputMode === "url" &&
                  !(isEdit && (formData.fileId || formData.fileUrl))
                    ? { backgroundColor: BRAND }
                    : inputMode === "url"
                      ? { backgroundColor: "#999" }
                      : {}
                }
                title={
                  isEdit && (formData.fileId || formData.fileUrl)
                    ? "Material source cannot be changed"
                    : ""
                }
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
                      disabled={
                        uploadingFile ||
                        (isEdit && (formData.fileId || formData.fileUrl))
                      }
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
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
                        PDF, DOCX, PPTX, XLSX, ZIP, etc.
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
                          {isEdit && (
                            <p className="text-xs text-gray-600 mt-1">
                              🔒(cannot be changed)
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={isEdit}
                        className={`ml-2 text-xs sm:text-sm font-medium flex-shrink-0 ${
                          isEdit
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:text-red-800"
                        }`}
                        title={
                          isEdit
                            ? "Cannot remove file in edit mode"
                            : "Remove file"
                        }
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
                    disabled={isEdit && formData.fileUrl}
                    placeholder="https://example.com/file.pdf"
                    className={`w-full pl-9 pr-4 py-2 sm:py-2.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 ${
                      urlError
                        ? "border-red-400 focus:ring-red-300"
                        : "border-gray-300"
                    } ${isEdit && formData.fileUrl ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    style={!urlError ? { "--tw-ring-color": BRAND } : {}}
                    title={
                      isEdit && formData.fileUrl
                        ? "URL cannot be changed in edit mode"
                        : ""
                    }
                  />
                </div>
                {isEdit && formData.fileUrl && (
                  <p className="text-xs text-gray-600 mt-1">
                    🔒(cannot be changed)
                  </p>
                )}
                {urlError && (
                  <p className="text-xs text-red-500 mt-1">{urlError}</p>
                )}
                {!formData.fileUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    Only https:// URLs are accepted
                  </p>
                )}
              </div>
            )}

            {/* Material Source error message */}
            {fieldErrors.materialSource && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors.materialSource}
              </p>
            )}
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Semester - First selector */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Semester <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  { id: "", name: "Select semester…" },
                  ...filteredSemesters.map((s) => ({
                    id: s.id,
                    name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                  })),
                ]}
                value={formData.semesterId}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, semesterId: val }));
                  setFieldErrors((prev) => ({ ...prev, semesterId: "" }));
                }}
                placeholder={loadingDropdowns ? "Loading…" : "Select semester…"}
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={loadingDropdowns}
                dropdownDirection="up"
                dropdownAlign="right"
              />
              {fieldErrors.semesterId && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.semesterId}
                </p>
              )}
            </div>

            {/* Course - Second selector (depends on semester) */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
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
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, courseId: val }));
                  setFieldErrors((prev) => ({ ...prev, courseId: "" }));
                }}
                placeholder={
                  !formData.semesterId
                    ? "Select semester first"
                    : "Select course…"
                }
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!formData.semesterId || loadingDropdowns}
                dropdownDirection="up"
                dropdownAlign="right"
              />
              {fieldErrors.courseId && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.courseId}
                </p>
              )}
            </div>

            {/* Section - Third selector (depends on course) */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Section <span className="text-red-500">*</span>
              </label>
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
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, sectionId: val }));
                  setFieldErrors((prev) => ({ ...prev, sectionId: "" }));
                }}
                placeholder={
                  !formData.courseId ? "Select course first" : "Select section…"
                }
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!formData.courseId || loadingDropdowns}
                dropdownDirection="up"
              />
              {fieldErrors.sectionId && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.sectionId}
                </p>
              )}
            </div>

            {/* Course Module - Fourth selector (required, depends on course) */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Course Module <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name:
                      courseModules.length === 0
                        ? !formData.courseId
                          ? "Select course first"
                          : "No modules available"
                        : "Select module…",
                  },
                  ...courseModules.map((m) => ({ id: m.id, name: m.name })),
                ]}
                value={formData.courseModuleId}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, courseModuleId: val }));
                  setFieldErrors((prev) => ({ ...prev, courseModuleId: "" }));
                }}
                placeholder={
                  !formData.courseId ? "Select course first" : "Select module…"
                }
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!formData.courseId || courseModules.length === 0}
                dropdownDirection="up"
              />
              {fieldErrors.courseModuleId && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.courseModuleId}
                </p>
              )}
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
            <span>
              {loading
                ? "Saving..."
                : isEdit
                  ? "Edit Material"
                  : "Add Material"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassMaterialsModal;
