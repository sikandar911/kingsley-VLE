import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { enrollmentsApi } from '../../../features/enrollments/api/enrollments.api'
import { authApi } from '../../../Auth/api/auth.api'
import TeacherAssignmentsTab from './components/TeacherAssignmentsTab'
import TeacherMaterialsTab from './components/TeacherMaterialsTab'
import TeacherGradePerformanceTab from './components/TeacherGradePerformanceTab'
import CourseChatTab from '../../../features/courseChat/components/CourseChatTab'
import CourseModulesTab from '../../../features/courseModules/components/CourseModulesTab'

// ── Tab IDs ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general', label: 'General' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'materials', label: 'Materials' },
  { id: 'modules', label: 'Modules' },
  { id: 'grade', label: 'Grade & Performance' },
]

// ── Main TeacherCourseProfilePage ──────────────────────────────────────────
export default function TeacherCourseProfilePage() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const sectionIdParam = searchParams.get("sectionId");
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("general");
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [error, setError] = useState(null);
  const semester = enrollment?.semester;
  const semesterDisplay = semester
    ? `${semester.year || new Date().getFullYear()}-${semester.name || ""}`
    : "";

  useEffect(() => {
    const loadCourseInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the logged-in teacher's profile ID
        const meRes = await authApi.getMe();
        const teacherProfileId = meRes.data?.teacherProfile?.id;

        if (!teacherProfileId) {
          setError("Teacher profile not found.");
          return;
        }

        // Get teacher course enrollments filtered by teacher ID
        const res = await enrollmentsApi.teachers.list({
          teacherId: teacherProfileId,
        });
        const enrollments = Array.isArray(res.data) ? res.data : [];

        // Match by courseId and optionally sectionId
        let found = sectionIdParam
          ? enrollments.find(
              (e) =>
                (e.courseId === courseId || e.course?.id === courseId) &&
                e.section?.id === sectionIdParam,
            )
          : null;

        // Fall back to any enrollment for this course
        if (!found) {
          found = enrollments.find(
            (e) => e.courseId === courseId || e.course?.id === courseId,
          );
        }

        if (!found) {
          setError("Course not found in your assigned courses.");
          return;
        }

        setCourse(found.course || { id: courseId, title: "Course" });
        setSection(found.section || null);
        setEnrollment(found || null);
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Failed to load course information.");
      } finally {
        setLoading(false);
      }
    };

    loadCourseInfo();
  }, [courseId, sectionIdParam]);

  const courseTitle = course?.title || "Course";
  const avatarLetter = courseTitle.charAt(0).toUpperCase();
  const sectionId = sectionIdParam || section?.id || null;
  const openCalendarModal = () => {
    window.dispatchEvent(new Event("open-calendar-modal"));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-36 shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate("/teacher/courses")}
            style={{ backgroundColor: "#6b1d3e" }}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition"
          >
            ← Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Course Header (Teacher Variant) ── */}
      <div className="bg-[#601935] border-b border-blue-800 sticky top-0 z-30">
        <div className="flex items-center gap-1 md:gap-3 px-2 md:px-4 sm:px-6 py-3.5">
          {/* Back button */}{" "}
          <button
            onClick={() => navigate("/teacher/courses")}
            className="p-1.5 rounded-lg hover:bg-white transition hover:text-[#601935] text-white flex-shrink-0"
            aria-label="Go back"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          {/* Course Avatar (Different style for teacher) */}
          {/* avatar div */}
          <div className="hidden md:flex w-9 h-9 lg:w-10 lg:h-10 rounded-lg items-center justify-center text-[#601935] font-bold text-base flex-shrink-0 bg-white">
            {avatarLetter}
          </div>
          {/* Course name */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
              {courseTitle}
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5 md:gap-2 lg:gap-1.5">
              <span className="text-xs font-semibold text-white">
                {section?.name ? `Section: ${section.name}` : "All Sections"}
              </span>
              <span className="inline-block w-fit px-2 py-0.5 bg-white text-[#601935] text-xs font-semibold rounded-full">
                Teacher
              </span>
            </div>
          </div>
          {/* calender div */}
          <button
            onClick={openCalendarModal}
            className="inline-flex items-center justify-center gap-2 w-9 h-9 md:w-9 md:h-9 lg:w-auto lg:h-11 lg:px-4 rounded-full lg:rounded-xl bg-white/10 md:bg-white/10 lg:bg-white hover:bg-white/20 lg:hover:bg-gray-50 text-white lg:text-[#1f3556] border border-white/20 lg:border-gray-200 transition flex-shrink-0"
            aria-label="Open calendar"
            title="Open Academic Calendar"
          >
            <svg
              className="w-4 h-4 text-white lg:text-[#6b1d3e]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 2v4M8 2v4M3 10h18"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden lg:inline text-sm font-medium leading-none">
              Calendar
            </span>
          </button>
          {/* Right icons */}
          {/* <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-1.5 rounded-lg hover:bg-blue-500 transition text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-1.5 rounded-lg hover:bg-blue-500 transition text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div> */}
        </div>

        {/* Tab Navigation (Teacher blue variant) */}
        <div className="flex border-t border-blue-500 overflow-x-auto bg-blue-50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-blue-100"
              }`}
            >
              {tab.label}
            </button>
          ))}

        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "general" ? (
        <CourseChatTab courseId={courseId} sectionId={sectionId} />
      ) : activeTab === "modules" ? (
        <CourseModulesTab
          courseId={courseId}
          sectionId={sectionId}
          semesterId={enrollment?.semester?.id || null}
        />
      ) : (
        <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
          {activeTab === "assignments" && (
            <TeacherAssignmentsTab courseId={courseId} sectionId={sectionId} />
          )}
          {activeTab === "materials" && (
            <TeacherMaterialsTab courseId={courseId} sectionId={sectionId} />
          )}
          {activeTab === 'grade' && (
            <TeacherGradePerformanceTab
              courseId={courseId}
              sectionId={sectionId}
              semesterId={enrollment?.semester?.id || null}
              teacher={enrollment?.teacher || null}
              course={course}
              section={section}
            />
          )}
        </div>
      )}
    </div>
  );
}
