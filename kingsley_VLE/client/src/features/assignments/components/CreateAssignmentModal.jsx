import { useState, useEffect } from "react";
import { assignmentsApi } from "../api/assignments.api";
import { useAuth } from "../../../context/AuthContext";

const INITIAL = {
  teacherId: "",
  courseId: "",
  sectionId: "",
  title: "",
  description: "",
  teacherInstruction: "",
  dueDate: "",
  totalMarks: 100,
  passingMarks: 40,
  allowLateSubmission: false,
  status: "draft",
};

const toLocalDt = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function CreateAssignmentModal({
  onClose,
  onSaved,
  editAssignment,
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEdit = Boolean(editAssignment);

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          ...INITIAL,
          teacherId: editAssignment.teacher?.id || "",
          courseId: editAssignment.courseId || "",
          sectionId: editAssignment.sectionId || "",
          title: editAssignment.title || "",
          description: editAssignment.description || "",
          teacherInstruction: editAssignment.teacherInstruction || "",
          dueDate: toLocalDt(editAssignment.dueDate),
          totalMarks: editAssignment.totalMarks ?? 100,
          passingMarks: editAssignment.passingMarks ?? 40,
          allowLateSubmission: Boolean(editAssignment.allowLateSubmission),
          status: editAssignment.status || "draft",
        }
      : INITIAL,
  );

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    assignmentsApi
      .getMeta()
      .then((res) => {
        const courseList = res.data.courses || [];
        setCourses(courseList);
        setTeachers(res.data.teachers || []);
        if (form.courseId) {
          const c = courseList.find((c) => c.id === form.courseId);
          setSections(c?.sections || []);
        }
      })
      .catch(() =>
        setError("Failed to load form data. Make sure the server is running."),
      )
      .finally(() => setMetaLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "courseId") {
      const course = courses.find((c) => c.id === value);
      setSections(course?.sections || []);
      setForm((prev) => ({ ...prev, courseId: value, sectionId: "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Assignment title is required";
    if (!form.courseId) return "Please select a course";
    if (isAdmin && !form.teacherId) return "Please select a teacher";
    const total = Number(form.totalMarks);
    if (!total || total <= 0) return "Total marks must be a positive number";
    if (form.passingMarks !== "" && Number(form.passingMarks) > total)
      return `Passing marks cannot exceed total marks (${total})`;
    return null;
  };

  const submit = async (statusOverride) => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.teacherInstruction || null,
        courseId: form.courseId,
        sectionId: form.sectionId || null,
        dueDate: form.dueDate || null,
        totalMarks: Number(form.totalMarks),
        passingMarks:
          form.passingMarks !== "" ? Number(form.passingMarks) : null,
        allowLateSubmission: Boolean(form.allowLateSubmission),
        status: statusOverride || form.status,
        targetType: form.sectionId ? "section" : "individual",
        ...(isAdmin && form.teacherId ? { teacherId: form.teacherId } : {}),
      };
      if (isEdit) {
        await assignmentsApi.update(editAssignment.id, payload);
      } else {
        await assignmentsApi.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to save assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 md:px-8 py-2.5 md:py-6 flex items-center justify-between z-10">
          <h2 className="text-[17px] md:text-2xl lg:text-2xl font-bold text-gray-900 flex-1">
            {isEdit ? "Edit Assignment" : "Create New Assignment"}
          </h2>

          {/* Action Buttons - Desktop Only */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={loading || metaLoading}
              className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => submit("published")}
              disabled={loading || metaLoading}
              className="px-5 py-2.5 bg-[#6b1142] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition disabled:opacity-50"
            >
              {loading ? "Saving…" : "Publish"}
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Close"
          >
            <svg
              className="w-4 h-5 md:w-6 md:h-6"
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

        {/* Mobile Action Buttons - Below Header */}
        <div className="md:hidden flex gap-3 px-6 py-4 border-b border-gray-200 flex-wrap">
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={loading || metaLoading}
            className="flex-1 min-w-[120px] px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => submit("published")}
            disabled={loading || metaLoading}
            className="flex-1 min-w-[120px] px-4 py-2 bg-[#6b1142] text-white rounded-lg font-medium text-sm hover:bg-[#5a0d38] transition disabled:opacity-50"
          >
            {loading ? "Saving…" : "Publish"}
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 md:p-8 space-y-4 md:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Top row: Teacher (admin), Course, Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div
                className={`grid grid-cols-1 gap-4 ${isAdmin ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
              >
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Assigning Teacher *
                    </label>
                    <select
                      name="teacherId"
                      value={form.teacherId}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] bg-white"
                    >
                      <option value="">Select teacher…</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.teacherId})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Course *
                  </label>
                  <select
                    name="courseId"
                    value={form.courseId}
                    onChange={handleChange}
                    disabled={metaLoading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] bg-white disabled:bg-gray-100"
                  >
                    <option value="">
                      {metaLoading ? "Loading…" : "Select course…"}
                    </option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Section
                  </label>
                  <select
                    name="sectionId"
                    value={form.sectionId}
                    onChange={handleChange}
                    disabled={!form.courseId}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] bg-white disabled:bg-gray-100"
                  >
                    <option value="">All students in course</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Left */}
              <div className="space-y-4 md:space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter assignment title…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                  />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description of the assignment…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                  />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Instructions / Teacher Notes
                  </label>
                  <textarea
                    name="teacherInstruction"
                    value={form.teacherInstruction}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Step-by-step instructions, requirements, resources…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                  />
                </div>
              </div>

              {/* Right */}
              <div className="space-y-4 md:space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Leave blank for no deadline
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Marks Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">
                        Total Marks *
                      </label>
                      <input
                        type="number"
                        name="totalMarks"
                        value={form.totalMarks}
                        onChange={handleChange}
                        min={1}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">
                        Passing Marks
                      </label>
                      <input
                        type="number"
                        name="passingMarks"
                        value={form.passingMarks}
                        onChange={handleChange}
                        min={0}
                        max={form.totalMarks}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Allow Late Submission
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Students can submit after the deadline
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowLateSubmission"
                      checked={form.allowLateSubmission}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#6b1142] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>

                {isEdit && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Status
                    </h3>
                    <div className="flex gap-5">
                      {["draft", "published", "closed"].map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="status"
                            value={s}
                            checked={form.status === s}
                            onChange={handleChange}
                            className="accent-[#6b1142]"
                          />
                          <span className="text-sm capitalize text-gray-700">
                            {s}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-2 md:py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1 md:py-1.5 lg:py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-[14px] md:text-[18px] font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
