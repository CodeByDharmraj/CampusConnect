# Phase 59 — Screenshot Capture Catalogue

The repository does not include fabricated application screenshots. Capture real screenshots from a running local application using the Playwright helper added in this phase.

## Capture command

Run the frontend and backend against a dedicated development database with the Phase 57 demo data. From the `client/` directory:

```powershell
$env:DEMO_BASE_URL = "http://127.0.0.1:5173"
$env:DEMO_STUDENT_EMAIL = "student@campusconnect.test"
$env:DEMO_STUDENT_PASSWORD = "<your-local-demo-student-password>"
$env:DEMO_FACULTY_EMAIL = "faculty@campusconnect.test"
$env:DEMO_FACULTY_PASSWORD = "<your-local-demo-faculty-password>"
$env:DEMO_COORDINATOR_EMAIL = "coordinator@campusconnect.test"
$env:DEMO_COORDINATOR_PASSWORD = "<your-local-demo-coordinator-password>"
$env:DEMO_ADMIN_EMAIL = "admin@campusconnect.test"
$env:DEMO_ADMIN_PASSWORD = "<your-local-demo-admin-password>"

npm run demo:screenshots
```

Install the Playwright Chromium browser once if it is not already present:

```powershell
npx playwright install chromium
```

Only configure the role accounts you want to capture. Each configured role requires both its email and password. The helper writes PNG files to `artifacts/screenshots/` at the repository root by default. Override the output with `DEMO_SCREENSHOT_DIR` if needed.

## Planned screenshot set

| File pattern | Page / purpose |
|---|---|
| `student-dashboard.png` | Student overview and academic summary |
| `student-courses.png` | Student course access |
| `student-attendance.png` | Attendance view |
| `student-announcements.png` | Targeted announcements |
| `student-events.png` | Campus event discovery |
| `student-submissions.png` | Assignment submission status |
| `student-dashboard-mobile.png` | Responsive dashboard at 390 × 844 |
| `faculty-assignment-management.png` | Faculty assignment workflow |
| `faculty-submissions-review.png` | Faculty grading queue |
| `faculty-attendance.png` | Faculty attendance workflow |
| `coordinator-clubs.png` | Club directory/management |
| `coordinator-events.png` | Event management |
| `coordinator-enrollments.png` | Enrollment management |
| `admin-faculty-management.png` | Faculty account management |
| `admin-enrollments.png` | Institution academic administration |

Some pages may be unavailable to a role or have no seeded records. The helper records such failures rather than pretending a screenshot exists. Review every generated image before placing it in a report or presentation. Never publish screenshots containing real student personal data, tokens, email addresses, or confidential academic records.

## Screenshot quality checklist

- Use the same browser zoom and light/dark theme for comparable desktop screenshots.
- Prefer a clean 1440 × 1000 desktop viewport; the mobile sample is 390 × 844.
- Ensure the page has finished loading and no error banner is visible.
- Keep demo content realistic, short, and free of real personal information.
- Crop only when needed; do not edit screenshots to hide a functional failure.
- Use descriptive captions such as “Student dashboard — course and academic overview”.
