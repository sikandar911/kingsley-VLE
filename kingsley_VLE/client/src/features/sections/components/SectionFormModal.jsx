import { useState, useEffect } from "react";
import { sectionsApi } from "../api/sections.api";
import { coursesApi } from "../../courses/api/courses.api";
import { academicApi } from "../../academic/api/academic.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const INITIAL = {
  name: "",
  courseId: "",
  semesterId: "",
};

export default function SectionFormModal({ onClose, onSaved, editSection }) {
  const isEdit = Boolean(editSection);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: editSection.name || "",
          courseId: editSection.courseId || "",
          semesterId: editSection.semesterId || "",
        }
      : INITIAL,
  );
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([coursesApi.list({ limit: 200 }), academicApi.semesters.list()])
      .then(([coursesRes, semestersRes]) => {
        setCourses(coursesRes.data?.data || []);
        setSemesters(semestersRes.data || []);
      })
      .catch(() => setError("Failed to load form data"))
      .finally(() => setMetaLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "courseId") {
      // Auto-populate semester from the selected course
      const course = courses.find((c) => c.id === value);
      setForm((prev) => ({
        ...prev,
        courseId: value,
        semesterId: course?.semesterId || prev.semesterId || "",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Section name is required");
      return;
    }
    if (!form.courseId) {
      setError("Please select a course");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        courseId: form.courseId,
        semesterId: form.semesterId || null,
      };
      if (isEdit) {
        await sectionsApi.update(editSection.id, payload);
      } else {
        await sectionsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save section");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Edit Section" : "Create Section"}
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
            <label className="form-label">Section Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Section A"
              className="form-input"
              disabled={metaLoading}
            />
          </div>

          <div className="form-group">
            <CustomDropdown
              options={[
                { id: "", name: metaLoading ? "Loading…" : "Select course…" },
                ...courses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={form.courseId}
              onChange={(val) => {
                const course = courses.find((c) => c.id === val);
                setForm((prev) => ({
                  ...prev,
                  courseId: val,
                  semesterId: course?.semesterId || prev.semesterId || "",
                }));
              }}
              placeholder={metaLoading ? "Loading…" : "Select course…"}
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
            />
          </div>

          <div className="form-group">
            <CustomDropdown
              options={[
                { id: "", name: "No semester selected" },
                ...semesters.map((s) => ({
                  id: s.id,
                  name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                })),
              ]}
              value={form.semesterId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, semesterId: val }))
              }
              placeholder="No semester selected"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
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
              {loading
                ? "Saving…"
                : isEdit
                  ? "Update Section"
                  : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
