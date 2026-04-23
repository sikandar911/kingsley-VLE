import { useAuth } from "../../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { enrollmentsApi } from "../../../features/enrollments/api/enrollments.api";
import { assignmentsApi } from "../../../features/assignments/api/assignments.api";
import { classRecordsApi } from "../../../features/classRecords/api/classRecords.api";
import { eventsApi } from "../../../features/events/api/events.api";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = user?.teacherProfile;
  const name = profile?.fullName || user?.email;

  const [counts, setCounts] = useState({
    courses: 0,
    assignments: 0,
    classRecords: 0,
    events: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);

        // Fetch teacher's courses using enrollments
        const enrollmentsRes = await enrollmentsApi.teachers.list();
        const enrollments = Array.isArray(enrollmentsRes.data)
          ? enrollmentsRes.data
          : enrollmentsRes.data?.data || [];

        // Filter to current teacher's courses
        const currentTeacherId = profile?.id;
        const teacherEnrollments = enrollments.filter(
          (enrollment) => enrollment.teacher?.id === currentTeacherId,
        );
        const teacherCourseIds = teacherEnrollments
          .map((enrollment) => enrollment.course?.id)
          .filter(Boolean);

        // Fetch all assignments and class records, then filter by teacher's courses
        const [assignmentsRes, allClassRecordsRes, eventsRes] =
          await Promise.all([
            assignmentsApi.list(),
            classRecordsApi.list(),
            eventsApi.list(),
          ]);

        // Extract data from responses
        const coursesList = teacherEnrollments;
        const assignmentsList = Array.isArray(assignmentsRes.data)
          ? assignmentsRes.data
          : assignmentsRes.data?.data || [];
        const allClassRecordsList = Array.isArray(allClassRecordsRes.data)
          ? allClassRecordsRes.data
          : allClassRecordsRes.data?.records || [];
        const eventsList = Array.isArray(eventsRes.data)
          ? eventsRes.data
          : eventsRes.data?.data || [];

        // Filter class records to only show records from teacher's courses
        const teacherClassRecords = allClassRecordsList.filter((record) =>
          teacherCourseIds.includes(record.courseId),
        );

        // Filter events - institution type shown to all, course type filtered by teacher's courses
        const teacherEvents = eventsList.filter((event) => {
          if (event.type === "institution") return true;
          if (
            event.type === "course" &&
            event.courseId &&
            teacherCourseIds.includes(event.courseId)
          )
            return true;
          return false;
        });

        // console.log("teacher events", teacherEvents);

        setCounts({
          courses: coursesList.length,
          assignments: assignmentsList.length,
          classRecords: teacherClassRecords.length,
          events: teacherEvents.length,
        });
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
        // Set default counts on error
        setCounts({
          courses: 0,
          assignments: 0,
          classRecords: 0,
          events: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id) {
      fetchCounts();
    }
  }, [profile?.id]);

  const dashboardCards = [
    {
      title: "Courses",
      count: counts.courses,
      icon: "/icon-courses.png",
      route: "/teacher/courses",
    },
    {
      title: "Assignments",
      count: counts.assignments,
      icon: "/icon-assignment.png",
      route: "/teacher/assignments",
    },
    {
      title: "Class Recordings",
      count: counts.classRecords,
      icon: "/icon-recording.png",
      route: "/teacher/class-records",
    },
    {
      title: "Events",
      count: counts.events,
      icon: "/icon-events.png",
      route: "/teacher/events",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-[30px] lg:text-[33px] font-bold text-gray-900">
            Hello <span className="text-brand-700">{name},</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 md:mt-3">
            Welcome to your teacher portal
          </p>
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3.5 mb-8 md:mb-12">
          {[
            {
              label: "Teacher ID",
              value: profile?.teacherId || "—",
              icon: "/teacher-id-icon.png",
            },
            {
              label: "Specialization",
              value: profile?.specialization || "—",
              icon: "/teacher-Specialization-icon.png",
            },
            // {
            //   label: "Experience",
            //   value: profile?.experienceYears
            //     ? `${profile.experienceYears} yrs`
            //     : "—",
            //   icon: "📅",
            // },
            {
              label: "Dept.",
              value: profile?.department || "—",
              icon: "/teacher-department-icon.png",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <img
                src={s.icon}
                alt={s.label}
                className="w-7 h-7 sm:w-9 lg:w-10 sm:h-9 lg:h-10 object-contain"
              />
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">{s.label}</p>
              <p className="font-semibold text-gray-900 text-xs sm:text-sm mt-0.5">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Dashboard Cards Section */}
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {dashboardCards.map((card) => (
              <Link
                key={card.title}
                to={card.route}
                className="group relative overflow-hidden rounded-lg sm:rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 transform hover:scale-105 active:scale-95
                  bg-white border-2 border-gray-100 shadow-md hover:shadow-xl hover:shadow-gray-200"
              >
                {/* Content */}
                <div className="relative gap-5 flex md:flex-col lg:flex-row xl:flex-col md:gap-0 lg:gap-6 xl:gap-0 z-10">
                  {/* Icon */}
                  <div className="w-16 sm:w-18 h-16 sm:h-18 mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* title,count,arrow */}
                  <div>
                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-1 sm:mb-2">
                      {card.title}
                    </h3>

                    {/* Count */}
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {loading ? (
                        <span className="inline-block w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-lg animate-pulse"></span>
                      ) : (
                        card.count
                      )}
                    </div>

                    {/* Hover Arrow */}
                    <div
                      className={`absolute bottom-4 sm:bottom-6 md:bottom-1 xl:bottom-[2px] right-4 sm:right-6 text-2xl opacity-20 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300`}
                    >
                      →
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div
                  style={{ backgroundColor: "#6b1d3e" }}
                  className={`absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 opacity-5 rounded-full -mr-10 -mt-10 group-hover:opacity-10 transition-opacity duration-300`}
                ></div>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Completion Alert */}
        {
          <div className="bg-gradient-to-r from-[#6b1d3e] to-[#8b2d52] border-2 border-[#6b1d3e] rounded-lg sm:rounded-xl p-4 sm:p-6 md:flex items-center justify-between gap-4 hover:shadow-lg transition-shadow">
            <div className="md:mb-0">
              <p className="font-bold text-white text-sm text-[17.5px] sm:text-[19px] md:mb-2">
                Complete your profile
              </p>
              <p className="text-[14px] sm:text-sm text-gray-100 mt-1 sm:mt-0.5">
                Add your bio, specialization and experience to your profile.
              </p>
            </div>
            <Link
              to="/teacher/profile"
              className="inline-block mt-4 md:mt-0 px-4 py-2.5 bg-white text-sm md:text-[15px] font-semibold rounded-lg hover:shadow-md transition-all whitespace-nowrap"
              style={{ color: "#6b1d3e" }}
            >
              Update Profile →
            </Link>
          </div>
        }
      </div>
    </div>
  );
}
