import { useState, useEffect } from "react";
import { enrollmentsApi } from "../api/enrollments.api";
import { coursesApi } from "../../courses/api/courses.api";
import { adminApi } from "../../../Dashboard/Admin/api/admin.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";
const INITIAL = { teacherId: "", courseId: "" };

export default function TeacherCourseModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 200 }),
      adminApi.listUsers("teacher"),
    ])
      .then(([coursesRes, teachersRes]) => {
        setCourses(coursesRes.data?.data || []);
        setTeachers(teachersRes.data || []);
      })
      .catch(() => setError("Failed to load form data"))
      .finally(() => setMetaLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.teacherId) {
      setError("Please select a teacher");
      return;
    }
    if (!form.courseId) {
      setError("Please select a course");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await enrollmentsApi.teachers.create({
        teacherId: form.teacherId,
        courseId: form.courseId,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign teacher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal overflow-visible">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            Assign Teacher to Course
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
            <label className="form-label">Teacher *</label>
            <CustomDropdown
              options={[
                { id: "", name: metaLoading ? "Loading…" : "Select teacher…" },
                ...teachers.map((t) => ({
                  id: t.teacherProfile?.id,
                  name: `${t.teacherProfile?.fullName || t.email}${t.teacherProfile?.teacherId ? ` — ${t.teacherProfile.teacherId}` : ""}`,
                })),
              ]}
              value={form.teacherId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, teacherId: val }))
              }
              placeholder={metaLoading ? "Loading…" : "Select teacher…"}
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
              dropdownDirection="up"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Course *</label>
            <CustomDropdown
              options={[
                { id: "", name: "Select course…" },
                ...courses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={form.courseId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, courseId: val }))
              }
              placeholder="Select course…"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
              dropdownDirection="up"
            />
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
              {loading ? "Assigning…" : "Assign Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
