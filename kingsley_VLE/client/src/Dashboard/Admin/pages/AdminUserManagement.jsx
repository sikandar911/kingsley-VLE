import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { adminApi } from "../api/admin.api";
import CreateUserModal from "../components/CreateUserModal";
import BulkCreateModal from "../components/BulkCreateModal";
import UserTable from "../components/UserTable";

export default function AdminUserManagement() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") || "student";
  const [tab, setTab] = useState(roleParam);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminApi.listUsers(tab),
        adminApi.getStats(),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setTab(roleParam);
  }, [roleParam]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = (u) => {
    setEditUser(u);
    setShowModal(true);
  };
  const handleCreate = () => {
    setEditUser(null);
    setShowModal(true);
  };

  const filteredUsers = users.filter((u) => {
    const profile = u.studentProfile || u.teacherProfile;
    const name = profile?.fullName || "";
    const s = search.toLowerCase();
    return (
      name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.username || "").toLowerCase().includes(s)
    );
  });

  const userType = tab === "student" ? "Students" : "Teachers";

  return (
    <div className="px-4 py-4 md:px-4 lg:px-8  lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{userType}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage {userType.toLowerCase()} accounts
        </p>
      </div>

      {/* Users Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-4 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {["student", "teacher"].map((r) => (
              <button
                key={r}
                onClick={() => setTab(r)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition border-0 cursor-pointer flex items-center gap-2 ${
                  tab === r
                    ? "bg-white text-brand-700 shadow-sm font-semibold"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <img
                  src={
                    r === "student"
                      ? "/icon-students.png"
                      : "/icon-teachers.png"
                  }
                  alt={r}
                  className="w-5 h-5"
                />
                {r === "student" ? "Students" : "Teachers"}
              </button>
            ))}
          </div>
          <div className="md:flex items-center md:gap-14 lg:gap-3">
            <input
              type="text"
              className="px-3 w-full md:w-56 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 w-56"
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2 mt-3 md:mt-0">
              {tab === "student" && (
                <button
                  className="px-4 py-2 text-sm font-medium text-brand-700 border border-brand-300 bg-brand-50 hover:bg-brand-100 rounded-lg transition cursor-pointer flex items-center gap-2"
                  onClick={() => setShowBulkModal(true)}
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Bulk
                </button>
              )}
              <button className="btn-primary" onClick={handleCreate}>
                + Create Account
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="spinner" />
          </div>
        ) : (
          <UserTable
            users={filteredUsers}
            onEdit={handleEdit}
            onRefresh={fetchUsers}
          />
        )}
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => {
            setShowModal(false);
            setEditUser(null);
          }}
          onCreated={fetchUsers}
          editUser={editUser}
        />
      )}

      {showBulkModal && (
        <BulkCreateModal
          onClose={() => setShowBulkModal(false)}
          onCreated={fetchUsers}
        />
      )}
    </div>
  );
}
