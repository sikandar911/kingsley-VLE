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
    ],
  },
  apis: ['./src/features/**/*.controller.js'],
}

export default swaggerJsdoc(options)
