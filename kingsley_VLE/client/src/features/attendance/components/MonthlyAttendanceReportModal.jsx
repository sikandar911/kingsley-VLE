import { useEffect, useState } from "react";
import { attendanceApi } from "../api/attendance.api";

const MonthlyAttendanceReportModal = ({
  isOpen,
  onClose,
  courseId,
  sectionId,
  courseName,
  sectionName,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch report data whenever month/year or course/section changes
  useEffect(() => {
    if (!isOpen || !courseId || !sectionId) {
      return;
    }
    fetchReport();
  }, [isOpen, currentMonth, currentYear, courseId, sectionId]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.getMonthlyReport(
        courseId,
        sectionId,
        currentMonth,
        currentYear
      );

      setReportData(response.data);
    } catch (err) {
      console.error("Error fetching monthly report:", err);
      setError(
        err.response?.data?.error || "Failed to fetch attendance report"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 1) {
        setCurrentYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 12) {
        setCurrentYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const getMonthName = (month) => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1];
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 85) return "bg-green-50 border-green-200";
    if (percentage >= 70) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const getAttendanceBadgeColor = (percentage) => {
    if (percentage >= 85) return "bg-green-100 text-green-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b1d3e] to-[#8b2d5e] text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              title="Previous month"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold">
                {getMonthName(currentMonth)} {currentYear}
              </h2>
              <p className="text-sm text-white text-opacity-90 mt-1">
                {courseName && sectionName && `${courseName} • ${sectionName}`}
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              title="Next month"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Overall Statistics */}
          {reportData && (
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                <div className="font-semibold">
                  {reportData.overallStatistics?.present || 0}
                </div>
                <div className="text-xs text-opacity-80">Present</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                <div className="font-semibold">
                  {reportData.overallStatistics?.absent || 0}
                </div>
                <div className="text-xs text-opacity-80">Absent</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                <div className="font-semibold">
                  {reportData.overallStatistics?.late || 0}
                </div>
                <div className="text-xs text-opacity-80">Late</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                <div className="font-semibold">
                  {reportData.overallStatistics?.excused || 0}
                </div>
                <div className="text-xs text-opacity-80">Excused</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 280px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block">
                  <div
                    style={{
                      display: "inline-block",
                      width: "40px",
                      height: "40px",
                      border: "3px solid #e5e7eb",
                      borderTop: "3px solid #6b1d3e",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
                <p className="text-gray-600 mt-4 font-medium">
                  Loading report...
                </p>
              </div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">⚠️ {error}</p>
            </div>
          ) : reportData && reportData.students && reportData.students.length > 0 ? (
            <div className="space-y-3">
              {reportData.students.map((student) => (
                <div
                  key={student.studentId}
                  className={`rounded-lg border-2 p-4 transition ${getAttendanceColor(
                    student.summary.attendancePercentage
                  )}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {student.fullName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Roll: {student.studentNumber}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getAttendanceBadgeColor(
                        student.summary.attendancePercentage
                      )}`}
                    >
                      {student.summary.attendancePercentage}%
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-green-700">
                        {student.summary.present}
                      </div>
                      <div className="text-xs text-gray-600">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-700">
                        {student.summary.absent}
                      </div>
                      <div className="text-xs text-gray-600">Absent</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-700">
                        {student.summary.late}
                      </div>
                      <div className="text-xs text-gray-600">Late</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-amber-700">
                        {student.summary.excused}
                      </div>
                      <div className="text-xs text-gray-600">Excused</div>
                    </div>
                    <div className="text-center border-l pl-2">
                      <div className="font-bold text-gray-900">
                        {student.summary.totalDays}
                      </div>
                      <div className="text-xs text-gray-600">Days</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No students in this section</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAttendanceReportModal;
