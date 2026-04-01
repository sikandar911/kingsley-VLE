import { useEffect, useState } from "react";
import { attendanceApi } from "../api/attendance.api";

const Attendance = () => {
  const [records, setRecords] = useState([]);

  // Filter states - DEPENDENT CHAIN
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Track selected statuses for bulk attendance: { studentId: "status" }
  const [selectedStatuses, setSelectedStatuses] = useState({});

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Loading state for fetching attendance data
  const [isFetching, setIsFetching] = useState(false);

  // Dropdown data
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);

  // Filtered dropdown data based on selections
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  // Relationship maps
  const [sessionSemesterMap, setSessionSemesterMap] = useState({}); // sessionId -> [semesterIds]
  const [semesterCourseMap, setSemesterCourseMap] = useState({}); // semesterId -> [courseIds]
  const [courseSectionMap, setCourseSectionMap] = useState({}); // courseId -> [sectionIds]

  // Fetch all data and build relationship maps
  const fetchAllData = async () => {
    try {
      // Fetch sessions
      const sessionRes = (await attendanceApi.getSessions?.()) || { data: [] };
      const sessionsData = Array.isArray(sessionRes?.data)
        ? sessionRes.data
        : sessionRes?.data?.sessions || [];
      setSessions(sessionsData);

      // Fetch semesters
      const semesterRes = (await attendanceApi.getSemesters?.()) || {
        data: [],
      };
      const semestersData = Array.isArray(semesterRes?.data)
        ? semesterRes.data
        : semesterRes?.data?.semesters || [];
      setSemesters(semestersData);

      // Fetch courses - IMPORTANT: API returns { courses, total, page, limit }
      const courseRes = (await attendanceApi.getCourses?.()) || { data: {} };
      let coursesData = [];
      if (Array.isArray(courseRes?.data?.data)) {
        coursesData = courseRes.data.data; // New { data: [...] } response
      } else if (Array.isArray(courseRes?.data)) {
        coursesData = courseRes.data; // Fallback for direct array response
      }
      setCourses(coursesData);

      // Fetch sections
      const sectionRes = (await attendanceApi.getSections?.()) || { data: [] };
      const sectionsData = Array.isArray(sectionRes?.data)
        ? sectionRes.data
        : sectionRes?.data?.sections || [];
      setSections(sectionsData);

      // Build relationship maps
      const sessToSem = {};
      const semToCourse = {};
      const courseToSec = {};

      // Build session -> semester map
      semestersData.forEach((sem) => {
        if (sem.sessionId) {
          if (!sessToSem[sem.sessionId]) sessToSem[sem.sessionId] = [];
          if (!sessToSem[sem.sessionId].includes(sem.id)) {
            sessToSem[sem.sessionId].push(sem.id);
          }
        }
      });

      // Build semester -> course map
      coursesData.forEach((course) => {
        // Try to get semesterId - it might be direct or nested in semester object
        const semId = course.semesterId || course.semester?.id;
        console.log(
          `Course: ${course.id}, title: ${course.title || course.name}, semesterId: ${semId}, full object:`,
          course,
        );
        if (semId) {
          if (!semToCourse[semId]) semToCourse[semId] = [];
          if (!semToCourse[semId].includes(course.id)) {
            semToCourse[semId].push(course.id);
          }
        }
      });

      // Build course -> section map
      sectionsData.forEach((section) => {
        if (section.courseId) {
          if (!courseToSec[section.courseId])
            courseToSec[section.courseId] = [];
          if (!courseToSec[section.courseId].includes(section.id)) {
            courseToSec[section.courseId].push(section.id);
          }
        }
      });

      // Debug logs
      console.log("===== ATTENDANCE FILTER DEBUG =====");
      console.log("Sessions:", sessionsData);
      console.log("Semesters:", semestersData);
      console.log("Courses:", coursesData);
      console.log("Sections:", sectionsData);
      console.log("sessionSemesterMap:", sessToSem);
      console.log("semesterCourseMap:", semToCourse);
      console.log("courseSectionMap:", courseToSec);

      setSessionSemesterMap(sessToSem);
      setSemesterCourseMap(semToCourse);
      setCourseSectionMap(courseToSec);

      // Set defaults: Latest session
      if (sessionsData.length > 0) {
        const latestSession = sessionsData[0];
        setSelectedSession(latestSession.id);
        // Rest will be auto-set by useEffect hooks
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // Handle session change
  const handleSessionChange = (sessionId) => {
    setSelectedSession(sessionId);
    setSelectedSemester("");
    setSelectedCourse("");
    setSelectedSection("");
  };

  // Handle semester change
  const handleSemesterChange = (semesterId) => {
    setSelectedSemester(semesterId);
    setSelectedCourse("");
    setSelectedSection("");
  };

  // Handle course change
  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    setSelectedSection("");
  };

  const fetchAttendance = async () => {
    try {
      setIsFetching(true);

      // ALWAYS fetch all enrolled students (no date filter for students)
      const enrollParams = {};
      if (selectedSemester) enrollParams.semesterId = selectedSemester;
      if (selectedCourse) enrollParams.courseId = selectedCourse;
      if (selectedSection) enrollParams.sectionId = selectedSection;

      console.log("Fetching enrollments with params:", enrollParams);

      // Get ALL enrollments (students)
      const enrollRes = await attendanceApi.getEnrollments(enrollParams);

      console.log("Enrollments response:", enrollRes.data);

      // Now fetch attendance records FOR A SPECIFIC DATE (if date is selected)
      // This will only return records that have attendance on that date
      const attendanceParams = {
        sectionId: selectedSection,
      };

      // Query attendance by date if dateFilter is set
      if (dateFilter) {
        attendanceParams.date = dateFilter;
      }

      const attendRes = await attendanceApi.getAll(attendanceParams);
      const attendanceMap = {}; // Map studentId -> status for that date

      if (attendRes.data && attendRes.data.records) {
        attendRes.data.records.forEach((att) => {
          attendanceMap[att.studentId] = att.status;
        });
      }

      console.log(
        `Attendance records for date ${dateFilter || "today"}:`,
        attendanceMap,
      );

      // Merge: Show ALL students, but status from that specific date if exists
      const enrollmentRecords = (enrollRes.data || []).map((enrollment) => ({
        id: enrollment.id,
        studentId: enrollment.studentId,
        student: enrollment.student,
        sectionId: enrollment.sectionId,
        section: enrollment.section,
        semesterId: enrollment.semesterId,
        semester: enrollment.semester,
        courseId: enrollment.courseId,
        course: enrollment.course,
        status: attendanceMap[enrollment.studentId] || null, // Status from THAT DATE only (null if not marked)
        date: dateFilter || new Date().toISOString().split("T")[0],
      }));

      setRecords(enrollmentRecords);
      setIsFetching(false);
    } catch (err) {
      console.error("Error fetching enrollments/attendance:", err);
      setIsFetching(false);
      setRecords([]);
    }
  };

  // Filter sections and semesters based on selected section
  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-update filtered semesters when session changes or maps are built
  useEffect(() => {
    if (selectedSession && sessionSemesterMap[selectedSession]) {
      const semIds = sessionSemesterMap[selectedSession];
      const filtered = semesters.filter((s) => semIds.includes(s.id));
      setFilteredSemesters(filtered);

      // Auto-select first semester
      if (filtered.length > 0 && !selectedSemester) {
        setSelectedSemester(filtered[0].id);
      }
    } else {
      setFilteredSemesters([]);
    }
  }, [selectedSession, sessionSemesterMap, semesters]);

  // Auto-update filtered courses when semester changes or maps are built
  useEffect(() => {
    console.log("=== COURSE FILTER EFFECT ===");
    console.log("selectedSemester:", selectedSemester);
    console.log("semesterCourseMap:", semesterCourseMap);
    console.log("courses array:", courses);

    if (selectedSemester && semesterCourseMap[selectedSemester]) {
      const courseIds = semesterCourseMap[selectedSemester];
      console.log("Found courseIds for semester:", courseIds);
      const filtered = courses.filter((c) => courseIds.includes(c.id));
      console.log("Filtered courses:", filtered);
      setFilteredCourses(filtered);
      // DO NOT auto-select - user will select manually
    } else {
      console.log(
        "No courseIds found - semesterCourseMap has keys:",
        Object.keys(semesterCourseMap),
      );
      setFilteredCourses([]);
    }
  }, [selectedSemester, semesterCourseMap, courses]);

  // Auto-update filtered sections when course changes or maps are built
  useEffect(() => {
    if (selectedCourse && courseSectionMap[selectedCourse]) {
      const sectionIds = courseSectionMap[selectedCourse];
      const filtered = sections.filter((s) => sectionIds.includes(s.id));
      setFilteredSections(filtered);

      // Auto-select first section when course is selected
      if (filtered.length > 0 && !selectedSection) {
        setSelectedSection(filtered[0].id);
      }
    } else {
      setFilteredSections([]);
    }
  }, [selectedCourse, courseSectionMap, sections]);

  useEffect(() => {
    fetchAttendance();
  }, [
    selectedSession,
    selectedSemester,
    selectedCourse,
    selectedSection,
    dateFilter,
  ]);

  // Clear selected statuses when date is cleared
  useEffect(() => {
    if (!dateFilter) {
      setSelectedStatuses({});
    }
  }, [dateFilter]);

  const getSectionName = (sectionId) => {
    if (!sectionId) return "N/A";
    const section = sections.find((s) => s.id === sectionId);
    return section?.name || "Unknown";
  };

  const getSemesterName = (semesterId) => {
    if (!semesterId) return "N/A";
    const semester = semesters.find((s) => s.id === semesterId);
    return semester?.name || "Unknown";
  };

  const getSessionName = (sessionId) => {
    if (!sessionId) return "N/A";
    const session = sessions.find((s) => s.id === sessionId);
    return session?.name || session?.year || "Unknown";
  };

  const getCourseName = (courseId) => {
    if (!courseId) return "N/A";
    const course = courses.find((c) => c.id === courseId);
    return course?.title || course?.name || "Unknown";
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete attendance?")) return;
    await attendanceApi.remove(id);
    fetchAttendance();
  };

  const handleStatusChange = (record, newStatus) => {
    setSelectedStatuses((prev) => ({
      ...prev,
      [record.studentId]: newStatus,
    }));
  };

  const saveBulkAttendance = async () => {
    // Validate all required fields
    const missingFields = [];

    if (!selectedSession) missingFields.push("Session");
    if (!selectedSemester) missingFields.push("Semester");
    if (!selectedCourse) missingFields.push("Course");
    if (!selectedSection) missingFields.push("Section");
    if (!dateFilter) missingFields.push("Date");

    if (missingFields.length > 0) {
      alert(
        `Please select the following fields before saving:\n\n• ${missingFields.join("\n• ")}`,
      );
      return;
    }

    try {
      setIsSaving(true);

      // Post ALL students - with selected status or null if not selected
      const bulkData = {
        sectionId: selectedSection,
        semesterId: selectedSemester,
        date: dateFilter,
        records: records.map((student) => ({
          studentId: student.studentId,
          status: selectedStatuses[student.studentId] || null, // null if not selected
        })),
      };

      console.log("Posting bulk attendance:", bulkData);

      // POST to bulk endpoint
      const res = await attendanceApi.createBulk(bulkData);

      console.log("Bulk attendance response:", res.data);

      // Clear selections and refresh
      setSelectedStatuses({});
      await fetchAttendance(); // Wait for fetch to complete

      setIsSaving(false);
    } catch (err) {
      console.error("Error saving bulk attendance:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 md:mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            Attendance
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage and track student attendance records.
          </p>
        </div>

        <div className="flex gap-2"></div>
      </div>

      {/* Filter - DEPENDENT DROPDOWNS */}
      <div
        className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
        style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
      >
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:gap-3">
          {/* Session Dropdown */}
          <div className="flex flex-col">
            <label className="text-white text-xs sm:text-sm font-semibold mb-1.5">
              Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
              style={{ "--tw-ring-color": "#6b1d3a" }}
            >
              <option value="">Select Session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name || session.year || "Session"}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Dropdown */}
          <div className="flex flex-col">
            <label className="text-white text-xs sm:text-sm font-semibold mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer disabled:bg-gray-200 disabled:cursor-not-allowed"
              style={{ "--tw-ring-color": "#6b1d3a" }}
              disabled={!selectedSession}
            >
              <option value="">Select Semester</option>
              {filteredSemesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name || `Semester ${semester.semesterNumber}`}
                </option>
              ))}
            </select>
          </div>

          {/* Course Dropdown */}
          <div className="flex flex-col">
            <label className="text-white text-xs sm:text-sm font-semibold mb-1.5">
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer disabled:bg-gray-200 disabled:cursor-not-allowed"
              style={{ "--tw-ring-color": "#6b1d3a" }}
              disabled={!selectedSemester}
            >
              <option value="">Select Course</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title || course.name || "Course"}
                </option>
              ))}
            </select>
          </div>

          {/* Section Dropdown */}
          <div className="flex flex-col">
            <label className="text-white text-xs sm:text-sm font-semibold mb-1.5">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer disabled:bg-gray-200 disabled:cursor-not-allowed"
              style={{ "--tw-ring-color": "#6b1d3a" }}
              disabled={!selectedCourse}
            >
              <option value="">Select Section</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name || section.code}
                </option>
              ))}
            </select>
          </div>

          {/* Date Input */}
          <div className="flex flex-col">
            <label className="text-white text-xs sm:text-sm font-semibold mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#6b1d3a" }}
            />
          </div>
        </div>
      </div>

      {/* Reset and Save Buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setDateFilter("");
            handleSessionChange("");
            setSelectedStatuses({});
          }}
          className="px-4 py-2.5 sm:py-3 bg-white text-gray-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-100 transition border border-gray-300"
        >
          Reset Filters
        </button>

        {records.length > 0 && (
          <button
            onClick={saveBulkAttendance}
            disabled={
              isSaving ||
              !selectedSession ||
              !selectedSemester ||
              !selectedCourse ||
              !selectedSection ||
              !dateFilter
            }
            className="px-4 py-2.5 sm:py-3 bg-[#611936] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#7e2347] transition disabled:bg-gray-400 disabled:cursor-not-allowed hover:disabled:bg-gray-400"
          >
            {isSaving ? "⏳ Saving & Loading..." : "💾 Save Attendance"}
          </button>
        )}
      </div>

      {/* Attendance Cards */}
      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-sm">No attendance records found</p>
          </div>
        ) : (
          records.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md p-5 border-l-4"
              style={{ borderLeftColor: "#6b1d3a" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {item.student?.fullName || "Unknown Student"}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Roll: {item.student?.studentId || item.studentId || "N/A"} •{" "}
                    {item.section?.name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Status Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStatusChange(item, "present")}
                  disabled={!dateFilter}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    border: "none",
                    cursor: !dateFilter ? "not-allowed" : "pointer",
                    backgroundColor: !dateFilter
                      ? "#d1d5db"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "present"
                        ? "#22c55e"
                        : "#d1d5db",
                    color: !dateFilter
                      ? "#9ca3af"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "present"
                        ? "white"
                        : "#374151",
                    transition: "all 0.2s ease",
                    opacity: !dateFilter ? 0.6 : 1,
                  }}
                >
                  ✓ Present
                </button>
                <button
                  onClick={() => handleStatusChange(item, "absent")}
                  disabled={!dateFilter}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    border: "none",
                    cursor: !dateFilter ? "not-allowed" : "pointer",
                    backgroundColor: !dateFilter
                      ? "#d1d5db"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "absent"
                        ? "#ef4444"
                        : "#d1d5db",
                    color: !dateFilter
                      ? "#9ca3af"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "absent"
                        ? "white"
                        : "#374151",
                    transition: "all 0.2s ease",
                    opacity: !dateFilter ? 0.6 : 1,
                  }}
                >
                  ⊘ Absent
                </button>
                <button
                  onClick={() => handleStatusChange(item, "late")}
                  disabled={!dateFilter}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    border: "none",
                    cursor: !dateFilter ? "not-allowed" : "pointer",
                    backgroundColor: !dateFilter
                      ? "#d1d5db"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "late"
                        ? "#3b82f6"
                        : "#d1d5db",
                    color: !dateFilter
                      ? "#9ca3af"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "late"
                        ? "white"
                        : "#374151",
                    transition: "all 0.2s ease",
                    opacity: !dateFilter ? 0.6 : 1,
                  }}
                >
                  👤 Late
                </button>
                <button
                  onClick={() => handleStatusChange(item, "excused")}
                  disabled={!dateFilter}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    border: "none",
                    cursor: !dateFilter ? "not-allowed" : "pointer",
                    backgroundColor: !dateFilter
                      ? "#d1d5db"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "excused"
                        ? "#f59e0b"
                        : "#d1d5db",
                    color: !dateFilter
                      ? "#9ca3af"
                      : (selectedStatuses[item.studentId] || item.status) ===
                          "excused"
                        ? "white"
                        : "#374151",
                    transition: "all 0.2s ease",
                    opacity: !dateFilter ? 0.6 : 1,
                  }}
                >
                  ⏰ Excused
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Loading Overlay - Fetching */}
      {isFetching && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                width: "40px",
                height: "40px",
                border: "3px solid #e5e7eb",
                borderTop: "3px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p
              style={{
                marginTop: "12px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              Loading attendance data...
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isSaving && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                width: "50px",
                height: "50px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p
              style={{
                marginTop: "16px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              Saving attendance...
            </p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>
              Please wait.This may take a moment.
            </p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
