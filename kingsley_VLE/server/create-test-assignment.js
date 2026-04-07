import prisma from './src/config/prisma.js'

async function main() {
  // First, find any existing assignment to get a teacher ID
  const existingAssignment = await prisma.assignment.findFirst({
    select: { teacherId: true, createdBy: true },
  })

  if (!existingAssignment) {
    console.error('No existing assignments found to reference teacher')
    process.exit(1)
  }

  const courseId = 'd3c95a0c-693f-4e00-a7f0-0332399169d8'
  const sectionId = 'ecae628b-f191-4f09-907c-381351e67de8'
  const teacherId = existingAssignment.teacherId
  const createdBy = existingAssignment.createdBy

  const assignment = await prisma.assignment.create({
    data: {
      title: 'Test Assignment - AC Circuit Basics',
      description: 'Practice problems for AC circuit theory',
      courseId,
      sectionId,
      teacherId,
      createdBy,
      status: 'published',
      totalMarks: 30,
      targetType: 'section',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  })

  console.log('Created assignment:', JSON.stringify(assignment, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
