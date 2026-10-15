
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router'

import AppLayout from './components/layout/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AnnouncementsPage from './pages/AnnouncementsPage.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import AssignmentsPage from './pages/AssignmentsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
