import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kingsley VLE API',
      version: '1.0.0',
      description: 'API documentation for Kingsley Virtual Learning Environment',
    },
    servers: [{ url: 'http://localhost:5000', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation successful' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
          },
        },
        StudentProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            studentId: { type: 'string', example: 'STU-001' },
            fullName: { type: 'string', example: 'John Doe' },
            profileImage: { type: 'string', nullable: true },
            admissionStatus: { type: 'string', nullable: true },
            dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
            bio: { type: 'string', nullable: true },
            bloodGroup: { type: 'string', nullable: true },
            educationBackground: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TeacherProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            teacherId: { type: 'string', example: 'TCH-001' },
            fullName: { type: 'string', example: 'Jane Smith' },
            profileImage: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            specialization: { type: 'string', nullable: true },
            experienceYears: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'teacher', 'student'] },
            isActive: { type: 'boolean' },
            createdBy: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            studentProfile: { $ref: '#/components/schemas/StudentProfile', nullable: true },
            teacherProfile: { $ref: '#/components/schemas/TeacherProfile', nullable: true },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        AdminStats: {
          type: 'object',
          properties: {
            totalStudents: { type: 'integer', example: 120 },
            totalTeachers: { type: 'integer', example: 15 },
            totalCourses: { type: 'integer', example: 30 },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: '2025-2026 Academic Year' },
            description: { type: 'string', nullable: true },
            startDate: { type: 'string', format: 'date-time', nullable: true },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            semesters: {
              type: 'array',
              items: { $ref: '#/components/schemas/Semester' },
            },
          },
        },
        Semester: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Fall' },
            sessionId: { type: 'string' },
            monthsIncluded: { type: 'string', nullable: true, example: 'September, October, November' },
            year: { type: 'integer', nullable: true, example: 2025 },
            session: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Introduction to Mathematics' },
            description: { type: 'string', nullable: true },
            semesterId: { type: 'string', nullable: true },
            totalSectionCount: { type: 'integer' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            semester: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                year: { type: 'integer', nullable: true },
              },
            },
          },
        },
        CourseListResponse: {
          type: 'object',
          properties: {
            courses: {
              type: 'array',
              items: { $ref: '#/components/schemas/Course' },
            },
            total: { type: 'integer', example: 50 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
          },
        },
        Section: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Section A' },
            courseId: { type: 'string' },
            semesterId: { type: 'string', nullable: true },
            assignedTeacherId: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            totalStudentCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            course: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
            semester: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'string' }, name: { type: 'string' }, year: { type: 'integer', nullable: true } },
            },
            assignedTeacher: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'string' }, fullName: { type: 'string' }, teacherId: { type: 'string' } },
            },
          },
        },
        Enrollment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            studentId: { type: 'string' },
            courseId: { type: 'string' },
            sectionId: { type: 'string', nullable: true },
            semesterId: { type: 'string', nullable: true },
            enrolledAt: { type: 'string', format: 'date-time' },
            student: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                studentId: { type: 'string' },
                fullName: { type: 'string' },
              },
            },
            course: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
            section: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
            semester: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'string' }, name: { type: 'string' }, year: { type: 'integer', nullable: true } },
            },
          },
        },
        TeacherCourse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            teacherId: { type: 'string' },
            courseId: { type: 'string' },
            assignedAt: { type: 'string', format: 'date-time' },
            teacher: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                teacherId: { type: 'string' },
                fullName: { type: 'string' },
                specialization: { type: 'string', nullable: true },
              },
            },
            course: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
          },
        },
        AttendanceRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            studentId: { type: 'string' },
            sectionId: { type: 'string' },
            semesterId: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] },
            student: {
              type: 'object',
              properties: { id: { type: 'string' }, studentId: { type: 'string' }, fullName: { type: 'string' } },
            },
            section: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
            semester: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' }, year: { type: 'integer', nullable: true } },
            },
          },
        },
        AttendanceListResponse: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: { $ref: '#/components/schemas/AttendanceRecord' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        BulkAttendanceResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '30 attendance records saved' },
            date: { type: 'string', format: 'date-time' },
            sectionId: { type: 'string' },
          },
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'lecture1.pdf' },
            slug: { type: 'string' },
            fileUrl: { type: 'string', format: 'uri' },
            fileType: { type: 'string', enum: ['assignment', 'class_material', 'class_record'], nullable: true },
            uploadedBy: { type: 'string' },
            uploadedAt: { type: 'string', format: 'date-time' },
            uploadedByUser: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } },
            },
          },
        },
        FileListResponse: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: { $ref: '#/components/schemas/File' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        ClassMaterial: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Week 1 Notes' },
            description: { type: 'string', nullable: true },
            fileId: { type: 'string' },
            courseId: { type: 'string' },
            sectionId: { type: 'string', nullable: true },
            semesterId: { type: 'string', nullable: true },
            uploadedBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            file: { $ref: '#/components/schemas/File' },
            course: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
          },
        },
        ClassMaterialListResponse: {
          type: 'object',
          properties: {
            materials: {
              type: 'array',
              items: { $ref: '#/components/schemas/ClassMaterial' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        ClassRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Lecture Recording - Week 1' },
            description: { type: 'string', nullable: true },
            url: { type: 'string', format: 'uri' },
            courseId: { type: 'string' },
            sectionId: { type: 'string', nullable: true },
            semesterId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            course: {
              type: 'object',
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
          },
        },
        ClassRecordListResponse: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: { $ref: '#/components/schemas/ClassRecord' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        RubricCriteria: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assignmentId: { type: 'string' },
            criteria: { type: 'string', example: 'Code Quality' },
            maxMarks: { type: 'integer', example: 20 },
          },
        },
        Assignment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Assignment 1' },
            description: { type: 'string', nullable: true },
            teacherInstruction: { type: 'string', nullable: true },
            teacherId: { type: 'string' },
            courseId: { type: 'string' },
            sectionId: { type: 'string', nullable: true },
            semesterId: { type: 'string', nullable: true },
            totalMarks: { type: 'integer', example: 100 },
            passingMarks: { type: 'integer', nullable: true },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            allowLateSubmission: { type: 'boolean' },
            status: { type: 'string', enum: ['draft', 'published', 'closed'] },
            targetType: { type: 'string', enum: ['section', 'individual'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            course: { $ref: '#/components/schemas/Course' },
            rubrics: {
              type: 'array',
              items: { $ref: '#/components/schemas/RubricCriteria' },
            },
            assignmentFiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  file: { $ref: '#/components/schemas/File' },
                },
              },
            },
          },
        },
        Submission: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assignmentId: { type: 'string' },
            studentId: { type: 'string' },
            submissionText: { type: 'string', nullable: true },
            submissionFileId: { type: 'string', nullable: true },
            submissionFileUrl: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['submitted', 'late', 'missing'] },
            attemptNumber: { type: 'integer' },
            marks: { type: 'integer', nullable: true },
            gradeLetter: { type: 'string', nullable: true },
            feedback: { type: 'string', nullable: true },
            markedBy: { type: 'string', nullable: true },
            markedAt: { type: 'string', format: 'date-time', nullable: true },
            submittedAt: { type: 'string', format: 'date-time' },
            student: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                studentId: { type: 'string' },
                fullName: { type: 'string' },
              },
            },
          },
        },
        AssignmentMetaResponse: {
          type: 'object',
          properties: {
            courses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  semesterId: { type: 'string', nullable: true },
                  semester: {
                    type: 'object',
                    nullable: true,
                    properties: { id: { type: 'string' }, name: { type: 'string' }, year: { type: 'integer', nullable: true } },
                  },
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { id: { type: 'string' }, name: { type: 'string' } },
                    },
                  },
                },
              },
            },
            teachers: {
              type: 'array',
              description: 'Only returned for admin users',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  teacherId: { type: 'string' },
                  fullName: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: { email: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Admin', description: 'Admin management endpoints' },
      { name: 'Assignments', description: 'Assignment lifecycle, submissions, and grading endpoints' },
      { name: 'Users', description: 'User profile endpoints' },
      { name: 'Courses', description: 'Course management' },
      { name: 'Sections', description: 'Section management (requires a course)' },
      { name: 'Academic', description: 'Sessions and Semesters management' },
      { name: 'Enrollments', description: 'Student enrollment and teacher-course assignment management' },
      { name: 'Files', description: 'File upload and management via Azure Blob Storage' },
      { name: 'Attendance', description: 'Student attendance tracking per section/semester' },
      { name: 'ClassMaterials', description: 'Class learning materials linked to uploaded files' },
      { name: 'ClassRecords', description: 'Class recordings and resource links (URL-based)' },
    ],
  },
  apis: ['./src/features/**/*.controller.js'],
}

export default swaggerJsdoc(options)
