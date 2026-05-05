import { useState, useEffect } from "react";
import { assignmentsApi } from "../api/assignments.api";
import { coursesApi } from "../../courses/api/courses.api";
import { adminApi } from "../../../Dashboard/Admin/api/admin.api";
import { enrollmentsApi } from "../../enrollments/api/enrollments.api";
import { courseModulesApi } from "../../courseModules/api/courseModules.api";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import CustomDropdown from "../../classRecords/components/CustomDropdown";
import FileUploadZone from "./FileUploadZone";

const BRAND = "#6b1142";

const INITIAL = {
  teacherId: "",
  courseId: "",
  sectionId: "",
  semesterId: "",
  courseModuleId: "",
  title: "",
  description: "",
  teacherInstruction: "",
  dueDate: "",
  totalMarks: "",
  passingMarks: "",
  requiredWordCount: "",
  allowLateSubmission: false,
  status: "draft",
};

const toLocalDt = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function CreateAssignmentModal({
  onClose,
  onSaved,
  editAssignment,
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEdit = Boolean(editAssignment);

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          ...INITIAL,
          teacherId: editAssignment.teacher?.id || "",
          courseId: editAssignment.courseId || "",
          sectionId: editAssignment.sectionId || "",
          semesterId: editAssignment.semesterId || "",
          courseModuleId:
            editAssignment.courseModule?.id ||
            editAssignment.courseModuleId ||
            "",
          title: editAssignment.title || "",
          description: editAssignment.description || "",
          teacherInstruction: editAssignment.teacherInstruction || "",
          dueDate: toLocalDt(editAssignment.dueDate),
          totalMarks: editAssignment.totalMarks ?? "",
          passingMarks: editAssignment.passingMarks ?? "",
          requiredWordCount: editAssignment.requiredWordCount ?? "",
          allowLateSubmission: Boolean(editAssignment.allowLateSubmission),
          status: editAssignment.status || "draft",
        }
      : INITIAL,
  );

  // console.log("module info(edit):", editAssignment);

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courseModules, setCourseModules] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState("");
  // Files attached to the assignment (list of File records {id, name, fileUrl})
  const [uploadedFiles, setUploadedFiles] = useState(
    isEdit
      ? (editAssignment.assignmentFiles || []).map((af) => af.file || af)
      : [],
  );

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const promises = [
          coursesApi.list({ limit: 200 }),
          api.get("/semesters"),
        ];

        // Add teacher enrollments for teachers
        if (!isAdmin && user?.teacherProfile?.id) {
          promises.push(enrollmentsApi.teachers.list());
        }

        const responses = await Promise.all(promises);

        const coursesRes = responses[0];
        let fullCourseList = coursesRes.data?.data || [];

        const semestersRes = responses[1];
        const semestersList = Array.isArray(semestersRes.data)
          ? semestersRes.data
          : semestersRes.data?.data || [];

        // console.log("All courses fetched:", fullCourseList);
        // console.log("All semesters fetched:", semestersList);

        // Track teacher's assigned course IDs and semesters for filtering
        let teacherAssignedCourseIds = [];
        let teacherAssignedSemesterIds = new Set();

        // For teachers, determine which courses and semesters they have access to
        if (!isAdmin && user?.teacherProfile?.id && responses[2]) {
          const teacherId = user.teacherProfile.id;
          const allEnrollments =
            responses[2].data?.data || responses[2].data || [];
          // console.log("All enrollments fetched:", allEnrollments);

          const teacherEnrollments = allEnrollments.filter(
            (enrollment) => enrollment.teacher?.id === teacherId,
          );

          // console.log("Teacher enrollments:", teacherEnrollments);

          teacherAssignedCourseIds = teacherEnrollments.map((e) => e.courseId);
          // console.log("Teacher assigned course IDs:", teacherAssignedCourseIds);

          // Build set of semesters that have teacher's courses
          fullCourseList.forEach((course) => {
            if (teacherAssignedCourseIds.includes(course.id)) {
              teacherAssignedSemesterIds.add(course.semesterId);
            }
          });
          // console.log(
          //   "Teacher assigned semester IDs:",
          //   Array.from(teacherAssignedSemesterIds),
          // );
        }

        // Build semester -> courses map from ALL courses
        const semCxMap = {};
        fullCourseList.forEach((course) => {
          const semId = course.semesterId;
          if (semId) {
            if (!semCxMap[semId]) semCxMap[semId] = [];
            if (!semCxMap[semId].includes(course.id)) {
              semCxMap[semId].push(course.id);
            }
          }
        });

        // Build course -> sections map from ALL courses
        const cxSecMap = {};
        fullCourseList.forEach((course) => {
          if (course.sections && Array.isArray(course.sections)) {
            cxSecMap[course.id] = course.sections.map((s) => s.id);
          }
        });

        // console.log("Full semester course map:", semCxMap);
        // console.log("Full course section map:", cxSecMap);

        // For filtering, determine which courses to show
        let displayCourseList = fullCourseList;
        if (!isAdmin && teacherAssignedCourseIds.length > 0) {
          displayCourseList = fullCourseList.filter((course) =>
            teacherAssignedCourseIds.includes(course.id),
          );
          // console.log("Courses for teacher display:", displayCourseList);
        }

        // For filtering, determine which semesters to show
        let displaySemestersList = semestersList;
        if (!isAdmin && teacherAssignedSemesterIds.size > 0) {
          displaySemestersList = semestersList.filter((sem) =>
            teacherAssignedSemesterIds.has(sem.id),
          );
          // console.log("Semesters for teacher display:", displaySemestersList);
        }

        setCourses(displayCourseList);
        setSemesters(displaySemestersList);
        setFilteredCourses(displayCourseList);
        setFilteredSections([]);
        setFilteredSemesters(displaySemestersList);

        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load form data. Make sure the server is running.");
      } finally {
        setMetaLoading(false);
      }
    };

    fetchAllData();
  }, [isAdmin, user?.teacherProfile?.id]);

  // This effect is no longer needed - removed teacher enrollment fetch
  // since it's now combined in the main useEffect above

  // Filter courses based on selected semester
  useEffect(() => {
    // console.log("Semester filter effect triggered:");
    // console.log("- form.semesterId:", form.semesterId);
    // console.log("- semesterCourseMap:", semesterCourseMap);
    // console.log("- courses:", courses);

    if (form.semesterId) {
      if (semesterCourseMap[form.semesterId]) {
        const courseIds = semesterCourseMap[form.semesterId];
        // console.log("- Found courseIds for semester:", courseIds);
        const filtered = courses.filter((c) => courseIds.includes(c.id));
        // console.log("- Filtered courses:", filtered);
        setFilteredCourses(filtered);
      } else {
        // console.log("- Semester not found in map, showing empty");
        setFilteredCourses([]);
      }
    } else {
      // console.log("- No semester selected, showing all courses");
      setFilteredCourses(courses);
    }
    // Reset course and section when semester changes (but not if editing and course was pre-set)
    setForm((prev) => ({
      ...prev,
      courseId: isEdit && editAssignment.courseId ? prev.courseId : "",
      sectionId: isEdit && editAssignment.sectionId ? prev.sectionId : "",
    }));
  }, [form.semesterId, semesterCourseMap, courses, isEdit, editAssignment]);

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
    // Reset section when course changes (but not if editing and section was pre-set)
    setForm((prev) => ({
      ...prev,
      sectionId: isEdit && editAssignment.sectionId ? prev.sectionId : "",
    }));
  }, [form.courseId, courseSectionMap, courses, isEdit, editAssignment]);

  // Fetch and filter teachers based on selected course (for admin only)
  // For teachers, automatically set their ID
  useEffect(() => {
    if (isAdmin && form.courseId) {
      // console.log("Fetching teachers for courseId:", form.courseId);
      enrollmentsApi.teachers
        .list({ courseId: form.courseId })
        .then((res) => {
          // console.log("Teachers API response:", res);
          // console.log("Teachers data:", res.data);
          const teachersList = res.data?.data || res.data || [];
          // console.log("Teachers list:", teachersList);

          // Debug: Log first teacher object to see structure
          if (teachersList.length > 0) {
            // console.log("First teacher object:", teachersList[0]);
            // console.log("Teacher object keys:", Object.keys(teachersList[0]));
          }

          setFilteredTeachers(teachersList);
        })
        .catch((err) => {
          console.error("Error fetching teachers:", err);
          console.error("Error response:", err.response?.data);
          setFilteredTeachers([]);
        });
    } else {
      setFilteredTeachers([]);
    }
    // Reset teacher selection when course changes (but not if editing and teacher was pre-set)
    if (isAdmin) {
      setForm((prev) => ({
        ...prev,
        teacherId: isEdit && editAssignment.teacher?.id ? prev.teacherId : "",
      }));
    } else if (!isAdmin && user?.teacherProfile?.id) {
      // For teachers, automatically set their teacherId
      setForm((prev) => ({
        ...prev,
        teacherId: user.teacherProfile.id,
      }));
    }
  }, [
    form.courseId,
    isAdmin,
    user?.teacherProfile?.id,
    isEdit,
    editAssignment,
  ]);

  // Ensure all semesters are always available (semester is the parent/first selector)
  useEffect(() => {
    setFilteredSemesters(semesters);
  }, [semesters]);

  // Fetch course modules when courseId or sectionId changes
  useEffect(() => {
    if (form.courseId) {
      courseModulesApi
        .list({
          courseId: form.courseId,
          ...(form.sectionId ? { sectionId: form.sectionId } : {}),
        })
        .then((res) => setCourseModules(res.data?.modules || []))
        .catch(() => setCourseModules([]));
    } else {
      setCourseModules([]);
      setForm((prev) => ({ ...prev, courseModuleId: "" }));
    }
  }, [form.courseId, form.sectionId]);

  // For edit mode: Ensure filtered lists include the previously selected values
  useEffect(() => {
    if (isEdit && !metaLoading) {
      // Populate filtered courses if we have a selected semester
      if (form.semesterId && semesterCourseMap[form.semesterId]) {
        const courseIds = semesterCourseMap[form.semesterId];
        const filtered = courses.filter((c) => courseIds.includes(c.id));
        setFilteredCourses(filtered);
      }

      // Populate filtered sections if we have a selected course
      if (form.courseId && courseSectionMap[form.courseId]) {
        const sectionIds = courseSectionMap[form.courseId];
        const courseObj = courses.find((c) => c.id === form.courseId);
        const sectionsList = courseObj?.sections || [];
        setFilteredSections(
          sectionsList.filter((s) => sectionIds.includes(s.id)),
        );
      }

      // Populate filtered teachers if admin and we have a selected course
      if (isAdmin && form.courseId) {
        enrollmentsApi.teachers
          .list({ courseId: form.courseId })
          .then((res) => {
            const teachersList = res.data?.data || res.data || [];
            setFilteredTeachers(teachersList);
          })
          .catch((err) => {
            console.error("Error fetching teachers:", err);
            setFilteredTeachers([]);
          });
      }
    }
  }, [
    isEdit,
    metaLoading,
    form.semesterId,
    form.courseId,
    courses,
    courseSectionMap,
    semesterCourseMap,
    isAdmin,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Assignment title is required";
    if (!form.semesterId) return "Please select a semester";
    if (!form.courseId) return "Please select a course";
    if (!form.sectionId) return "Please select a section";
    if (!form.courseModuleId) return "Please select a module";
    if (!form.teacherId) return "Please select a teacher";
    if (!form.dueDate) return "Please select a submission deadline";

    // Validate marks only if provided
    if (form.totalMarks !== "") {
      const total = Number(form.totalMarks);
      if (total <= 0) return "Total marks must be a positive number";

      // If total marks is provided, passing marks can be optional
      if (form.passingMarks !== "") {
        const passing = Number(form.passingMarks);
        if (passing <= 0) return "Passing marks must be a positive number";
        if (passing > total)
          return `Passing marks cannot exceed total marks (${total})`;
      }
    }

    return null;
  };

  const submit = async (statusOverride) => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.teacherInstruction || null,
        courseId: form.courseId,
        sectionId: form.sectionId || null,
        semesterId: form.semesterId || null,
        courseModuleId: form.courseModuleId || null,
        dueDate: form.dueDate || null,
        totalMarks: form.totalMarks !== "" ? Number(form.totalMarks) : null,
        passingMarks:
          form.passingMarks !== "" ? Number(form.passingMarks) : null,
        requiredWordCount: form.requiredWordCount !== "" ? Number(form.requiredWordCount) : null,
        allowLateSubmission: Boolean(form.allowLateSubmission),
        status: statusOverride || form.status,
        targetType: form.sectionId ? "section" : "individual",
        assignmentFileIds: uploadedFiles.map((f) => f.id),
        ...(isAdmin && form.teacherId ? { teacherId: form.teacherId } : {}),
      };
      if (isEdit) {
        await assignmentsApi.update(editAssignment.id, payload);
      } else {
        await assignmentsApi.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to save assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 md:px-8 py-2.5 md:py-6 flex items-center justify-between z-10">
          <h2 className="text-[17px] md:text-2xl lg:text-2xl font-bold text-gray-900 flex-1">
            {isEdit ? "Edit Assignment" : "Create New Assignment"}
          </h2>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Close"
          >
            <svg
              className="w-4 h-5 md:w-6 md:h-6"
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

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 md:p-8 space-y-4 md:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Top row: Semester, Course, Section, Assigning Teacher (cascading dropdowns) */}
            <div className="bg-gray-50 rounded-lg p-4 md:p-6">
              {/* Loading Indicator */}
              {metaLoading && (
                <div className="flex items-center justify-center gap-2 p-4 mb-4">
                  <div
                    className="w-5 h-5 border-2 border-gray-200 rounded-full animate-spin"
                    style={{ borderTopColor: BRAND }}
                  />
                  <p className="text-sm text-gray-600 font-medium">
                    Loading data...
                  </p>
                </div>
              )}

              <div
                className={`grid grid-cols-1 gap-4 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                {/* Semester - First selector (always enabled) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={filteredSemesters.map((s) => ({
                      id: s.id,
                      name: `${s.name} ${s.year ? `(${s.year})` : ""}`,
                    }))}
                    value={form.semesterId}
                    onChange={(val) =>
                      handleChange({
                        target: { name: "semesterId", value: val },
                      })
                    }
                    placeholder={metaLoading ? "Loading…" : "Select semester…"}
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={metaLoading}
                  />
                </div>

                {/* Course - Second selector (disabled until semester selected) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={filteredCourses.map((c) => ({
                      id: c.id,
                      name: c.title,
                    }))}
                    value={form.courseId}
                    onChange={(val) =>
                      handleChange({ target: { name: "courseId", value: val } })
                    }
                    placeholder={
                      !form.semesterId
                        ? "Select semester first"
                        : "Select course…"
                    }
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={!form.semesterId || metaLoading}
                  />
                </div>

                {/* Section - Third selector (disabled until course selected) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={filteredSections.map((s) => ({
                      id: s.id,
                      name: s.name,
                    }))}
                    value={form.sectionId}
                    onChange={(val) =>
                      handleChange({
                        target: { name: "sectionId", value: val },
                      })
                    }
                    placeholder={
                      !form.courseId ? "Select course first" : "Select section"
                    }
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={!form.courseId || metaLoading}
                  />
                </div>

                {/* Course Module - optional, depends on course */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Module <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    options={courseModules.map((m) => ({
                      id: m.id,
                      name: m.name,
                    }))}
                    value={form.courseModuleId}
                    onChange={(val) =>
                      handleChange({
                        target: { name: "courseModuleId", value: val },
                      })
                    }
                    placeholder={
                      !form.courseId
                        ? "Select course first"
                        : courseModules.length === 0
                          ? "No modules"
                          : "Select module…"
                    }
                    isSmallScreen={false}
                    BRAND={BRAND}
                    disabled={!form.courseId || courseModules.length === 0}
                  />
                </div>

                {/* Assigning Teacher - Fourth selector (admin only, depends on course) */}
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Teacher <span className="text-red-500">*</span>
                    </label>
                    <CustomDropdown
                      options={filteredTeachers.map((enrollment) => ({
                        id: enrollment.teacher.id,
                        name: enrollment.teacher.fullName,
                      }))}
                      value={form.teacherId}
                      onChange={(val) =>
                        handleChange({
                          target: { name: "teacherId", value: val },
                        })
                      }
                      placeholder={
                        !form.courseId
                          ? "Select course first"
                          : "Select teacher…"
                      }
                      isSmallScreen={false}
                      BRAND={BRAND}
                      disabled={!form.courseId || metaLoading}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Left */}
              <div className="space-y-4 md:space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter assignment title…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                  />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description of the assignment…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                  />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Instructions / Teacher Notes
                  </label>
                  <textarea
                    name="teacherInstruction"
                    value={form.teacherInstruction}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Step-by-step instructions, requirements, resources…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                  />
                </div>

                {/* Attachments */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Attachments{" "}
                    <span className="text-xs font-normal text-gray-400">
                      (optional — students will see these)
                    </span>
                  </label>
                  <FileUploadZone
                    fileType="assignment"
                    uploadedFiles={uploadedFiles}
                    onFilesChange={setUploadedFiles}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Right */}
              <div className="space-y-4 md:space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Leave blank for no deadline
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Marks Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">
                        Total Marks
                      </label>
                      <input
                        type="number"
                        name="totalMarks"
                        value={form.totalMarks}
                        onChange={handleChange}
                        min={1}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">
                        Passing Marks
                      </label>
                      <input
                        type="number"
                        name="passingMarks"
                        value={form.passingMarks}
                        onChange={handleChange}
                        min={0}
                        max={form.totalMarks || undefined}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 mb-1.5">
                      Required Word Count <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="number"
                      name="requiredWordCount"
                      value={form.requiredWordCount}
                      onChange={handleChange}
                      min={1}
                      placeholder="e.g. 500"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Students will see a word count indicator when typing their response.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Allow Late Submission
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Students can submit after the deadline
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowLateSubmission"
                      checked={form.allowLateSubmission}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#6b1142] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>

                {isEdit && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                    {/* status selection part*/}
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Status
                    </h3>
                    <div className="flex gap-4 md:gap-5">
                      {["draft", "published", "closed"].map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-1 md:gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="status"
                            value={s}
                            checked={form.status === s}
                            onChange={handleChange}
                            className="accent-[#6b1142]"
                          />
                          <span className="text-sm capitalize text-gray-700">
                            {s}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-8 py-3 md:py-5 flex flex-col gap-2 md:gap-3 md:flex-row md:justify-between md:items-center">
          {isEdit ? (
            <div className="flex gap-2 md:gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm md:text-base font-medium hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => submit()}
                disabled={loading || metaLoading}
                className="px-5 py-2.5 bg-[#6b1142] text-white rounded-lg text-sm md:text-base font-medium hover:bg-[#5a0d38] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Update"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 md:gap-3 flex-1 md:flex-none">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm md:text-base font-medium hover:bg-gray-50 transition"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => submit("draft")}
                  disabled={loading || metaLoading}
                  className="flex-1 md:flex-none px-3 py-2.5 md:py-2 md:px-3 border-2 border-[#6b1142] text-[#6b1142] rounded-lg text-sm md:text-base font-medium hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save as Draft
                </button>
              </div>

              <button
                type="button"
                onClick={() => submit("published")}
                disabled={loading || metaLoading}
                className="w-full md:w-auto px-5 py-2.5 bg-[#6b1142] text-white rounded-lg text-sm md:text-base font-medium hover:bg-[#5a0d38] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving…" : "Publish"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
