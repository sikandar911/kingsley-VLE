import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { adminApi } from "../api/admin.api";
import CreateUserModal from "../components/CreateUserModal";
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
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
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition border-0 cursor-pointer ${
                  tab === r
                    ? "bg-white text-brand-700 shadow-sm font-semibold"
                    : "bg-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {r === "student" ? "🎓 Students" : "👨‍🏫 Teachers"}
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
            <button className="btn-primary mt-3 md:mt-0" onClick={handleCreate}>
              + Create Account
            </button>
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
    </div>
  );
}
