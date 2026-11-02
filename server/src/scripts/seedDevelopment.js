const env = require('../config/env')
const { connectDatabase, disconnectDatabase } = require('../config/database')

const Department = require('../models/Department')
const User = require('../models/User')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const FacultyCourse = require('../models/FacultyCourse')
const Enrollment = require('../models/Enrollment')
const TimetableEntry = require('../models/TimetableEntry')
const Assignment = require('../models/Assignment')
const AttendanceSession = require('../models/AttendanceSession')
const AttendanceRecord = require('../models/AttendanceRecord')
const Announcement = require('../models/Announcement')
const AnnouncementRead = require('../models/AnnouncementRead')
const Club = require('../models/Club')
const Event = require('../models/Event')

const SEED_ENABLED = process.env.ALLOW_DEMO_SEED === 'true'

const DEMO = {
  department: {
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: 'Computer Science and Engineering department.',
  },

  courses: [
    {
      name: 'Data Structures and Algorithms',
      code: 'DSA',
      description: 'Study of data structures, algorithms, and complexity analysis.',
      credits: 4,
      section: 'A',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      room: 'CSE-201',
      assignmentTitle: 'Implement Core Data Structures',
    },
    {
      name: 'Database Management Systems',
      code: 'DBMS',
      description: 'Relational data modeling, SQL, transactions, and database design.',
      credits: 4,
      section: 'A',
      dayOfWeek: 3,
      startTime: '10:00',
      endTime: '11:00',
      room: 'CSE-202',
      assignmentTitle: 'Design a Relational Database',
    },
    {
      name: 'Computer Networks',
      code: 'CN',
      description: 'Network architectures, protocols, routing, and transport services.',
      credits: 3,
      section: 'A',
      dayOfWeek: 5,
      startTime: '11:00',
      endTime: '12:00',
      room: 'CSE-203',
      assignmentTitle: 'Analyze a TCP/IP Network',
    },
  ],

  academicYear: process.env.SEED_ACADEMIC_YEAR || '2026-2027',
  semester: Number(process.env.SEED_SEMESTER || 5),

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
    coordinator: {
      name: 'Demo Coordinator',
      email: 'coordinator@campusconnect.test',
      role: 'coordinator',
      passwordVariable: 'SEED_COORDINATOR_PASSWORD',
    },
    student: {
      name: 'Demo Student',
      email: 'student@campusconnect.test',
      role: 'student',
      passwordVariable: 'SEED_STUDENT_PASSWORD',
    },
    secondStudent: {
      name: 'Demo Student Two',
      email: 'student2@campusconnect.test',
      role: 'student',
      passwordVariable: 'SEED_STUDENT_2_PASSWORD',
    },
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

  if (!Number.isInteger(DEMO.semester) || DEMO.semester < 1 || DEMO.semester > 8) {
    throw new Error('SEED_SEMESTER must be an integer between 1 and 8.')
  }

  if (!/^\d{4}-\d{4}$/.test(DEMO.academicYear)) {
    throw new Error('SEED_ACADEMIC_YEAR must use YYYY-YYYY format.')
  }

  const [startYear, endYear] = DEMO.academicYear.split('-').map(Number)
  if (endYear !== startYear + 1) {
    throw new Error('SEED_ACADEMIC_YEAR must contain consecutive years.')
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

    if (!existingUser.isActive) {
      throw new Error(
        `Existing account ${account.email} is inactive. Reactivate it manually before using the demo account.`,
      )
    }

    console.log(`Reusing existing ${account.role}: ${account.email}`)
    return existingUser
  }

  const password = process.env[account.passwordVariable]
  if (!password || password.length < 8) {
    throw new Error(
      `${account.passwordVariable} must be configured with at least 8 characters to create ${account.email}.`,
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

async function ensureByInsertOnly(Model, filter, document, label) {
  const result = await Model.findOneAndUpdate(
    filter,
    { $setOnInsert: document },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  )

  console.log(`${label} ready.`)
  return result
}

async function ensureDepartment() {
  return ensureByInsertOnly(
    Department,
    { code: DEMO.department.code },
    { ...DEMO.department, isActive: true },
    `Department ${DEMO.department.code}`,
  )
}

async function ensureCourse(departmentId, courseData) {
  return ensureByInsertOnly(
    Course,
    { departmentId, code: courseData.code },
    {
      name: courseData.name,
      code: courseData.code,
      description: courseData.description,
      credits: courseData.credits,
      departmentId,
      isActive: true,
    },
    `Course ${courseData.code}`,
  )
}

async function ensureCourseOffering(courseId, courseData) {
  return ensureByInsertOnly(
    CourseOffering,
    {
      courseId,
      academicYear: DEMO.academicYear,
      semester: DEMO.semester,
      section: courseData.section,
    },
    {
      courseId,
      academicYear: DEMO.academicYear,
      semester: DEMO.semester,
      section: courseData.section,
      isActive: true,
    },
    `Offering ${courseData.code}`,
  )
}

async function ensureFacultyAssignment(facultyId, courseOfferingId) {
  return ensureByInsertOnly(
    FacultyCourse,
    { facultyId, courseOfferingId, isActive: true },
    { facultyId, courseOfferingId, isActive: true },
    'Faculty-course assignment',
  )
}

async function ensureEnrollment(studentId, courseOfferingId) {
  const enrollment = await Enrollment.findOneAndUpdate(
    { studentId, courseOfferingId },
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
      setDefaultsOnInsert: true,
    },
  )

  if (enrollment.status !== 'enrolled') {
    console.warn(
      `Existing enrollment ${enrollment._id} is ${enrollment.status}; it was not changed.`,
    )
  } else {
    console.log('Student enrollment ready.')
  }

  return enrollment
}

async function ensureTimetableEntry(facultyId, courseOfferingId, courseData) {
  return ensureByInsertOnly(
    TimetableEntry,
    {
      facultyId,
      courseOfferingId,
      dayOfWeek: courseData.dayOfWeek,
      startTime: courseData.startTime,
      isActive: true,
    },
    {
      facultyId,
      courseOfferingId,
      dayOfWeek: courseData.dayOfWeek,
      startTime: courseData.startTime,
      endTime: courseData.endTime,
      room: courseData.room,
      mode: 'offline',
      isActive: true,
    },
    `Timetable entry ${courseData.code}`,
  )
}

async function ensureAssignment(facultyId, courseOfferingId, courseData) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)
  dueDate.setHours(23, 59, 0, 0)

  return ensureByInsertOnly(
    Assignment,
    {
      facultyId,
      courseOfferingId,
      title: courseData.assignmentTitle,
    },
    {
      facultyId,
      courseOfferingId,
      title: courseData.assignmentTitle,
      description: `Practice assignment for ${courseData.name}.`,
      instructions:
        'Complete the work independently, document your approach, and upload your solution before the due date.',
      dueDate,
      status: 'published',
      publishedAt: new Date(),
    },
    `Published assignment ${courseData.code}`,
  )
}

