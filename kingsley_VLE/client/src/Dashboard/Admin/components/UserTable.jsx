import { useState } from "react";
import { adminApi } from "../api/admin.api";

export default function UserTable({ users, onEdit, onRefresh }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (user) => {
    const name =
      user.studentProfile?.fullName ||
      user.teacherProfile?.fullName ||
      user.email;
    if (!window.confirm(`Delete ${name}?`)) return;
    setDeletingId(user.id);
    try {
      await adminApi.deleteUser(user.id);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (user) => {
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  if (!users.length) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        No users found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {[
              "Name",
              "Email",
              "Username",
              "ID",
              "Status",
              "Created",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const profile = user.studentProfile || user.teacherProfile;
            const uid = profile?.studentId || profile?.teacherId || "—";
            return (
              <tr
                key={user.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition"
              >
                <td className="px-5 py-3.5  text-gray-900 whitespace-nowrap">
                  {profile?.fullName || "—"}
                </td>

                <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                <td className="px-5 py-3.5 text-gray-500">
                  {user.username || "—"}
                </td>
                <td className="px-3 py-3.5">
                  <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded-full whitespace-nowrap">
                    {uid}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3.5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition border-0 bg-transparent cursor-pointer"
                      title="Edit"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="#6b1d3e"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(user)}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition border-0 bg-transparent cursor-pointer"
                      title={user.isActive ? "Deactivate" : "Activate"}
                    >
                      {user.isActive ? (
                        <svg
                          className="w-5 h-5"
                          fill="#6b1d3e"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="#6b1d3e"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="p-1.5 rounded-md hover:bg-red-50 transition border-0 bg-transparent cursor-pointer disabled:opacity-50"
                      title="Delete"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="#6b1d3e"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
