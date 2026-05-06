import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { courseModulesApi } from "../api/courseModules.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
};

const EMPTY_FORM = { name: "", description: "", status: "active" };

// ── Module Form Modal ─────────────────────────────────────────────────────────
function ModuleFormModal({
  courseId,
  sectionId,
  semesterId,
  editModule,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(editModule);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: editModule.name,
          description: editModule.description || "",
          status: editModule.status,
          semesterId: editModule.semesterId || "",
        }
      : {
          name: "",
          description: "",
          status: "active",
          semesterId: semesterId || "",
        },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);

  // Fetch only the semester connected to this course
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const res = await courseModulesApi.getSemestersForCourse(courseId);
        setSemesters(Array.isArray(res.semesters) ? res.semesters : []);

        if (!isEdit && res.courseSemesterId && !semesterId) {
          setForm((f) => ({ ...f, semesterId: res.courseSemesterId }));
        }
      } catch (err) {
        console.error("Error fetching semesters:", err);
        setSemesters([]);
      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Module name is required");
      return;
    }
    if (!form.semesterId) {
      setError("Semester is required");
      Swal.fire({
        icon: "error",
        title: "Module create unsuccessful",
        text: "Select the right semester for create the module.",
        confirmButtonColor: "#742345",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await courseModulesApi.update(editModule.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status,
          semesterId: form.semesterId || null,
        });
        await Swal.fire({
          icon: "success",
          title: "Module updated successfully",
          confirmButtonColor: "#742345",
        });
      } else {
        await courseModulesApi.create({
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status,
          courseId,
          sectionId: sectionId || undefined,
          semesterId: form.semesterId || undefined,
        });
        await Swal.fire({
          icon: "success",
          title: "Module create successfully",
          confirmButtonColor: "#742345",
        });
      }
      onSaved();
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        "Select the right semester for create the module.";
      setError(message);
      Swal.fire({
        icon: "error",
        title: "Module create unsuccessful",
        text: message,
        confirmButtonColor: "#742345",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? "Edit Module" : "Create Module"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
          >
            <svg
              className="w-5 h-5"
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Module Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Introduction to Algebra"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description of this module..."
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Semester <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: loadingSemesters
                    ? "Loading semesters..."
                    : "Select semester",
                },
                ...semesters.map((sem) => ({
                  id: sem.id,
                  name: `${sem.name} ${sem.year ? `(${sem.year})` : ""}`.trim(),
                })),
              ]}
              value={form.semesterId}
              onChange={(val) => setForm((f) => ({ ...f, semesterId: val }))}
              placeholder={
                loadingSemesters ? "Loading semesters..." : "Select semester"
              }
              isSmallScreen={false}
              BRAND="#742345"
              disabled={loadingSemesters}
              dropdownDirection="up"
            />
          </div>

          <div>
            <div className="flex gap-3">
              {["active", "inactive"].map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => setForm((f) => ({ ...f, status: s }))}
                    className="accent-[#6b1d3e]"
                  />
                  <span className="text-sm capitalize text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#742345] rounded-lg hover:bg-[#661b3a] transition disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Module"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── CourseModulesTab ──────────────────────────────────────────────────────────
export default function CourseModulesTab({ courseId, sectionId, semesterId }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editModule, setEditModule] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [refetch, setRefetch] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { courseId };
      if (sectionId) params.sectionId = sectionId;
      if (semesterId) params.semesterId = semesterId;
      const res = await courseModulesApi.list(params);
      setModules(Array.isArray(res.data?.modules) ? res.data.modules : []);
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to load modules",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, sectionId, semesterId, refetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (mod) => {
    if (
      !window.confirm(
        `Delete module "${mod.name}"? Assignments, materials, and records linked to it will be unlinked but not deleted.`,
      )
    )
      return;
    setDeleting(mod.id);
    setDeleteError(null);
    try {
      await courseModulesApi.delete(mod.id);
      setRefetch((p) => p + 1);
    } catch (err) {
      setDeleteError(
        err.response?.data?.error || err.message || "Failed to delete",
      );
    } finally {
      setDeleting(null);
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditModule(null);
    setRefetch((p) => p + 1);
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-5 gap-3 lg:gap-0">
        <div>
          <h2 className="text-base font-bold text-gray-900">Course Modules</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Organise content into modules. Assignments, materials &amp;
            recordings can be linked to a module.
          </p>
        </div>
        <button
          onClick={() => {
            setEditModule(null);
            setShowForm(true);
          }}
          className="w-fit flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-[#7e244a] rounded-lg hover:bg-[#681d3c] transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Module
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {deleteError}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl h-20 shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      ) : modules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-12 text-center">
          <img
            src="/module-profile.png"
            alt="No modules"
            className="w-12 h-12 lg:w-[56px] lg:h-[56px] mx-auto mb-3"
          />
          <p className="text-gray-500 text-sm">
            No modules yet. Create your first module to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, idx) => (
            <div
              key={mod.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-start gap-4"
            >
              {/* Index badge */}
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {mod.name}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[mod.status]}`}
                  >
                    {mod.status}
                  </span>
                </div>
                {mod.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {mod.description}
                  </p>
                )}
                {mod.section && (
                  <p className="text-xs text-gray-400 mt-1">
                    Section: {mod.section.name}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditModule(mod);
                    setShowForm(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-blue-600"
                  title="Edit"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(mod)}
                  disabled={deleting === mod.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500 disabled:opacity-50"
                  title="Delete"
                >
                  <svg
                    className="w-4 h-4"
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
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <ModuleFormModal
          courseId={courseId}
          sectionId={sectionId}
          semesterId={semesterId}
          editModule={editModule}
          onClose={() => {
            setShowForm(false);
            setEditModule(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
