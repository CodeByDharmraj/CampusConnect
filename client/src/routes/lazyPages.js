import { lazy } from 'react'

// Every page is code-split: each one becomes its own chunk that is only
// downloaded the first time the user visits it. These must be rendered
// inside a <Suspense> boundary (see AppRoutes.jsx).

export const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'))
export const AssignmentsPage = lazy(() => import('../pages/AssignmentsPage.jsx'))
export const GradesPage = lazy(() => import('../pages/GradesPage.jsx'))
export const DepartmentManagementPage = lazy(() => import('../pages/DepartmentManagementPage.jsx'))
export const InstitutionalSettingsPage = lazy(() => import('../pages/InstitutionalSettingsPage.jsx'))
export const UserAccountsPage = lazy(() => import('../pages/UserAccountsPage.jsx'))
export const CourseCatalogPage = lazy(() => import('../pages/CourseCatalogPage.jsx'))
export const TimetableManagementPage = lazy(() => import('../pages/TimetableManagementPage.jsx'))
export const FacultyCourseMaterialsPage = lazy(() => import('../pages/FacultyCourseMaterialsPage.jsx'))
export const DashboardPage = lazy(() => import('../pages/DashboardPage'))
export const LoginFormPage = lazy(() => import('../pages/LoginFormPage'))
export const AnnouncementFormPage = lazy(() => import('../pages/AnnouncementFormPage'))
export const DesignSystemPage = lazy(() => import('../pages/DesignSystemPage.jsx'))
export const EnrollmentManagementPage = lazy(() => import('../pages/EnrollmentManagementPage.jsx'))
export const MyCoursesPage = lazy(() => import('../pages/MyCoursesPage'))
export const StudentCourseMaterialsPage = lazy(() => import('../pages/StudentCourseMaterialsPage.jsx'))
export const TimetablePage = lazy(() => import('../pages/TimetablePage.jsx'))
export const FacultyCourseManagementPage = lazy(() => import('../pages/FacultyCourseManagementPage.jsx'))
export const FacultyManagementPage = lazy(() => import('../pages/FacultyManagementPage.jsx'))
export const AssignmentManagementPage = lazy(() => import('../pages/AssignmentManagementPage.jsx'))
export const AttendancePage = lazy(() => import('../pages/AttendancePage.jsx'))
export const StudentSubmissionsPage = lazy(() => import('../pages/StudentSubmissionsPage.jsx'))
export const FacultySubmissionsPage = lazy(() => import('../pages/FacultySubmissionsPage.jsx'))
export const SubmissionOversightPage = lazy(() => import('../pages/SubmissionOversightPage'))
export const ClubDirectoryPage = lazy(() =>
  import('../pages/ClubDirectoryPage.jsx').then((module) => ({
    default: module.ClubDirectoryPage,
  })),
)
export const ClubDetailPage = lazy(() =>
  import('../pages/ClubDirectoryPage.jsx').then((module) => ({
    default: module.ClubDetailPage,
  })),
)
export const EventManagementPage = lazy(() => import('../pages/EventManagementPage.jsx'))
export const MyEventRegistrationsPage = lazy(() => import('../pages/MyEventRegistrationsPage.jsx'))
export const EventAttendancePage = lazy(() => import('../pages/EventAttendancePage.jsx'))
export const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'))
