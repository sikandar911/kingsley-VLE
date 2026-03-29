import React, { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { classMaterialsApi } from "../api/classMaterials.api";

const ClassMaterialsModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fileId: "",
    courseId: "",
    sectionId: "",
    semesterId: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const [coursesRes, sectionsRes, semestersRes] = await Promise.all([
          classMaterialsApi.getCourses(),
          classMaterialsApi.getSections(),
          classMaterialsApi.getSemesters(),
        ]);

        // Extract courses from response structure: { courses: [...], total, page, limit }
        const coursesData = coursesRes.data.courses || [];
        // Sections returns array directly: [...]
        const sectionsData = sectionsRes.data || sectionsRes || [];
        // Semesters returns array directly: [...]
        const semestersData = semestersRes.data || semestersRes || [];

        setCourses(coursesData);
        setSections(sectionsData);
        setSemesters(semestersData);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        // Set empty arrays on error
        setCourses([]);
        setSections([]);
        setSemesters([]);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      // Upload file to /files API with fileType "class-material"
      const response = await classMaterialsApi.uploadFile(
        file,
        "class-material",
      );
      const uploadedFileData = response.data;

      // Set the uploaded file info and fileId
      setUploadedFile(uploadedFileData);
      setFormData((prev) => ({
        ...prev,
        fileId: uploadedFileData.id,
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      formData.title &&
      formData.fileId &&
      formData.courseId &&
      formData.sectionId &&
      formData.semesterId
    ) {
      try {
        setLoading(true);
        await onSubmit(formData);
        setFormData({
          title: "",
          description: "",
          fileId: "",
          courseId: "",
          sectionId: "",
          semesterId: "",
        });
        setUploadedFile(null);
      } catch (err) {
        console.error("Error submitting form:", err);
      } finally {
        setLoading(false);
      }
    } else {
      alert(
        "Please fill in all required fields: Title, Upload File, Course, Section, and Semester",
      );
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      fileId: "",
      courseId: "",
      sectionId: "",
      semesterId: "",
    });
    setUploadedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* Modal Container */}
      <div className="bg-white rounded-lg w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto shadow-lg">
        {/* Modal Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
            Add New Class Material
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 sm:space-y-5"
        >
          {/* Material Title */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Material Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Lecture 01 - Introduction to DBMS"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400"
              style={{ "--tw-ring-color": "#6b1d3e" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a brief overview of the material..."
              rows="4"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 placeholder-gray-400 resize-none"
              style={{ "--tw-ring-color": "#6b1d3e" }}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Upload File *
            </label>
            <div className="relative">
              {!uploadedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
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
                <div className="border border-green-300 bg-green-50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          ID: {uploadedFile.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setFormData((prev) => ({ ...prev, fileId: "" }));
                      }}
                      className="flex-shrink-0 ml-2 text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dropdowns Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Course Dropdown */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Course
              </label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                disabled={loadingDropdowns}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 cursor-pointer bg-white text-gray-700 disabled:opacity-50"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                <option value="">Select Course</option>
                {Array.isArray(courses) && courses.length > 0 ? (
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))
                ) : (
                  <option disabled>No courses available</option>
                )}
              </select>
            </div>

            {/* Section Dropdown */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Section
              </label>
              <select
                name="sectionId"
                value={formData.sectionId}
                onChange={handleChange}
                disabled={loadingDropdowns}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 cursor-pointer bg-white text-gray-700 disabled:opacity-50"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                <option value="">Select Section</option>
                {Array.isArray(sections) && sections.length > 0 ? (
                  sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No sections available</option>
                )}
              </select>
            </div>

            {/* Semester Dropdown */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Semester
              </label>
              <select
                name="semesterId"
                value={formData.semesterId}
                onChange={handleChange}
                disabled={loadingDropdowns}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 cursor-pointer bg-white text-gray-700 disabled:opacity-50"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                <option value="">Select Semester</option>
                {Array.isArray(semesters) && semesters.length > 0 ? (
                  semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No semesters available</option>
                )}
              </select>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="sticky bottom-0 flex gap-3 sm:gap-4 justify-end p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#6b1d3e" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#5a1630")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#6b1d3e")}
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{loading ? "Uploading..." : "Upload Material"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassMaterialsModal;
