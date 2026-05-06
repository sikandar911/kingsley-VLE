import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Link } from "react-router-dom";
import { enrollmentsApi } from "../../../features/enrollments/api/enrollments.api";
import { assignmentsApi } from "../../../features/assignments/api/assignments.api";
import { classRecordsApi } from "../../../features/classRecords/api/classRecords.api";
import { eventsApi } from "../../../features/events/api/events.api";

export default function StudentDashboard() {
  const { user } = useAuth();
  const profile = user?.studentProfile;
  const name = profile?.fullName || user?.email;

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classRecordings, setClassRecordings] = useState([]);
  const [events, setEvents] = useState([]);
  const [courseMap, setCourseMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesRes, assignmentsRes, recordingsRes, eventsRes] =
          await Promise.all([
            enrollmentsApi.listByUser(user.id),
            assignmentsApi.list(),
            classRecordsApi.list(),
            eventsApi.list(),
          ]);

        // Handle courses/enrollments
        const coursesList = Array.isArray(coursesRes.data)
          ? coursesRes.data
          : [];
        setCourses(coursesList);

        // Build enrollment maps for filtering
        const enrolledCourseIds = new Set();
        const enrolledSectionIds = new Set();
        const courseMapping = {};

        coursesList.forEach((enrollment) => {
          if (enrollment.courseId) {
            enrolledCourseIds.add(enrollment.courseId);
            courseMapping[enrollment.courseId] =
              enrollment.course?.title || "Unknown Course";
          }
          if (enrollment.sectionId) {
            enrolledSectionIds.add(enrollment.sectionId);
          }
        });

        setCourseMap(courseMapping);

        // Filter and prepare assignments (exclude submitted ones)
        const assignmentsList = Array.isArray(assignmentsRes.data)
          ? assignmentsRes.data
          : [];

        // Fetch submissions for all assignments to filter out submitted ones
        const submittedAssignmentIds = new Set();
        try {
          await Promise.all(
            assignmentsList.map(async (assignment) => {
              try {
                const subRes = await assignmentsApi.getSubmissions(
                  assignment.id,
                );
                const submissions = Array.isArray(subRes.data)
                  ? subRes.data
                  : [];
                if (submissions.length > 0) {
                  submittedAssignmentIds.add(assignment.id);
                }
              } catch {
                // silently skip if a specific assignment's submissions fail
              }
            }),
          );
        } catch (err) {
          console.error("Error checking submissions:", err);
        }

        const filteredAssignments = assignmentsList.filter(
          (a) => !submittedAssignmentIds.has(a.id),
        );
        setAssignments(filteredAssignments);

        // Filter class recordings by enrollment - handle wrapped response
        let recordingsList = [];
        if (recordingsRes.data) {
          // Check if response is wrapped { records: [...], meta }
          recordingsList = Array.isArray(recordingsRes.data.records)
            ? recordingsRes.data.records
            : Array.isArray(recordingsRes.data)
              ? recordingsRes.data
              : [];
        }
        const filteredRecordings = recordingsList.filter((recording) => {
          if (recording.courseId && enrolledCourseIds.has(recording.courseId))
            return true;
          if (
            recording.sectionId &&
            enrolledSectionIds.has(recording.sectionId)
          )
            return true;
          return false;
        });
        setClassRecordings(filteredRecordings);

        // Filter events - institution type shown to all, course/section types filtered by enrollment
        let eventsList = Array.isArray(eventsRes.data) ? eventsRes.data : [];

        // Handle wrapped response structure (sometimes data is wrapped in { data: [...] })
        if (eventsList.length === 0 && eventsRes.data && eventsRes.data.data) {
          eventsList = eventsRes.data.data;
        }

        const filteredEvents = eventsList.filter((event) => {
          if (event.type === "institution") return true;
          if (
            event.type === "course" &&
            event.courseId &&
            enrolledCourseIds.has(event.courseId)
          )
            return true;
          if (
            event.type === "section" &&
            event.sectionId &&
            enrolledSectionIds.has(event.sectionId)
          )
            return true;
          return false;
        });

        setEvents(filteredEvents);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setCourses([]);
        setAssignments([]);
        setClassRecordings([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    // console.log("student events length", events);

    if (user) {
      fetchData();
    }
  }, [user]);

  const dashboardCards = [
    {
      title: "Courses",
      count: courses.length,
      icon: "/icon-courses.png",
      route: "/student/courses",
    },
    {
      title: "Assignments",
      count: assignments.length,
      icon: "/icon-assignment.png",
      route: "/student/courses",
    },
    {
      title: "Class Recordings",
      count: classRecordings.length,
      icon: "/icon-recording.png",
      route: "/student/courses",
    },
    {
      title: "Events",
      count: events.length,
      icon: "/icon-events.png",
      route: "/student/events",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-[30px] lg:text-[33px] font-bold text-gray-900">
            Hello <span style={{ color: "#6b1d3e" }}>{name},</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-2 md:mt-3">
            Welcome to your student portal
          </p>
        </div>

        {/* Quick Access Cards Section */}
        <div className="mb-6 md:mb-8">
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
                        <span className=" rounded-lg ">{card.count}</span>
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
            <div className=" md:mb-0">
              <p className="font-bold text-white text-sm text-[17.5px] sm:text-[19px] md:mb-2">
                Complete your profile
              </p>
              <p className="text-[14px] sm:text-sm text-gray-100 mt-1 sm:mt-0.5">
                Add your phone, address and other details to your profile.
              </p>
            </div>
            <Link
              to="/student/profile"
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
