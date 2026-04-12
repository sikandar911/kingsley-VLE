import { useState, useEffect } from "react";
import { enrollmentsApi } from "../api/enrollments.api";
import { coursesApi } from "../../courses/api/courses.api";
import { adminApi } from "../../../Dashboard/Admin/api/admin.api";
import { sectionsApi } from "../../sections/api/sections.api";
import { academicApi } from "../../academic/api/academic.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";
const INITIAL = { teacherId: "", courseId: "", sectionId: "", semesterId: "" };

export default function TeacherCourseModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL);
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load teachers, semesters, and all courses on mount
  useEffect(() => {
    Promise.all([
      adminApi.listUsers("teacher"),
      academicApi.semesters.list({ limit: 200 }),
      coursesApi.list({ limit: 200 }),
    ])
      .then(([teachersRes, semestersRes, coursesRes]) => {
        setTeachers(teachersRes.data || []);
        setSemesters(semestersRes.data?.data || semestersRes.data || []);
        setAllCourses(coursesRes.data?.data || coursesRes.data || []);
      })
      .catch(() => setError("Failed to load form data"))
      .finally(() => setMetaLoading(false));
  }, []);

  // Filter courses when semester changes
  useEffect(() => {
    if (!form.semesterId) {
      setFilteredCourses([]);
      setForm((prev) => ({ ...prev, courseId: "", sectionId: "" }));
      return;
    }

    // Filter courses that match the selected semester
    const filtered = allCourses.filter((course) => course.semesterId === form.semesterId);
    setFilteredCourses(filtered);
    setForm((prev) => ({ ...prev, courseId: "", sectionId: "" }));
  }, [form.semesterId, allCourses]);

  // Load sections when course changes
  useEffect(() => {
    if (!form.courseId) {
      setSections([]);
      setForm((prev) => ({ ...prev, sectionId: "" }));
      return;
    }
    setSectionsLoading(true);
    sectionsApi
      .list({ courseId: form.courseId, limit: 200 })
      .then((res) => setSections(res.data?.data || res.data || []))
      .catch(() => setSections([]))
      .finally(() => setSectionsLoading(false));
  }, [form.courseId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.teacherId) {
      setError("Please select a teacher");
      return;
    }
    if (!form.semesterId) {
      setError("Please select a semester");
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
        sectionId: form.sectionId || undefined,
        semesterId: form.semesterId,
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
            Assign Teacher to Course &amp; Section
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
            <label className="form-label">Semester *</label>
            <CustomDropdown
              options={[
                { id: "", name: "Select semester…" },
                ...semesters.map((s) => ({
                  id: s.id,
                  name: `${s.year || ""} - ${s.name || ""}`.trim(),
                })),
              ]}
              value={form.semesterId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, semesterId: val }))
              }
              placeholder="Select semester…"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading || !form.teacherId}
              dropdownDirection="up"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Course *</label>
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: !form.semesterId
                    ? "Select a semester first…"
                    : filteredCourses.length === 0
                    ? "No courses available"
                    : "Select course…",
                },
                ...filteredCourses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={form.courseId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, courseId: val, sectionId: "" }))
              }
              placeholder="Select course…"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!form.semesterId}
              dropdownDirection="up"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Section{" "}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: !form.courseId
                    ? "Select a course first…"
                    : sectionsLoading
                    ? "Loading…"
                    : sections.length === 0
                    ? "No sections available"
                    : "Select section…",
                },
                ...sections.map((s) => ({ id: s.id, name: s.name })),
              ]}
              value={form.sectionId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, sectionId: val }))
              }
              placeholder="Select section…"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!form.courseId || sectionsLoading}
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
