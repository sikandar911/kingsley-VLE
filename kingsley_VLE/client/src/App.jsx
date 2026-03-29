import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import DashboardLayout from "./components/Layout/DashboardLayout";
import LoginPage from "./Auth/pages/LoginPage";
import AdminDashboard from "./Dashboard/Admin/pages/AdminDashboard";
import AdminUserManagement from "./Dashboard/Admin/pages/AdminUserManagement";
import StudentDashboard from "./Dashboard/Student/pages/StudentDashboard";
import StudentCoursesPage from "./Dashboard/Student/pages/StudentCoursesPage";
import StudentAssignmentsPage from "./Dashboard/Student/pages/StudentAssignmentsPage";
import StudentResultsPage from "./Dashboard/Student/pages/StudentResultsPage";
import StudentProfilePage from "./Profile/student/pages/StudentProfilePage";
import TeacherDashboard from "./Dashboard/Teacher/pages/TeacherDashboard";
import TeacherCoursesPage from "./Dashboard/Teacher/pages/TeacherCoursesPage";
import TeacherAssignmentsPage from "./Dashboard/Teacher/pages/TeacherAssignmentsPage";
import TeacherStudentsPage from "./Dashboard/Teacher/pages/TeacherStudentsPage";
import TeacherProfilePage from "./Profile/teacher/pages/TeacherProfilePage";
import AdminAssignmentsPage from "./features/assignments/pages/AdminAssignmentsPage";
import AdminCoursesPage from "./features/courses/pages/AdminCoursesPage";
import AdminSectionsPage from "./features/sections/pages/AdminSectionsPage";
import AdminAcademicPage from "./features/academic/pages/AdminAcademicPage";
import AdminEnrollmentsPage from "./features/enrollments/pages/AdminEnrollmentsPage";
import ClassMaterials from "./features/classMaterials/pages/ClassMaterials";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUserManagement />} />
              <Route
                path="/admin/assignments"
                element={<AdminAssignmentsPage />}
              />
              <Route
                path="/admin/class-materials"
                element={<ClassMaterials />}
              />
              <Route path="/admin/courses" element={<AdminCoursesPage />} />
              <Route path="/admin/sections" element={<AdminSectionsPage />} />
              <Route path="/admin/academic" element={<AdminAcademicPage />} />
              <Route
                path="/admin/enrollments"
                element={<AdminEnrollmentsPage />}
              />
            </Route>
          </Route>

          {/* Student */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/courses" element={<StudentCoursesPage />} />
              <Route
                path="/student/assignments"
                element={<StudentAssignmentsPage />}
              />
              <Route path="/student/results" element={<StudentResultsPage />} />
              <Route path="/student/profile" element={<StudentProfilePage />} />
            </Route>
          </Route>

          {/* Teacher */}
          <Route
            element={<ProtectedRoute allowedRoles={["teacher", "admin"]} />}
          >
            <Route element={<DashboardLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
              <Route
                path="/teacher/assignments"
                element={<TeacherAssignmentsPage />}
              />
              <Route
                path="/teacher/students"
                element={<TeacherStudentsPage />}
              />
              <Route path="/teacher/profile" element={<TeacherProfilePage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
