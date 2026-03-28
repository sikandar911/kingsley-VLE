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