async function ensureAttendanceSession(facultyId, courseOfferingId, sessionDate, topic) {
  return ensureByInsertOnly(
    AttendanceSession,
    {
      facultyId,
      courseOfferingId,
      sessionDate,
      startTime: '09:00',
    },
    {
      facultyId,
      courseOfferingId,
      sessionDate,
      startTime: '09:00',
      endTime: '10:00',
      topic,
      notes: 'Seeded demonstration attendance session.',
      status: 'finalized',
      finalizedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000),
    },
    `Attendance session ${sessionDate.toISOString().slice(0, 10)}`,
  )
}

async function ensureAttendanceRecord(sessionId, studentId, enrollmentId, facultyId, status) {
  return ensureByInsertOnly(
    AttendanceRecord,
    { sessionId, studentId },
    {
      sessionId,
      studentId,
      enrollmentId,
      status,
      markedBy: facultyId,
      markedAt: new Date(),
    },
    `Attendance record ${status}`,
  )
}

async function ensureAnnouncement(authorId, departmentId, courseOfferingId, data) {
  return ensureByInsertOnly(
    Announcement,
    { authorId, title: data.title },
    {
      ...data,
      authorId,
      departmentId: data.scope === 'department' ? departmentId : null,
      courseOfferingId: data.scope === 'course' ? courseOfferingId : null,
      publishedAt: new Date(),
      expiresAt: null,
    },
    `Announcement "${data.title}"`,
  )
}

