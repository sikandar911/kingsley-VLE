import { useState } from "react";

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState([
    {
      id: 1,
      name: "Introduction to React Hooks",
      type: "File Upload",
      course: "Web Development 101",
      availableFrom: "Mar 1, 2026, 08:00 AM",
      dueDate: "Mar 15, 2026, 11:59 PM",
      submissions: 28,
      totalStudents: 35,
      progress: 80,
      status: "Published",
      instructor: "Dr. Sarah Johnson",
    },
    {
      id: 2,
      name: "Database Design Project",
      type: "Project Submission",
      course: "Database Management",
      availableFrom: "Feb 20, 2026, 08:00 AM",
      dueDate: "Mar 10, 2026, 11:59 PM",
      submissions: 42,
      totalStudents: 45,
      progress: 93,
      status: "Published",
      instructor: "Prof. Michael Chen",
    },
    {
      id: 3,
      name: "Weekly Quiz - Chapter 5",
      type: "Online Quiz",
      course: "Data Structures",
      availableFrom: "Mar 8, 2026, 09:00 AM",
      dueDate: "Mar 22, 2026, 11:59 PM",
      submissions: 15,
      totalStudents: 30,
      progress: 50,
      status: "Published",
      instructor: "Dr. Sarah Johnson",
    },
    {
      id: 4,
      name: "Algorithm Analysis Essay",
      type: "Essay",
      course: "Algorithms",
      availableFrom: "Mar 5, 2026, 08:00 AM",
      dueDate: "Mar 8, 2026, 11:59 PM",
      submissions: 18,
      totalStudents: 20,
      progress: 90,
      status: "Closed",
      instructor: "Dr. Emily Rodriguez",
    },
    {
      id: 5,
      name: "Machine Learning Lab",
      type: "Lab Work",
      course: "Machine Learning 101",
      availableFrom: "Mar 18, 2026, 08:00 AM",
      dueDate: "Apr 1, 2026, 11:59 PM",
      submissions: 0,
      totalStudents: 25,
      progress: 0,
      status: "Draft",
      instructor: "Prof. Michael Chen",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("All Courses");
  const [filterSection, setFilterSection] = useState("All Sections");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useState(null)[1]; // Using simplified ref pattern
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    teacher: "",
    course: "",
    section: "",
    instructions: "",
    totalMarks: 100,
    passingMarks: 40,
    availableFrom: "",
    submissionDeadline: "",
    allowLateSubmission: false,
    assignmentType: "File Upload",
    allowedFileTypes: [],
    status: "Draft",
  });

  const stats = [
    { label: "Total Assignments", value: "6", icon: "📋", bg: "bg-blue-50" },
    {
      label: "Submissions Received",
      value: "135",
      icon: "📥",
      bg: "bg-green-50",
    },
    { label: "Pending Grading", value: "135", icon: "⏳", bg: "bg-orange-50" },
    {
      label: "Average Class Mark",
      value: "67.5%",
      icon: "📊",
      bg: "bg-purple-50",
    },
  ];

  const filteredAssignments = assignments.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateAssignment = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log("Creating assignment:", formData);
    console.log("Uploaded files:", uploadedFiles);
    setShowCreateForm(false);
    setFormData({
      title: "",
      description: "",
      teacher: "",
      course: "",
      section: "",
      instructions: "",
      totalMarks: 100,
      passingMarks: 40,
      availableFrom: "",
      submissionDeadline: "",
      allowLateSubmission: false,
      assignmentType: "File Upload",
      allowedFileTypes: [],
      status: "Draft",
    });
    setUploadedFiles([]);
  };

  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).map((file) => ({
      id: Math.random(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputClick = () => {
    const input = document.getElementById("referenceFileInput");
    input?.click();
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleOpenPreview = (assignment) => {
    setSelectedAssignment(assignment);
    setShowPreview(true);
  };

  const handleDownloadFile = (fileName) => {
    // Placeholder for file download logic
    console.log("Downloading file:", fileName);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Assignment Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Assignments › List</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2.5 bg-[#6b1142] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition"
          >
            + Create New Assignment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm border border-gray-200"
            >
              <div
                className={`${stat.bg} w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 pb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
          >
            <option>All Courses</option>
            <option>Web Development 101</option>
            <option>Database Management</option>
            <option>Data Structures</option>
            <option>Algorithms</option>
          </select>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
          >
            <option>All Sections</option>
            <option>Section A</option>
            <option>Section B</option>
            <option>Section C</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Assignment Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Timeline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Submission Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {assignment.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {assignment.type}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <p className="text-gray-900">
                        📅 {assignment.availableFrom}
                      </p>
                      <p className="text-red-600 mt-1">
                        Due: {assignment.dueDate}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#6b1142] h-2 rounded-full"
                              style={{ width: `${assignment.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                          {assignment.submissions}/{assignment.totalStudents}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {assignment.progress}%
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          assignment.status === "Published"
                            ? "bg-green-100 text-green-700"
                            : assignment.status === "Draft"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {assignment.instructor}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPreview(assignment)}
                          className="p-1.5 hover:bg-gray-100 rounded transition"
                          title="Preview"
                        >
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded transition"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded transition"
                          title="Copy"
                        >
                          🔗
                        </button>
                        <button
                          className="p-1.5 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assignment Preview Modal */}
      {showPreview && selectedAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Fixed Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 font-poppins">
                  {selectedAssignment.name}
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  Course:{" "}
                  <span className="font-semibold">
                    {selectedAssignment.course}
                  </span>{" "}
                  | Type:{" "}
                  <span className="font-semibold">
                    {selectedAssignment.type}
                  </span>{" "}
                  | Instructor:{" "}
                  <span className="font-semibold">
                    {selectedAssignment.instructor}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    selectedAssignment.status === "Published"
                      ? "bg-green-100 text-green-700"
                      : selectedAssignment.status === "Draft"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedAssignment.status}
                </span>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column (65%) */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Description Section */}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-3 font-poppins">
                        Description
                      </h2>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        {selectedAssignment.name && selectedAssignment.type
                          ? `${selectedAssignment.type} assignment: ${selectedAssignment.name}. This assignment tests your understanding of the core concepts covered in this course.`
                          : "No description provided"}
                      </p>
                    </div>

                    {/* Instructions Section */}
                    <div className="bg-slate-50 rounded-lg p-6 border border-gray-200">
                      <h2 className="text-lg font-bold text-gray-900 mb-3 font-poppins">
                        Instructions
                      </h2>
                      <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed font-inter">
                        {`1. Read all requirements carefully before starting\n2. Complete all sections of the assignment\n3. Submit before the deadline\n4. Ensure your submission is well-formatted\n5. Ask for clarification if needed`}
                      </div>
                    </div>

                    {/* Attachments Section */}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-3 font-poppins">
                        Reference Materials
                      </h2>
                      <div className="space-y-2">
                        {/* Sample files - in real app this would be from selectedAssignment */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition">
                          <div className="flex items-center gap-3">
                            <svg
                              className="w-6 h-6 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Course_Guidelines.pdf
                              </p>
                              <p className="text-xs text-gray-500">2.4 MB</p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleDownloadFile("Course_Guidelines.pdf")
                            }
                            className="px-3 py-1.5 bg-[#6b1142] text-white text-xs font-medium rounded hover:bg-[#5a0d38] transition"
                          >
                            Download
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition">
                          <div className="flex items-center gap-3">
                            <svg
                              className="w-6 h-6 text-orange-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Assignment_Template.docx
                              </p>
                              <p className="text-xs text-gray-500">856 KB</p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleDownloadFile("Assignment_Template.docx")
                            }
                            className="px-3 py-1.5 bg-[#6b1142] text-white text-xs font-medium rounded hover:bg-[#5a0d38] transition"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (35%) */}
                  <div className="space-y-6">
                    {/* Timeline Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 font-poppins uppercase">
                        Timeline
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Available From
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedAssignment.availableFrom}
                          </p>
                        </div>
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-xs text-gray-500 mb-1">Due Date</p>
                          <p className="text-sm font-semibold text-red-600">
                            {selectedAssignment.dueDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Grading Grid */}
                    <div className=" border border-gray-200 rounded-lg p-6 ">
                      <h3 className="text-sm font-bold mb-4 uppercase">
                        Grading
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#f0f4f8] rounded p-3">
                          <p className="text-xs opacity-90 mb-1">Total Marks</p>
                          <p className="text-2xl font-bold">100</p>
                        </div>
                        <div className="bg-[#f0f4f8] rounded p-3">
                          <p className="text-xs opacity-90 mb-1">
                            Passing Marks
                          </p>
                          <p className="text-2xl font-bold">40</p>
                        </div>
                      </div>
                    </div>

                    {/* Rules & Settings */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          Assignment Type
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedAssignment.type}
                        </p>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs text-gray-500 mb-2">
                          Late Submission
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">✓</span>
                          <p className="text-sm text-gray-700">
                            Allowed with penalty
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs text-gray-500 mb-2">
                          Submission Progress
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#6b1142] h-2 rounded-full"
                              style={{
                                width: `${selectedAssignment.progress}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {selectedAssignment.submissions}/
                            {selectedAssignment.totalStudents}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedAssignment.progress}% submitted
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Last updated: Mar 12, 2026, 2:30 PM
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-[#6b1142] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition">
                  Edit Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Assignment
              </h1>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: "Draft" }));
                    handleCreateAssignment({ preventDefault: () => {} });
                  }}
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: "Published" }));
                    handleCreateAssignment({ preventDefault: () => {} });
                  }}
                  className="px-5 py-2.5 bg-[#6b1142] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition"
                >
                  Publish Assignment
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleCreateAssignment} className="p-8 space-y-6">
                {/* Top Selection Row */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Assigning Teacher
                      </label>
                      <input
                        type="text"
                        name="teacher"
                        value={formData.teacher}
                        onChange={handleInputChange}
                        placeholder="Search teacher..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Select Course
                      </label>
                      <select
                        name="course"
                        value={formData.course}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] appearance-none cursor-pointer bg-white"
                      >
                        <option value="">Select course...</option>
                        <option value="101">Web Development 101</option>
                        <option value="102">Database Management</option>
                        <option value="103">Data Structures</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Select Section
                      </label>
                      <select
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] appearance-none cursor-pointer bg-white"
                      >
                        <option value="">Select section...</option>
                        <option value="A1">Section A</option>
                        <option value="B1">Section B</option>
                        <option value="C1">Section C</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column (50% width) */}
                  <div className="space-y-6">
                    {/* Assignment Title */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Assignment Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter assignment title..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                    </div>

                    {/* Description */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter assignment description..."
                        rows="3"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Instructions
                      </label>
                      <textarea
                        name="instructions"
                        value={formData.instructions}
                        onChange={handleInputChange}
                        placeholder="Provide detailed instructions for students..."
                        rows="4"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                      />
                    </div>

                    {/* Reference Materials */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">
                        Reference Materials
                      </h3>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleFileInputClick}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                          isDragging
                            ? "border-[#6b1142] bg-[#6b1142]/5"
                            : "border-gray-300 hover:border-[#6b1142] hover:bg-gray-50"
                        }`}
                      >
                        <input
                          id="referenceFileInput"
                          type="file"
                          multiple
                          onChange={(e) => handleFileSelect(e.target.files)}
                          className="hidden"
                          accept=".pdf,.docx,.doc,.txt,.pptx,.jpg,.jpeg,.png,.gif"
                        />
                        <div className="text-4xl mb-2">📤</div>
                        <p className="text-sm text-gray-600">
                          Drop files here or click to upload
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Supports PDF, DOCX, images, and more
                        </p>
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">
                            Uploaded Files ({uploadedFiles.length})
                          </p>
                          {uploadedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between bg-gray-50 rounded p-3 text-xs"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm">📄</span>
                                <div className="min-w-0">
                                  <p className="text-gray-700 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-gray-500">
                                    {file.size} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(file.id);
                                }}
                                className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (50% width) */}
                  <div className="space-y-6">
                    {/* Timeline Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">
                        Available From
                      </h3>
                      <input
                        type="date"
                        name="availableFrom"
                        value={formData.availableFrom}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                      <input
                        type="time"
                        name="availableFromTime"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] mt-2"
                      />
                    </div>

                    {/* Deadline Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">
                        Submission Deadline
                      </h3>
                      <input
                        type="date"
                        name="submissionDeadline"
                        value={formData.submissionDeadline}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                      <input
                        type="time"
                        name="submissionDeadlineTime"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] mt-2"
                      />
                    </div>

                    {/* Marks Configuration */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">
                        Marks Configuration
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Total Marks
                          </label>
                          <input
                            type="number"
                            name="totalMarks"
                            value={formData.totalMarks}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Passing Marks
                          </label>
                          <input
                            type="number"
                            name="passingMarks"
                            value={formData.passingMarks}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Late Submission Toggle */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-900">
                        Allow Late Submission
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="allowLateSubmission"
                          checked={formData.allowLateSubmission}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#6b1142] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6b1142]" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Advanced Settings
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Assignment Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Assignment Type
                      </label>
                      <select
                        name="assignmentType"
                        value={formData.assignmentType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] appearance-none cursor-pointer bg-white"
                      >
                        <option value="File Upload">File Upload</option>
                        <option value="Essay">Essay</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Project">Project</option>
                      </select>
                    </div>

                    {/* Allowed File Types */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Allowed File Types
                      </label>
                      <select
                        multiple
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      >
                        <option value="pdf">.pdf</option>
                        <option value="docx">.docx</option>
                        <option value="zip">.zip</option>
                        <option value="jpg">.jpg</option>
                        <option value="png">.png</option>
                      </select>
                    </div>

                    {/* Status / Visibility */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Status / Visibility
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="status"
                            value="Draft"
                            checked={formData.status === "Draft"}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Draft</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="status"
                            value="Published"
                            checked={formData.status === "Published"}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            Published
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="status"
                            value="Private"
                            checked={formData.status === "Private"}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Private</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
