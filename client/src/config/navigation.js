import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CalendarCheck,
  Megaphone,
  Users,
  GraduationCap,
  FileCheck,
  Building2,
  UserCog,
  Settings,
  ClipboardList,
} from 'lucide-react'

import { hasPermission, navigationPermissions } from './rolePermissions.js'

// Each item has its own navigation visibility policy.
export const navigation = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    permission: 'dashboard',
  },
  {
    label: 'My Courses',
    path: '/courses',
    icon: BookOpen,
    permission: 'courses',
  },
  {
    label: 'Timetable',
    path: '/timetable',
    icon: CalendarDays,
    permission: 'timetable',
  },
  {
    label: 'Assignments',
    path: '/assignments',
    icon: ClipboardCheck,
    permission: 'assignments',
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: CalendarCheck,
    permission: 'attendance',
  },
  {
    label: 'Announcements',
    path: '/announcements',
    icon: Megaphone,
    permission: 'announcements',
  },
  {
    label: 'Clubs & Communities',
    path: '/clubs-events',
    icon: Users,
    permission: 'clubsEvents',
  },
  {
    label: 'Campus Events',
    path: '/events',
    icon: CalendarDays,
    permission: 'clubsEvents',
  },
  {
    label: 'My Event Registrations',
    path: '/my-event-registrations',
    icon: CalendarCheck,
    permission: 'myEventRegistrations',
  },
  {
    label: 'Grades & Feedback',
    path: '/grades',
    icon: GraduationCap,
    permission: 'grades',
  },
  {
    label: 'Submissions',
    path: '/submissions',
    icon: FileCheck,
    permission: 'submissions',
  },
  {
    label: 'Faculty-Course Management',
    path: '/faculty-course-management',
    icon: Users,
    permission: 'facultyCourseManagement',
  },
  {
    label: 'Department Management',
    path: '/departments',
    icon: Building2,
    permission: 'departmentManagement',
  },
  {
    label: 'Faculty Management',
    path: '/faculty-management',
    icon: UserCog,
    permission: 'facultyManagement',
  },
  {
    label: 'Assignment Management',
    path: '/assignment-management',
    icon: ClipboardList,
    permission: 'assignmentManagement',
  },
  {
    label: 'Institutional Settings',
    path: '/institutional-settings',
    icon: Settings,
    permission: 'institutionalSettings',
  },
  {
    label: 'Enrollment Management',
    path: '/enrollments',
    icon: Users,
    permission: 'enrollmentManagement',
  },
  {
    label: 'Course Catalogue',
    path: '/course-catalog',
    icon: BookOpen,
    permission: 'courseCatalog',
  },
  {
    label: 'Timetable Management',
    path: '/timetable-management',
    icon: CalendarDays,
    permission: 'timetableManagement',
  },
  {
    label: 'User Accounts',
    path: '/user-accounts',
    icon: UserCog,
    permission: 'userAccounts',
  },
]

// The navigation items a given role is allowed to see.
export function getVisibleNavigation(role) {
  return navigation.filter((item) =>
    hasPermission(role, navigationPermissions[item.permission]),
  )
}