async function ensureAnnouncementRead(announcementId, studentId) {
  return ensureByInsertOnly(
    AnnouncementRead,
    { announcementId, studentId },
    { announcementId, studentId, readAt: new Date() },
    'Announcement read marker',
  )
}

async function ensureClub(coordinatorId, departmentId) {
  const filter = { slug: 'campus-tech-club' }
  const existing = await Club.findOne(filter)

  if (existing) {
    if (
      existing.departmentId.toString() !== departmentId.toString() ||
      existing.coordinatorId?.toString() !== coordinatorId.toString()
    ) {
      throw new Error(
        'The demo club slug already belongs to another department or coordinator. No club ownership was changed.',
      )
    }

    if (!existing.isActive) {
      throw new Error(
        'The existing demo club is inactive. Reactivate it manually before using the demo event workflow.',
      )
    }

    console.log('Campus Tech Club ready (existing club reused).')
    return existing
  }

  const club = await Club.create({
    name: 'Campus Tech Club',
    slug: 'campus-tech-club',
    description:
      'A student community for software development, engineering projects, and technical learning.',
    category: 'Technical',
    departmentId,
    coordinatorId,
    createdBy: coordinatorId,
    isActive: true,
  })

  console.log('Campus Tech Club created.')
  return club
}

async function ensureEvent(coordinatorId, departmentId, clubId) {
  const now = new Date()
  const startsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  startsAt.setHours(10, 0, 0, 0)
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000)
  const registrationOpensAt = new Date(now.getTime() - 60 * 60 * 1000)
  const registrationClosesAt = new Date(startsAt.getTime() - 60 * 60 * 1000)

  const filter = {
    createdBy: coordinatorId,
    title: 'Campus Tech Showcase',
  }
  const existing = await Event.findOne(filter)

  if (existing) {
    // Refresh only an unused demo event's schedule. Never rewrite an event
    // that already has registrations or has entered a terminal lifecycle state.
    if (
      existing.registeredCount === 0 &&
      ['draft', 'published'].includes(existing.status)
    ) {
      existing.startsAt = startsAt
      existing.endsAt = endsAt
      existing.registrationOpensAt = registrationOpensAt
      existing.registrationClosesAt = registrationClosesAt
      if (existing.status === 'draft') {
        existing.status = 'published'
        existing.publishedAt = now
      }
      await existing.save()
    }

    console.log('Campus Tech Showcase ready (existing event reused).')
    return existing
  }

  const event = await Event.create({
    title: 'Campus Tech Showcase',
    description:
      'A practical showcase where students present software projects, prototypes, and engineering ideas.',
    category: 'Technical',
    clubId,
    departmentId,
    createdBy: coordinatorId,
    startsAt,
    endsAt,
    venue: 'Innovation Lab',
    capacity: 100,
    registeredCount: 0,
    registrationOpensAt,
    registrationClosesAt,
    status: 'published',
    publishedAt: now,
  })

  console.log('Published event Campus Tech Showcase.')
  return event
}

