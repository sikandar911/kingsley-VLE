import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Icon mapping function
const getIconPath = (iconName) => {
  const iconMap = {
    dashboard: "/dashboard-icon.png",
    user: "/users-managment.png",
    academic: "/academic.png",
    sessions: "/Sessions-semesters.png",
    courses: "/courses-icon.png",
    sections: "/sections-icon.png",
    enrollments: "/enrollments-icon.png",
    assignments: "/assignments-icon.png",
    materials: "/class-materials-icon.png",
    records: "/records-icon.png",
    attendance: "/attendance-icon.png",
    events: "/events-icon.png",
    teacher: "/teacher-icon.png",
    student: "/student-icon.png",
    learning: "/learning.png",
    result: "/results-icon.png",
    profile: "/profile-icon.png",
  };
  return iconMap[iconName] || null;
};

// Icon component for consistent rendering
const IconComponent = ({ iconKey, size = "w-7 h-7" }) => {
  const path = getIconPath(iconKey);
  if (!path) return <span className="text-base">📌</span>;
  return <img src={path} alt="icon" className={`${size} object-contain`} />;
};

const menuByRole = {
  admin: [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "dashboard",
    },
    {
      label: "User Management",
      path: "/admin/users",
      icon: "user",
    },
    {
      label: "Academic",
      icon: "academic",
      submenu: [
        {
          label: "Sessions & Semesters",
          path: "/admin/academic",
          icon: "sessions",
        },
        { label: "Courses", path: "/admin/courses", icon: "courses" },
        { label: "Sections", path: "/admin/sections", icon: "sections" },
      ],
    },
    {
      label: "Enrollments",
      path: "/admin/enrollments",
      icon: "enrollments",
    },
    {
      label: "Assignments",
      path: "/admin/assignments",
      icon: "assignments",
    },
    {
      label: "Class Materials",
      path: "/admin/class-materials",
      icon: "materials",
    },
    {
      label: "Class Recordings",
      path: "/admin/class-records",
      icon: "records",
    },
    {
      label: "Class Attendance",
      path: "/admin/attendance",
      icon: "attendance",
    },
    {
      label: "Events",
      path: "/admin/events",
      icon: "events",
    },
  ],
  student: [
    {
      label: "Dashboard",
      path: "/student/dashboard",
      icon: "dashboard",
    },
    {
      label: "My Courses",
      path: "/student/courses",
      icon: "courses",
    },
    {
      label: "Profile",
      path: "/student/profile",
      icon: "profile",
    },
  ],
  teacher: [
    {
      label: "Dashboard",
      path: "/teacher/dashboard",
      icon: "dashboard",
    },
    { label: "My Courses", path: "/teacher/courses", icon: "courses" },
    {
      label: "Assignments",
      path: "/teacher/assignments",
      icon: "assignments",
    },
    {
      label: "Class Materials",
      path: "/teacher/class-materials",
      icon: "materials",
    },
    {
      label: "Class Recordings",
      path: "/teacher/class-records",
      icon: "records",
    },
    {
      label: "Class Attendance",
      path: "/teacher/attendance",
      icon: "attendance",
    },
    {
      label: "Events",
      path: "/teacher/events",
      icon: "events",
    },

    {
      label: "Profile",
      path: "/teacher/profile",
      icon: "profile",
    },
  ],
};

const portalTitle = {
  admin: "Admin Portal",
  student: "Student Portal",
  teacher: "Teacher Portal",
};

export default function Sidebar({ isOpen = true, onClose = () => {} }) {
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
    <aside
      className={`w-[230px] min-h-screen bg-brand-700 flex flex-col fixed left-0 top-0 bottom-0 z-50 text-white transition-transform duration-300 md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Header */}
      <div className="px-5 py-6 border-b border-white/15 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        {/* Close Button - Only visible on small screens */}
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg hover:bg-white/10 transition"
          aria-label="Close menu"
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
                  <IconComponent iconKey={item.icon} size="w-[19px] h-[19px]" />
                  <span className="text-[13px]">{item.label}</span>
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
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-black/25 text-white font-semibold"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <IconComponent iconKey={item.icon} size="w-[17px] h-[17px]" />
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
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-black/25 text-white font-semibold"
                          : "text-white/60 hover:bg-white/10 hover:text-white/90"
                      }`
                    }
                  >
                    <IconComponent
                      iconKey={subitem.icon}
                      size="w-[16px] h-[16px]"
                    />
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
