import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../Sidebar/Sidebar";

const portalTitle = {
  admin: "Admin Portal",
  student: "Student Portal",
  teacher: "Teacher Portal",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const title = portalTitle[user?.role] || "VLE Portal";

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Mobile Header - Only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        <div className="w-10" />
      </div>

      {/* Overlay - Only visible on small screens when sidebar is open */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex flex-1 mt-16 md:mt-0">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="md:ml-[230px] flex-1 min-h-screen overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
