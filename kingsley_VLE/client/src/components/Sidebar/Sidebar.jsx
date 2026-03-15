import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const menuByRole = {
  admin: [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "⊞",
    },
    {
      label: "User Management",
      path: "/admin/users",
      icon: "👥",
    },
    {
      label: "Assignments",
      path: "/admin/assignments",
      icon: "📋",
    },
  ],
  student: [
    {
      label: "Dashboard",
      path: "/student/dashboard",
      icon: "⊞",
    },
    {
      label: "Courses & Learning",
      icon: "📚",
      submenu: [
        { label: "My Courses", path: "/student/courses", icon: "📚" },
        { label: "Assignments", path: "/student/assignments", icon: "📋" },
        { label: "Results", path: "/student/results", icon: "🏆" },
      ],
    },
    {
      label: "Profile",
      path: "/student/profile",
      icon: "👤",
    },
  ],
  teacher: [
    {
      label: "Dashboard",
      path: "/teacher/dashboard",
      icon: "⊞",
    },
    {
      label: "Teaching",
      icon: "📚",
      submenu: [
        { label: "My Courses", path: "/teacher/courses", icon: "📚" },
        { label: "Assignments", path: "/teacher/assignments", icon: "📋" },
        { label: "Students", path: "/teacher/students", icon: "🎓" },
      ],
    },
    {
      label: "Profile",
      path: "/teacher/profile",
      icon: "👤",
    },
  ],
};

const portalTitle = {
  admin: "Admin Portal",
  student: "Student Portal",
  teacher: "Teacher Portal",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuItems = menuByRole[user?.role] || [];
  const title = portalTitle[user?.role] || "VLE Portal";
  const [expandedItems, setExpandedItems] = useState({});

  const displayName =
    user?.studentProfile?.fullName ||
    user?.teacherProfile?.fullName ||
    user?.email;

  const avatarChar = (displayName?.[0] || "?").toUpperCase();

  const toggleSubmenu = (label) => {
    setExpandedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-[230px] min-h-screen bg-brand-700 flex flex-col fixed left-0 top-0 bottom-0 z-50 text-white">
      {/* Header */}
      <div className="px-5 py-6 border-b border-white/15">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.label}>
            {/* Menu Item */}
            {item.submenu ? (
              // Collapsible Item with Submenu
              <button
                onClick={() => toggleSubmenu(item.label)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-white/75 hover:bg-white/10 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-xs transition-transform ${expandedItems[item.label] ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </button>
            ) : (
              // Regular Link Item
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-black/25 text-white font-semibold"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )}

            {/* Submenu Items */}
            {item.submenu && expandedItems[item.label] && (
              <div className="mt-1 ml-2 flex flex-col gap-0.5 border-l border-white/20 pl-2">
                {item.submenu.map((subitem) => (
                  <NavLink
                    key={subitem.path}
                    to={subitem.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-black/25 text-white font-semibold"
                          : "text-white/60 hover:bg-white/10 hover:text-white/90"
                      }`
                    }
                  >
                    <span className="w-4 text-center text-sm">
                      {subitem.icon}
                    </span>
                    <span>{subitem.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/15 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {avatarChar}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{displayName}</p>
            <p className="text-[11px] text-white/60 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 transition"
        >
          ⏻ Logout
        </button>
      </div>
    </aside>
  );
}
