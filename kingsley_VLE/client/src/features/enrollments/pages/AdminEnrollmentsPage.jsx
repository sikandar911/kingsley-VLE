import { useState, useEffect, useCallback } from "react";
import { enrollmentsApi } from "../api/enrollments.api";
import { coursesApi } from "../../courses/api/courses.api";
import { academicApi } from "../../academic/api/academic.api";
import EnrollmentFormModal from "../components/EnrollmentFormModal";
import TeacherCourseModal from "../components/TeacherCourseModal";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

export default function AdminEnrollmentsPage() {
  const [tab, setTab] = useState("students");

  // ── Student enrollments ──
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [deleteEnrollId, setDeleteEnrollId] = useState(null);
  const [deleteEnrollLoading, setDeleteEnrollLoading] = useState(false);

  // ── Teacher assignments ──
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [teacherCoursesLoading, setTeacherCoursesLoading] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [deleteTeacherId, setDeleteTeacherId] = useState(null);
  const [deleteTeacherLoading, setDeleteTeacherLoading] = useState(false);

  // ── Filters ──
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterSemesterId, setFilterSemesterId] = useState("");

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 200 }),
      academicApi.semesters.list(),
    ]).then(([c, s]) => {
      setCourses(c.data?.data || []);
      setSemesters(s.data || []);
    });
  }, []);

  const fetchEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true);
    try {
      const params = {};
      if (filterCourseId) params.courseId = filterCourseId;
      if (filterSemesterId) params.semesterId = filterSemesterId;
      const res = await enrollmentsApi.list(params);
      setEnrollments(res.data || []);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [filterCourseId, filterSemesterId]);

  const fetchTeacherCourses = useCallback(async () => {
    setTeacherCoursesLoading(true);
    try {
      const params = {};
      if (filterCourseId) params.courseId = filterCourseId;
      const res = await enrollmentsApi.teachers.list(params);
      setTeacherCourses(res.data || []);
    } finally {
      setTeacherCoursesLoading(false);
    }
  }, [filterCourseId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);
  useEffect(() => {
    fetchTeacherCourses();
  }, [fetchTeacherCourses]);

  const deleteEnrollment = async (id) => {
    setDeleteEnrollLoading(true);
    try {
      await enrollmentsApi.delete(id);
      setDeleteEnrollId(null);
      fetchEnrollments();
    } finally {
      setDeleteEnrollLoading(false);
    }
  };

  const deleteTeacherCourse = async (id) => {
    setDeleteTeacherLoading(true);
    try {
      await enrollmentsApi.teachers.delete(id);
      setDeleteTeacherId(null);
      fetchTeacherCourses();
    } finally {
      setDeleteTeacherLoading(false);
    }
  };

  return (
    <div
      className="md:page-container px-4 py-4 md:px-4 lg:px-8  lg:py-8
"
    >
      {/* Header */}
      <div className="md:page-header mb-4">
        <div>
          <h1 className="page-title">Enrollments</h1>
          <p className="page-subtitle">
            Manage student enrollments and teacher <br /> assignments
          </p>
        </div>
        {tab === "students" ? (
          <button
            className="btn-primary mt-2 lg:mt-0"
            onClick={() => setShowEnrollModal(true)}
          >
            + Enroll Student
          </button>
        ) : (
          <button
            className="btn-primary mt-2 lg:mt-0"
            onClick={() => setShowTeacherModal(true)}
          >
            + Assign Teacher
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 md:mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">🎓</div>
          <div>
            <p className="stat-label">Student Enrollments</p>
            <p className="stat-value">{enrollments.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">👨‍🏫</div>
          <div>
            <p className="stat-label">Teacher Assignments</p>
            <p className="stat-value">{teacherCourses.length}</p>
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="panel overflow-visible">
        <div className="panel-header flex-wrap gap-3 ">
          <div className="tab-group">
            <button
              className={`tab-btn ${tab === "students" ? "tab-btn--active" : ""}`}
              onClick={() => setTab("students")}
            >
              🎓 Students
            </button>
            <button
              className={`tab-btn ${tab === "teachers" ? "tab-btn--active" : ""}`}
              onClick={() => setTab("teachers")}
            >
              👨‍🏫 Teachers
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="w-full md:w-fit lg:w-auto lg:min-w-[160px]">
              <CustomDropdown
                options={[
                  { id: "", name: "All Courses" },
                  ...courses.map((c) => ({
                    id: c.id,
                    name:
                      c.title.length > 35
                        ? c.title.substring(0, 39) + "..."
                        : c.title,
                  })),
                ]}
                value={filterCourseId}
                onChange={setFilterCourseId}
                placeholder="All Courses"
                isSmallScreen={false}
                BRAND="#6b1142"
              />
            </div>

            {tab === "students" && (
              <div className="w-full md:w-fit lg:w-auto min-w-[160px]">
                <CustomDropdown
                  options={[
                    { id: "", name: "All Semesters" },
                    ...semesters.map((s) => ({
                      id: s.id,
                      name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                    })),
                  ]}
                  value={filterSemesterId}
                  onChange={setFilterSemesterId}
                  placeholder="All Semesters"
                  isSmallScreen={false}
                  BRAND="#6b1142"
                  dropdownAlign="left"
                />
              </div>
            )}
          </div>
        </div>

        {/* Student Enrollments Table */}
        {tab === "students" &&
          (enrollmentsLoading ? (
            <div className="panel-loading">
              <div className="spinner" />
            </div>
          ) : enrollments.length === 0 ? (
            <p className="table-empty">
              No enrollments found . Enroll students to get started.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Student</th>
                    <th className="whitespace-nowrap">Student ID</th>
                    <th className="whitespace-nowrap">Course</th>
                    <th className="whitespace-nowrap">Section</th>
                    <th className="whitespace-nowrap">Semester</th>
                    <th className="whitespace-nowrap">Enrolled On</th>
                    <th className="whitespace-nowrap">Actions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((en) => (
                    <tr key={en.id}>
                      <td className="td-name whitespace-nowrap">
                        {en.student?.fullName || en.student?.user?.email || "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-id">
                          {en.student?.studentId || "—"}
                        </span>
                      </td>
                      <td className="text-gray-700">
                        {en.course?.title || "—"}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {en.section?.name || "—"}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {en.semester
                          ? `${en.semester.name}${en.semester.year ? ` (${en.semester.year})` : ""}`
                          : "—"}
                      </td>
                      <td className="text-gray-400 text-xs whitespace-nowrap">
                        {en.enrolledAt
                          ? new Date(en.enrolledAt).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td>
                        <button
                          onClick={() => setDeleteEnrollId(en.id)}
                          className="btn-icon text-red-500 hover:bg-red-50"
                          title="Remove enrollment"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* Teacher Assignments Table */}
        {tab === "teachers" &&
          (teacherCoursesLoading ? (
            <div className="panel-loading">
              <div className="spinner" />
            </div>
          ) : teacherCourses.length === 0 ? (
            <p className="table-empty">
              No teacher assignments. Assign teachers to courses.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Teacher</th>
                    <th className="whitespace-nowrap">Teacher ID</th>
                    <th className="whitespace-nowrap">Course</th>
                    <th className="whitespace-nowrap">Section</th>
                    <th className="whitespace-nowrap">Assigned On</th>
                    <th className="whitespace-nowrap">Actions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teacherCourses.map((tc) => (
                    <tr key={tc.id}>
                      <td className="td-name whitespace-nowrap">
                        {tc.teacher?.fullName || "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-id">
                          {tc.teacher?.teacherId || "—"}
                        </span>
                      </td>
                      <td className="text-gray-700 whitespace-nowrap">
                        {tc.course?.title || "—"}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {tc.section?.name || "—"}
                      </td>
                      <td className="text-gray-400 text-xs whitespace-nowrap">
                        {tc.assignedAt
                          ? new Date(tc.assignedAt).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td>
                        <button
                          onClick={() => setDeleteTeacherId(tc.id)}
                          className="btn-icon text-red-500 hover:bg-red-50"
                          title="Remove assignment"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      {/* Enrollment modal */}
      {showEnrollModal && (
        <EnrollmentFormModal
          onClose={() => setShowEnrollModal(false)}
          onSaved={() => {
            setShowEnrollModal(false);
            fetchEnrollments();
          }}
        />
      )}

      {/* Teacher course modal */}
      {showTeacherModal && (
        <TeacherCourseModal
          onClose={() => setShowTeacherModal(false)}
          onSaved={() => {
            setShowTeacherModal(false);
            fetchTeacherCourses();
          }}
        />
      )}

      {/* Delete enrollment confirm */}
      {deleteEnrollId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Remove Enrollment?
              </h3>
              <p className="text-sm text-gray-600">
                The student will be removed from this course section.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteEnrollId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteEnrollment(deleteEnrollId)}
                  disabled={deleteEnrollLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteEnrollLoading ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete teacher assignment confirm */}
      {deleteTeacherId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Remove Teacher Assignment?
              </h3>
              <p className="text-sm text-gray-600">
                The teacher will be unassigned from this course.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTeacherId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTeacherCourse(deleteTeacherId)}
                  disabled={deleteTeacherLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteTeacherLoading ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
