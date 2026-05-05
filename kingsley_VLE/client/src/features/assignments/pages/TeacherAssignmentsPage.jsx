import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { assignmentsApi } from "../api/assignments.api";
import CreateAssignmentModal from "../components/CreateAssignmentModal";
import AssignmentPreviewModal from "../components/AssignmentPreviewModal";
import ViewSubmissionsModal from "../components/ViewSubmissionsModal";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const statusBadge = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
};

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editAssignment, setEditAssignment] = useState(null);
  const [preview, setPreview] = useState(null);
  const [viewSubmissions, setViewSubmissions] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Delete confirmation modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { assignment, confirmText: "" }
  const [deleteConfirmError, setDeleteConfirmError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    assignmentsApi
      .list(filterStatus ? { status: filterStatus } : {})
      .then((res) => setAssignments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = assignments.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.course?.title.toLowerCase().includes(q) ||
      a.teacher?.fullName?.toLowerCase().includes(q)
    );
  });

  const totalSubmissions = assignments.reduce(
    (s, a) => s + (a._count?.submissions || 0),
    0,
  );
  const published = assignments.filter((a) => a.status === "published").length;
  const draft = assignments.filter((a) => a.status === "draft").length;

  const stats = [
    {
      label: "Total Assignments",
      value: assignments.length,
      icon: "📋",
      bg: "bg-blue-50",
    },
    {
      label: "Submissions",
      value: totalSubmissions,
      icon: "📥",
      bg: "bg-green-50",
    },
    { label: "Published", value: published, icon: "✅", bg: "bg-purple-50" },
    { label: "Drafts", value: draft, icon: "📝", bg: "bg-orange-50" },
  ];

  const handleEdit = (assignment) => {
    setPreview(null);
    setEditAssignment(assignment);
    setShowCreate(true);
  };

  // console.log("Assignments:", assignments);

  const handleStatusChange = async (assignment, newStatus) => {
    setUpdatingId(assignment.id);
    try {
      await assignmentsApi.updateStatus(assignment.id, newStatus);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (assignment) => {
    // Show confirmation modal
    setDeleteConfirmModal({ assignment, confirmText: "" });
    setDeleteConfirmError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    
    // Validate confirmation text
    if (deleteConfirmModal.confirmText !== "confirm") {
      setDeleteConfirmError('Please type "confirm" to verify deletion');
      return;
    }

    const { assignment } = deleteConfirmModal;
    setDeletingId(assignment.id);
    try {
      await assignmentsApi.delete(assignment.id);
      load();
      setDeleteConfirmModal(null);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to delete assignment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] ">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 lg:py-6">
        <div className="lg:flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900">
              Assignment Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Assignments › List</p>
          </div>
          <button
            onClick={() => {
              setEditAssignment(null);
              setShowCreate(true);
            }}
            className="mt-2 lg:mt-0 px-3.5 md:px-6 py-2.5 bg-[#6b1142] text-[12.5px] md:text-[15px] lg:text-[15px] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition"
          >
            + Create New Assignment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 lg:px-8 lg:py-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5 lg:gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-sm border border-gray-200"
          >
            <div
              className={`${s.bg} w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}
            >
              {s.icon}
            </div>
            <div className=" flex-col text-center md:text-left md:flex-row">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-8 pb-4 lg:pb-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, course, instructor…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
          />
        </div>
        <div className="w-full sm:w-64">
          <CustomDropdown
            options={[
              { id: "", name: "All Status" },
              { id: "draft", name: "Draft" },
              { id: "published", name: "Published" },
              { id: "closed", name: "Closed" },
            ]}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            placeholder="All Status"
            isSmallScreen={false}
            BRAND={BRAND}
          />
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-8 pb-4 md:pb-4  lg:pb-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-5xl mb-3">📋</span>
              <p className="text-sm">
                {assignments.length === 0
                  ? "No assignments yet"
                  : "No matching assignments"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Assignment",
                      "Course / Section",
                      "Deadline",
                      "Submissions",
                      "Status",
                      "Instructor",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => {
                    const subCount = a._count?.submissions || 0;
                    const isOverdue = Boolean(
                      a.dueDate && new Date() > new Date(a.dueDate),
                    );
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            {a.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">
                            {a.targetType === "section"
                              ? "Section assignment"
                              : "Individual"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-800">
                            {a.course?.title || "—"}
                          </p>
                          {a.section && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {a.section.name}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-400 whitespace-nowrap">
                            Created: {fmt(a.createdAt)}
                          </p>
                          {a.dueDate && (
                            <p
                              className={`text-xs mt-0.5 whitespace-nowrap font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}
                            >
                              Due: {fmt(a.dueDate)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {subCount}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[a.status] || "bg-gray-100 text-gray-500"}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {a.teacher?.fullName || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {/* Preview */}
                            <button
                              onClick={() => setPreview(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition"
                              title="Preview"
                            >
                              <svg
                                className="w-5 h-5 text-gray-500"
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

                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition text-base"
                              title="Edit"
                            >
                              ✏️
                            </button>

                            {/* View Submissions */}
                            <button
                              onClick={() => setViewSubmissions(a)}
                              className="p-1.5 hover:bg-blue-50 rounded transition text-base"
                              title="View Submissions"
                            >
                              📋
                            </button>

                            {/* Publish (only if draft) */}
                            {a.status === "draft" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(a, "published")
                                }
                                disabled={updatingId === a.id}
                                className={`p-1.5 rounded transition text-base ${
                                  updatingId === a.id
                                    ? "animate-spin"
                                    : "hover:bg-green-50"
                                }`}
                                title="Publish"
                              >
                                {updatingId === a.id ? "🟡" : "🟢"}
                              </button>
                            )}

                            {/* Close (only if published) */}
                            {a.status === "published" && (
                              <button
                                onClick={() => handleStatusChange(a, "closed")}
                                disabled={updatingId === a.id}
                                className={`p-1.5 rounded transition text-base ${
                                  updatingId === a.id
                                    ? "animate-spin"
                                    : "hover:bg-red-50"
                                }`}
                                title="Close Assignment"
                              >
                                {updatingId === a.id ? "🟡" : "🔴"}
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(a)}
                              disabled={deletingId === a.id}
                              className={`p-1.5 rounded transition text-base ${
                                deletingId === a.id
                                  ? "animate-spin"
                                  : "hover:bg-red-100"
                              }`}
                              title="Delete Assignment"
                            >
                              {deletingId === a.id ? "⏳" : "🗑️"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateAssignmentModal
          editAssignment={editAssignment}
          onClose={() => {
            setShowCreate(false);
            setEditAssignment(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditAssignment(null);
            load();
          }}
        />
      )}

      {preview && (
        <AssignmentPreviewModal
          assignment={preview}
          role={user?.role}
          onClose={() => setPreview(null)}
          onEdit={() => handleEdit(preview)}
          onRefresh={load}
        />
      )}

      {viewSubmissions && (
        <ViewSubmissionsModal
          assignment={viewSubmissions}
          onClose={() => setViewSubmissions(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Assignment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <strong>"{deleteConfirmModal.assignment.title}"</strong>?
            </p>
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
              ⚠️ This action cannot be undone. All student submissions and uploaded files will be permanently deleted.
            </p>
            
            <label className="text-xs font-semibold text-gray-600 block mb-2">
              To confirm, type <code className="bg-gray-100 px-1 py-0.5 rounded">confirm</code>:
            </label>
            <input
              type="text"
              value={deleteConfirmModal.confirmText}
              onChange={(e) => {
                setDeleteConfirmModal({ ...deleteConfirmModal, confirmText: e.target.value });
                setDeleteConfirmError(null);
              }}
              placeholder="Type 'confirm' to verify"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            {deleteConfirmError && (
              <p className="text-xs text-red-600 mb-4">{deleteConfirmError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmModal(null);
                  setDeleteConfirmError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId === deleteConfirmModal.assignment.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === deleteConfirmModal.assignment.id ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete Assignment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