async function seedDevelopmentData() {
  requireDevelopmentOptIn()
  await connectDatabase()

  try {
    const department = await ensureDepartment()

    const [admin, faculty, coordinator, student, secondStudent] =
      await Promise.all([
        ensureUser({ account: DEMO.accounts.admin }),
        ensureUser({ account: DEMO.accounts.faculty }),
        ensureUser({
          account: DEMO.accounts.coordinator,
          departmentId: department._id,
        }),
        ensureUser({
          account: DEMO.accounts.student,
          departmentId: department._id,
        }),
        ensureUser({
          account: DEMO.accounts.secondStudent,
          departmentId: department._id,
        }),
      ])

    const seededOfferings = []

    for (const courseData of DEMO.courses) {
      const course = await ensureCourse(department._id, courseData)
      const offering = await ensureCourseOffering(course._id, courseData)

      await ensureFacultyAssignment(faculty._id, offering._id)

      const [studentEnrollment, secondStudentEnrollment] = await Promise.all([
        ensureEnrollment(student._id, offering._id),
        ensureEnrollment(secondStudent._id, offering._id),
      ])

      await ensureTimetableEntry(faculty._id, offering._id, courseData)
      const assignment = await ensureAssignment(
        faculty._id,
        offering._id,
        courseData,
      )

      seededOfferings.push({
        courseData,
        course,
        offering,
        studentEnrollment,
        secondStudentEnrollment,
        assignment,
      })
    }

    // Seed two fixed historical sessions so repeated runs do not create a new
    // attendance session every day.
    const dsa = seededOfferings[0]
    const attendanceDates = [
      new Date('2026-10-26T00:00:00.000Z'),
      new Date('2026-10-28T00:00:00.000Z'),
    ]

    for (const [index, date] of attendanceDates.entries()) {
      const session = await ensureAttendanceSession(
        faculty._id,
        dsa.offering._id,
        date,
        index === 0 ? 'Arrays and linked lists' : 'Stacks and queues',
      )

      await Promise.all([
        ensureAttendanceRecord(
          session._id,
          student._id,
          dsa.studentEnrollment._id,
          faculty._id,
          index === 0 ? 'present' : 'late',
        ),
        ensureAttendanceRecord(
          session._id,
          secondStudent._id,
          dsa.secondStudentEnrollment._id,
          faculty._id,
          index === 0 ? 'absent' : 'present',
        ),
      ])
    }

    const institutionAnnouncement = await ensureAnnouncement(
      admin._id,
      department._id,
      null,
      {
        title: 'Welcome to CampusConnect',
        detail:
          'The CampusConnect demo environment is ready. Check your courses, timetable, assignments, attendance, and campus events.',
        category: 'Campus',
        scope: 'institution',
      },
    )

    await ensureAnnouncement(
      coordinator._id,
      department._id,
      null,
      {
        title: 'CSE Department Demo Notice',
        detail:
          'This department announcement demonstrates targeted notices for Computer Science and Engineering students.',
        category: 'Academic',
        scope: 'department',
      },
    )

    await ensureAnnouncement(
      faculty._id,
      department._id,
      seededOfferings[0].offering._id,
      {
        title: 'DSA Course Practice Update',
        detail:
          'Review the arrays, linked lists, stacks, and queues material before attempting the published practice assignment.',
        category: 'Course update',
        scope: 'course',
      },
    )

    await ensureAnnouncementRead(institutionAnnouncement._id, student._id)

    const club = await ensureClub(coordinator._id, department._id)
    const event = await ensureEvent(coordinator._id, department._id, club._id)

    console.log('\nDevelopment seed completed successfully.')
    console.log(`Department: ${department.code}`)
    console.log(
      `Academic term: ${DEMO.academicYear} / Semester ${DEMO.semester} / Section A`,
    )
    console.log(`Courses and offerings: ${seededOfferings.length}`)
    console.log(`Published assignments: ${seededOfferings.length}`)
    console.log('Attendance: 2 sessions for the DSA offering')
    console.log('Announcements: institution, department, and course scopes')
    console.log(`Club: ${club.name} (${club.slug})`)
    console.log(`Event: ${event.title} (${event.status})`)
    console.log('\nDemo accounts (passwords are supplied only through server/.env):')
    console.log(`Admin: ${admin.email}`)
    console.log(`Faculty: ${faculty.email}`)
    console.log(`Coordinator: ${coordinator.email}`)
    console.log(`Student: ${student.email}`)
    console.log(`Second student: ${secondStudent.email}`)
    console.log('\nNo existing user passwords or existing records were overwritten.')
  } finally {
    await disconnectDatabase()
  }
}

seedDevelopmentData().catch((error) => {
  console.error(`Development seed failed: ${error.name || 'Error'}`)
  console.error(error.message || 'An unexpected error occurred.')
  process.exitCode = 1
})
