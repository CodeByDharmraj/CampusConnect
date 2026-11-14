import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import NotFoundPage from '../components/common/NotFoundPage.jsx'
import PageLoadingFallback from '../components/common/PageLoadingFallback.jsx'
import { navigationPermissions } from '../config/rolePermissions.js'
import { useAuth } from '../context/useAuth.js'
import {
  AssignmentsPage,
  GradesPage,
  DepartmentManagementPage,
  InstitutionalSettingsPage,
  UserAccountsPage,
  CourseCatalogPage,
  TimetableManagementPage,
  FacultyCourseMaterialsPage,
  DashboardPage,
  LoginFormPage,
  AnnouncementFormPage,
  DesignSystemPage,
  EnrollmentManagementPage,
  MyCoursesPage,
  StudentCourseMaterialsPage,
  TimetablePage,
  FacultyCourseManagementPage,
  FacultyManagementPage,
  AssignmentManagementPage,
  AttendancePage,
  StudentSubmissionsPage,
  FacultySubmissionsPage,
  SubmissionOversightPage,
  ClubDirectoryPage,
  ClubDetailPage,
  EventManagementPage,
  MyEventRegistrationsPage,
  EventAttendancePage,
  ProfilePage,
} from './lazyPages.js'
import ProtectedRoute from './ProtectedRoute.jsx'
import PublicRoute from './PublicRoute.jsx'

// The complete route table for the application.
// Lazy pages are code-split, so <Routes> lives inside a <Suspense> boundary.
export default function AppRoutes() {
  // The /submissions route renders a different page per role.
  const { user } = useAuth()

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginFormPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={['student', 'faculty']} />
            }
          >
            <Route path="/courses" element={<MyCoursesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route
              path="/courses/:courseOfferingId/materials"
              element={<StudentCourseMaterialsPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={navigationPermissions.timetable}
              />
            }
          >
            <Route path="/timetable" element={<TimetablePage />} />
          </Route>

          {import.meta.env.DEV && (
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/design-system" element={<DesignSystemPage />} />
            </Route>
          )}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={navigationPermissions.facultyCourseManagement}
              />
            }
          >
            <Route
              path="/faculty-course-management"
              element={<FacultyCourseManagementPage />}
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route
              path="/enrollments"
              element={<EnrollmentManagementPage />}
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route
              path="/faculty-management"
              element={<FacultyManagementPage />}
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route
              path="/assignment-management"
              element={<AssignmentManagementPage />}
            />
          </Route>

          <Route path="/announcements" element={<AnnouncementFormPage />} />

          <Route
            element={
              <ProtectedRoute
                allowedRoles={navigationPermissions.attendance}
              />
            }
          >
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>
          <Route
            element={
              <ProtectedRoute
                allowedRoles={navigationPermissions.submissions}
              />
            }
          >
            <Route
              path="/submissions"
              element={
                user?.role === 'student' ? (
                  <StudentSubmissionsPage />
                ) : user?.role === 'faculty' ? (
                  <FacultySubmissionsPage />
                ) : (
                  <SubmissionOversightPage />
                )
              }
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.assignments} />}>
            <Route path="/assignments" element={<AssignmentsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.grades} />}>
            <Route path="/grades" element={<GradesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.departmentManagement} />}>
            <Route path="/departments" element={<DepartmentManagementPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.institutionalSettings} />}>
            <Route path="/institutional-settings" element={<InstitutionalSettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.userAccounts} />}>
            <Route path="/user-accounts" element={<UserAccountsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.courseCatalog} />}>
            <Route path="/course-catalog" element={<CourseCatalogPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={navigationPermissions.timetableManagement} />}>
            <Route path="/timetable-management" element={<TimetableManagementPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route
              path="/courses/:courseOfferingId/manage-materials"
              element={<FacultyCourseMaterialsPage />}
            />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={navigationPermissions.clubsEvents}
              />
            }
          >

            <Route path="/clubs-events" element={<ClubDirectoryPage />} />
            <Route path="/clubs-events/:slug" element={<ClubDetailPage />} />
            <Route path="/events" element={<EventManagementPage />} />
            <Route element={<ProtectedRoute allowedRoles={['coordinator', 'admin']} />} >
              <Route path="/events/:eventId/attendance" element={<EventAttendancePage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['student']} />} >
              <Route path="/my-event-registrations" element={<MyEventRegistrationsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
