export const studentDashboardData = {
  greeting: 'Your campus, connected.',
  description:
    'A clear overview of your courses, academic progress, and campus updates.',
  stats: [
    { label: 'Enrolled courses', value: '5', note: 'Sample preview data' },
    { label: 'Attendance', value: '92%', note: 'Illustrative summary' },
    { label: 'Due soon', value: '3', note: 'Upcoming assignments' },
    { label: 'New notices', value: '2', note: 'Sample announcements' },
  ],
  courses: [
    { code: 'CSE301', name: 'Database Management Systems', progress: 86 },
    { code: 'CSE302', name: 'Computer Networks', progress: 92 },
    { code: 'CSE303', name: 'Theory of Computation', progress: 78 },
  ],
  assignments: [
    {
      id: 'student-assignment-1',
      title: 'Database normalization worksheet',
      course: 'Database Management Systems',
      due: 'Tomorrow, 11:59 PM',
      status: 'Due soon',
    },
    {
      id: 'student-assignment-2',
      title: 'Subnetting practice',
      course: 'Computer Networks',
      due: 'Friday, 5:00 PM',
      status: 'In progress',
    },
    {
      id: 'student-assignment-3',
      title: 'Finite automata exercises',
      course: 'Theory of Computation',
      due: 'Monday, 11:59 PM',
      status: 'Not started',
    },
  ],
  announcements: [
    {
      id: 'student-notice-1',
      category: 'Academic',
      title: 'Review the upcoming assessment schedule',
      detail: 'Check your course pages for assessment instructions.',
      date: 'Sample notice',
    },
    {
      id: 'student-notice-2',
      category: 'Campus',
      title: 'Student activities and club updates',
      detail: 'Explore the clubs and events section for campus activities.',
      date: 'Sample notice',
    },
  ],
}

export const facultyDashboardData = {
  greeting: 'Your teaching workspace.',
  description: 'A focused overview of assigned courses and academic tasks.',
  stats: [
    { label: 'Assigned courses', value: '4', note: 'Sample preview data' },
    { label: 'Students', value: '126', note: 'Illustrative total' },
    { label: 'Attendance tasks', value: '2', note: 'Sample pending tasks' },
    { label: 'Announcements', value: '3', note: 'Sample course notices' },
  ],
  courses: [
    { code: 'CSE301', name: 'Database Management Systems', progress: 86 },
    { code: 'CSE302', name: 'Computer Networks', progress: 92 },
    { code: 'CSE305', name: 'Operating Systems', progress: 81 },
  ],
  assignments: [
    {
      id: 'faculty-task-1',
      title: 'Review database worksheet submissions',
      course: 'Database Management Systems',
      due: 'Sample task',
      status: 'Needs review',
    },
    {
      id: 'faculty-task-2',
      title: 'Prepare the next class activity',
      course: 'Computer Networks',
      due: 'Upcoming',
      status: 'In progress',
    },
  ],
  announcements: [
    {
      id: 'faculty-notice-1',
      category: 'Course update',
      title: 'Share assessment instructions with assigned students',
      detail: 'This preview represents a course-scoped announcement workflow.',
      date: 'Sample notice',
    },
    {
      id: 'faculty-notice-2',
      category: 'Teaching',
      title: 'Prepare resources for the next class',
      detail: 'Use the course workspace to organize academic resources.',
      date: 'Sample notice',
    },
  ],
}
