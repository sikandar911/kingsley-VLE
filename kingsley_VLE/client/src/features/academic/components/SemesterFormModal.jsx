import { useState, useEffect } from "react";
import { academicApi } from "../api/academic.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const INITIAL = { name: "", sessionId: "", year: "", monthsIncluded: "" };

export default function SemesterFormModal({ onClose, onSaved, editSemester }) {
  const isEdit = Boolean(editSemester);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: editSemester.name || "",
          sessionId: editSemester.sessionId || "",
          year: editSemester.year?.toString() || "",
          monthsIncluded: editSemester.monthsIncluded || "",
        }
      : INITIAL,
  );
  const [sessions, setSessions] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    academicApi.sessions
      .list()
      .then((res) => setSessions(res.data || []))
      .catch(() => setError("Failed to load sessions"))
      .finally(() => setMetaLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Semester name is required");
      return;
    }
    if (!form.sessionId) {
      setError("Please select a session");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        sessionId: form.sessionId,
        year: form.year ? Number(form.year) : null,
        monthsIncluded: form.monthsIncluded.trim() || null,
      };
      if (isEdit) {
        await academicApi.semesters.update(editSemester.id, payload);
      } else {
        await academicApi.semesters.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save semester");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay ">
      <div className="modal overflow-visible">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Edit Semester" : "Create Semester"}
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
            <label className="form-label">Semester Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Fall Semester, Spring Term"
              className="form-input"
              disabled={metaLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Session *</label>
            <CustomDropdown
              options={[
                { id: "", name: metaLoading ? "Loading…" : "Select session…" },
                ...sessions.map((s) => ({
                  id: s.id,
                  name: s.name,
                })),
              ]}
              value={form.sessionId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, sessionId: val }))
              }
              placeholder={metaLoading ? "Loading…" : "Select session…"}
              isSmallScreen={false}
              BRAND="#6b1142"
              disabled={metaLoading}
              dropdownDirection="up"
            />
          </div>

          <div className="md:form-row">
            <div className="form-group md:mb-0">
              <label className="form-label">Year</label>
              <input
                type="number"
                name="year"
                value={form.year}
                onChange={handleChange}
                placeholder="e.g. 2025"
                min={2000}
                max={2100}
                className="form-input"
              />
            </div>
            <div className="form-group md:mb-0">
              <label className="form-label">Months Included</label>
              <input
                name="monthsIncluded"
                value={form.monthsIncluded}
                onChange={handleChange}
                placeholder="e.g. Jan–May"
                className="form-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || metaLoading}
              className="text-[13px] btn-primary"
            >
              {loading
                ? "Saving…"
                : isEdit
                  ? "Update Semester"
                  : "Create Semester"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
