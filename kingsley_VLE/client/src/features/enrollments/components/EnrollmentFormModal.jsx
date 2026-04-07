import { useState, useEffect } from "react";
import { enrollmentsApi } from "../api/enrollments.api";
import { coursesApi } from "../../courses/api/courses.api";
import { academicApi } from "../../academic/api/academic.api";
import { adminApi } from "../../../Dashboard/Admin/api/admin.api";
import api from "../../../lib/api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";
const INITIAL = { studentId: "", courseId: "", sectionId: "", semesterId: "" };

export default function EnrollmentFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 200 }),
      api.get("/semesters"),
      adminApi.listUsers("student"),
    ])
      .then(([coursesRes, semestersRes, studentsRes]) => {
        const courseList = coursesRes.data?.data || [];
        const semestersList = Array.isArray(semestersRes.data)
          ? semestersRes.data
          : semestersRes.data?.data || [];

        console.log("Courses fetched:", courseList);
        console.log("Semesters fetched:", semestersList);

        setCourses(courseList);
        setSemesters(semestersList);
        setStudents(studentsRes.data || []);
        setFilteredCourses(courseList);
        setFilteredSections([]);
        setFilteredSemesters(semestersList);

        // Build semester -> courses map
        const semCxMap = {};
        courseList.forEach((course) => {
          const semId = course.semesterId;
          if (semId) {
            if (!semCxMap[semId]) semCxMap[semId] = [];
            if (!semCxMap[semId].includes(course.id)) {
              semCxMap[semId].push(course.id);
            }
          }
        });

        // Build course -> sections map
        const cxSecMap = {};
        courseList.forEach((course) => {
          if (course.sections && Array.isArray(course.sections)) {
            cxSecMap[course.id] = course.sections.map((s) => s.id);
          }
        });

        console.log("Semester course map:", semCxMap);
        console.log("Course section map:", cxSecMap);

        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);
      })
      .catch(() => setError("Failed to load form data"))
      .finally(() => setMetaLoading(false));
  }, []);

  // Filter courses based on selected semester
  useEffect(() => {
    if (form.semesterId) {
      if (semesterCourseMap[form.semesterId]) {
        const courseIds = semesterCourseMap[form.semesterId];
        setFilteredCourses(courses.filter((c) => courseIds.includes(c.id)));
      } else {
        setFilteredCourses([]);
      }
    } else {
      setFilteredCourses(courses);
    }
    // Reset course and section when semester changes
    setForm((prev) => ({
      ...prev,
      courseId: "",
      sectionId: "",
    }));
  }, [form.semesterId, semesterCourseMap, courses]);

  // Filter sections based on selected course
  useEffect(() => {
    if (form.courseId) {
      if (courseSectionMap[form.courseId]) {
        const sectionIds = courseSectionMap[form.courseId];
        const courseObj = courses.find((c) => c.id === form.courseId);
        const sectionsList = courseObj?.sections || [];
        setFilteredSections(
          sectionsList.filter((s) => sectionIds.includes(s.id)),
        );
      } else {
        setFilteredSections([]);
      }
    } else {
      setFilteredSections([]);
    }
    // Reset section when course changes
    setForm((prev) => ({
      ...prev,
      sectionId: "",
    }));
  }, [form.courseId, courseSectionMap, courses]);

  // Ensure all semesters are always available
  useEffect(() => {
    setFilteredSemesters(semesters);
  }, [semesters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentId) {
      setError("Please select a student");
      return;
    }
    if (!form.courseId) {
      setError("Please select a course");
      return;
    }
    if (!form.sectionId) {
      setError("Please select a section");
      return;
    }
    if (!form.semesterId) {
      setError("Please select a semester");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await enrollmentsApi.create({
        studentId: form.studentId,
        courseId: form.courseId,
        sectionId: form.sectionId,
        semesterId: form.semesterId,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create enrollment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">Enroll Student</h2>
          <button
            onClick={onClose}
            className="btn-icon text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="form-group">
            <CustomDropdown
              options={[
                { id: "", name: "Select student…" },
                ...students.map((s) => ({
                  id: s.studentProfile?.id,
                  name: `${s.studentProfile?.fullName || s.email} — ${s.studentProfile?.studentId || ""}`,
                })),
              ]}
              value={form.studentId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, studentId: val }))
              }
              placeholder={metaLoading ? "Loading…" : "Select student…"}
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
            />
          </div>

          {/* Semester - First selector */}
          <div className="form-group">
            <CustomDropdown
              options={[
                { id: "", name: "Select semester…" },
                ...filteredSemesters.map((s) => ({
                  id: s.id,
                  name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                })),
              ]}
              value={form.semesterId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, semesterId: val }))
              }
              placeholder={metaLoading ? "Loading…" : "Select semester…"}
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
            />
          </div>

          {/* Course - Second selector (depends on semester) */}
          <div className="form-group">
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: !form.semesterId
                    ? "Select semester first"
                    : "Select course…",
                },
                ...filteredCourses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={form.courseId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, courseId: val }))
              }
              placeholder={
                !form.semesterId ? "Select semester first" : "Select course…"
              }
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!form.semesterId || metaLoading}
            />
          </div>

          {/* Section - Third selector (depends on course) */}
          <div className="form-group">
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: !form.courseId
                    ? "Select course first"
                    : "Select section…",
                },
                ...filteredSections.map((s) => ({
                  id: s.id,
                  name: s.name,
                })),
              ]}
              value={form.sectionId}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, sectionId: val }))
              }
              placeholder={
                !form.courseId ? "Select course first" : "Select section…"
              }
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!form.courseId || metaLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || metaLoading}
              className="btn-primary"
            >
              {loading ? "Enrolling…" : "Enroll Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
