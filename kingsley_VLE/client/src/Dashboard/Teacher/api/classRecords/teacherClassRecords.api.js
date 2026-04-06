import { authApi } from "../../../../Auth/api/auth.api";
import { enrollmentsApi } from "../../../../features/enrollments/api/enrollments.api";

export const teacherClassRecordsApi = {
  /**
   * Get teacher's assigned courses
   * Fetches from /api/auth/me and /api/enrollments/teachers
   * Returns only courses assigned to the logged-in teacher
   */
  getTeacherCourses: async () => {
    try {
      // Get logged-in teacher data
      const teacherRes = await authApi.getMe();
      const teacher = teacherRes.data;

      // Get all teacher enrollments
      const enrollmentsRes = await enrollmentsApi.teachers.list();
      const enrollments = enrollmentsRes.data || [];

      // Filter enrollments for current teacher
      const teacherEnrollments = enrollments.filter(
        (enrollment) =>
          enrollment.teacher?.id === teacher.teacherProfile?.id ||
          enrollment.teacherId === teacher.id,
      );

      // Extract course data
      const courses = teacherEnrollments.map((enrollment) => ({
        id: enrollment.course?.id,
        courseId: enrollment.course?.id,
        title: enrollment.course?.title,
        name: enrollment.course?.title,
        course: enrollment.course,
      }));

      console.log("Teacher:", teacher);
      console.log("Teacher Enrollments:", teacherEnrollments);
      console.log("Teacher Courses:", courses);

      return {
        teacher,
        courses,
        enrollments: teacherEnrollments,
      };
    } catch (err) {
      console.error("Error fetching teacher courses:", err);
      throw err;
    }
  },

  /**
   * Get teacher data
   */
  getTeacher: async () => {
    try {
      const res = await authApi.getMe();
      return res.data;
    } catch (err) {
      console.error("Error fetching teacher data:", err);
      throw err;
    }
  },

  /**
   * Get teacher's course enrollments
   */
  getEnrollments: async () => {
    try {
      const res = await enrollmentsApi.teachers.list();
      return res.data || [];
    } catch (err) {
      console.error("Error fetching enrollments:", err);
      throw err;
    }
  },
};
