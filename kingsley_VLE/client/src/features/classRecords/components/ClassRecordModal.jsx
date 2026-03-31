import React, { useState, useEffect } from "react";
import { X, Upload, Link, Video } from "lucide-react";
import { classRecordsApi } from "../api/classRecords.api";

const BRAND = "#6b1d3e";
const BRAND_DARK = "#5a1630";

const ClassRecordModal = ({ isOpen, onClose, onSubmit, record }) => {
  const isEdit = Boolean(record);
  const [inputMode, setInputMode] = useState("url"); // "url" | "file"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    courseId: "",
    sectionId: "",
    semesterId: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [urlError, setUrlError] = useState("");
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [relationshipMap, setRelationshipMap] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

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
      });
      setInputMode("url");
    }
    const fetchDropdowns = async () => {
      try {
        setLoadingDropdowns(true);
        const [cRes, sRes, smRes] = await Promise.all([
          classRecordsApi.getCourses(),
          classRecordsApi.getSections(),
          classRecordsApi.getSemesters(),
        ]);
        const coursesList = cRes.data.courses || [];
        const sectionsData = Array.isArray(sRes.data) ? sRes.data : sRes || [];
        const semestersData = Array.isArray(smRes.data)
          ? smRes.data
          : smRes || [];

        setCourses(coursesList);
        setSections(sectionsData);
        setSemesters(semestersData);
        setFilteredSections(sectionsData);
        setFilteredSemesters(semestersData);

        // Build relationship map from sections
        const map = {};
        sectionsData.forEach((section) => {
          const courseId = section.courseId;
          const semesterId = section.semesterId;
          const sectionId = section.id;

          if (!map[courseId]) map[courseId] = { sections: [], semesters: [] };
          if (!map[courseId].sections.includes(sectionId)) {
            map[courseId].sections.push(sectionId);
          }
          if (semesterId && !map[courseId].semesters.includes(semesterId)) {
            map[courseId].semesters.push(semesterId);
          }
        });
        setRelationshipMap(map);
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdowns();
  }, [isOpen, record]);

  // Filter sections and semesters based on selected course + reset selections
  useEffect(() => {
    if (formData.courseId && relationshipMap[formData.courseId]) {
      const relatedSectionIds = relationshipMap[formData.courseId].sections;
      const relatedSemesterIds = relationshipMap[formData.courseId].semesters;
      setFilteredSections(
        sections.filter((s) => relatedSectionIds.includes(s.id)),
      );
      setFilteredSemesters(
        semesters.filter((s) => relatedSemesterIds.includes(s.id)),
      );
    } else {
      setFilteredSections(sections);
      setFilteredSemesters(semesters);
    }
    // Reset section and semester when course changes
    setFormData((prev) => ({
      ...prev,
      sectionId: "",
      semesterId: "",
    }));
  }, [formData.courseId, relationshipMap, sections, semesters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "url") setUrlError("");
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
      // Store the azure blob URL in the url field
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
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!formData.courseId) {
      alert("Please select a Course");
      return;
    }

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
        courseId: formData.courseId,
        sectionId: formData.sectionId || undefined,
        semesterId: formData.semesterId || undefined,
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
      courseId: "",
      sectionId: "",
      semesterId: "",
    });
    setUrlError("");
    setUploadedFileName("");
    setInputMode("url");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg sm:max-w-[630px] max-h-[90vh] overflow-y-auto shadow-lg">
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
          onSubmit={handleSubmit}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                disabled={loadingDropdowns || isEdit}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 cursor-pointer bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ "--tw-ring-color": BRAND }}
              >
                <option value="">Select Course({courses.length})</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Section
              </label>
              <select
                name="sectionId"
                value={formData.sectionId}
                onChange={handleChange}
                disabled={loadingDropdowns || !formData.courseId}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 cursor-pointer bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ "--tw-ring-color": BRAND }}
              >
                <option value="">
                  {formData.courseId
                    ? `All Sections (${filteredSections.length})`
                    : "Select Course First"}
                </option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Semester
              </label>
              <select
                name="semesterId"
                value={formData.semesterId}
                onChange={handleChange}
                disabled={loadingDropdowns || !formData.courseId}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 cursor-pointer bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ "--tw-ring-color": BRAND }}
              >
                <option value="">
                  {formData.courseId
                    ? `All Semesters (${filteredSemesters.length})`
                    : "Select Course First"}
                </option>
                {filteredSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
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
