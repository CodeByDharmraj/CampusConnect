const env = require('../config/env')
const { connectDatabase, disconnectDatabase } = require('../config/database')

const Department = require('../models/Department')
const User = require('../models/User')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const FacultyCourse = require('../models/FacultyCourse')
const Enrollment = require('../models/Enrollment')
const TimetableEntry = require('../models/TimetableEntry')

const SEED_ENABLED = process.env.ALLOW_DEMO_SEED === 'true'

const DEMO = {
  department: {
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: 'Computer Science and Engineering department.',
  },

  course: {
    name: 'Data Structures and Algorithms',
    code: 'DSA',
    description:
      'Study of data structures, algorithms, and complexity analysis.',
    credits: 4,
  },

  offering: {
    academicYear: '2026-2027',
    semester: 5,
    section: 'A',
  },

  accounts: {
    admin: {
      name: 'CampusConnect Admin',
      email: 'admin@campusconnect.test',
      role: 'admin',
      passwordVariable: 'SEED_ADMIN_PASSWORD',
    },

    faculty: {
      name: 'Demo Faculty',
      email: 'faculty@campusconnect.test',
      role: 'faculty',
      passwordVariable: 'SEED_FACULTY_PASSWORD',
    },

    student: {
      name: 'Demo Student',
      email: 'student@campusconnect.test',
      role: 'student',
      passwordVariable: 'SEED_STUDENT_PASSWORD',
    },
  },

  timetable: {
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '09:00',
    room: 'CC-DEMO-01',
    mode: 'offline',
  },
}

function requireDevelopmentOptIn() {
  if (env.NODE_ENV !== 'development') {
    throw new Error('Development seeding is only allowed in development mode.')
  }

  if (!SEED_ENABLED) {
    throw new Error(
      'Set ALLOW_DEMO_SEED=true in server/.env to explicitly enable development seeding.',
    )
  }
}

async function ensureUser({ account, departmentId = undefined }) {
  const existingUser = await User.findOne({ email: account.email })

  if (existingUser) {
    if (existingUser.role !== account.role) {
      throw new Error(
        `Existing account ${account.email} has a different role. No changes were made.`,
      )
    }

    if (
      departmentId &&
      existingUser.departmentId?.toString() !== departmentId.toString()
    ) {
      throw new Error(
        `Existing account ${account.email} belongs to a different department. No changes were made.`,
      )
    }

    console.log(`Reusing existing ${account.role}: ${account.email}`)
    return existingUser
  }

  const password = process.env[account.passwordVariable]

  if (!password || password.length < 8) {
    throw new Error(
      `${account.passwordVariable} must be configured with at least 8 characters.`,
    )
  }

  const user = new User({
    name: account.name,
    email: account.email,
    role: account.role,
    isActive: true,
    ...(departmentId ? { departmentId } : {}),
  })

  await user.setPassword(password)
  await user.save()

  console.log(`Created ${account.role}: ${account.email}`)
  return user
}

async function ensureDepartment() {
  const department = await Department.findOneAndUpdate(
    { code: DEMO.department.code },
    {
      $setOnInsert: {
        ...DEMO.department,
        isActive: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  )

  console.log(`Department ready: ${department.code}`)
  return department
}

async function ensureCourse(departmentId) {
  const course = await Course.findOneAndUpdate(
    {
      departmentId,
      code: DEMO.course.code,
    },
    {
      $setOnInsert: {
        ...DEMO.course,
        departmentId,
        isActive: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  )

  console.log(`Course ready: ${course.code}`)
  return course
}

async function ensureCourseOffering(courseId) {
  const offering = await CourseOffering.findOneAndUpdate(
    {
      courseId,
      ...DEMO.offering,
    },
    {
      $setOnInsert: {
        courseId,
        ...DEMO.offering,
        isActive: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  )

  console.log(
    `Course offering ready: ${offering.academicYear}, Semester ${offering.semester}, Section ${offering.section}`,
  )

  return offering
}

async function ensureFacultyAssignment(facultyId, courseOfferingId) {
  const assignment = await FacultyCourse.findOneAndUpdate(
    {
      facultyId,
      courseOfferingId,
      isActive: true,
    },
    {
      $setOnInsert: {
        facultyId,
        courseOfferingId,
        isActive: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  )

  console.log('Faculty-course assignment ready.')
  return assignment
}

async function ensureEnrollment(studentId, courseOfferingId) {
  const enrollment = await Enrollment.findOneAndUpdate(
    {
      studentId,
      courseOfferingId,
    },
    {
      $setOnInsert: {
        studentId,
        courseOfferingId,
        status: 'enrolled',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  )

  console.log(`Student enrollment ready: ${enrollment.status}`)
  return enrollment
}

async function ensureTimetableEntry(facultyId, courseOfferingId) {
  const timetable = await TimetableEntry.findOneAndUpdate(
    {
      facultyId,
      courseOfferingId,
      ...DEMO.timetable,
      isActive: true,
    },
    {
      $setOnInsert: {
        facultyId,
        courseOfferingId,
        ...DEMO.timetable,
        isActive: true,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    },
  )

  console.log('Demo timetable entry ready.')
  return timetable
}

async function seedDevelopmentData() {
  requireDevelopmentOptIn()

  await connectDatabase()

  try {
    const department = await ensureDepartment()

    const [admin, faculty, student] = await Promise.all([
      ensureUser({
        account: DEMO.accounts.admin,
      }),

      ensureUser({
        account: DEMO.accounts.faculty,
      }),

      ensureUser({
        account: DEMO.accounts.student,
        departmentId: department._id,
      }),
    ])

    const course = await ensureCourse(department._id)

    const offering = await ensureCourseOffering(course._id)

    await ensureFacultyAssignment(faculty._id, offering._id)

    await ensureEnrollment(student._id, offering._id)

    await ensureTimetableEntry(faculty._id, offering._id)

    console.log('\nDevelopment seed completed successfully.')
    console.log(`Department: ${department.code}`)
    console.log(`Course: ${course.code}`)
    console.log(
      `Offering: ${offering.academicYear} / Semester ${offering.semester} / Section ${offering.section}`,
    )
    console.log(`Admin: ${admin.email}`)
    console.log(`Faculty: ${faculty.email}`)
    console.log(`Student: ${student.email}`)
  } finally {
    await disconnectDatabase()
  }
}

seedDevelopmentData().catch((error) => {
  console.error(`Development seed failed: ${error.name || 'Error'}`)
  console.error(error.message || 'An unexpected error occurred.')
  process.exitCode = 1
})
