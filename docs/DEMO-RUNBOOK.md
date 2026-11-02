# CampusConnect — Demo Runbook

## 1. Purpose

This runbook helps prepare a repeatable, safe demonstration of the CampusConnect MVP. Use a dedicated local development database and demo accounts. Do not demonstrate with production accounts or real student records.

## 2. What the demo should prove

A short demonstration should show how the portal connects the daily student experience with faculty and campus coordination:

1. A student signs in and sees a role-scoped dashboard.
2. The student opens courses, timetable, attendance, announcements, assignments, and campus events.
3. Faculty works with assigned offerings, publishes assignments/announcements, reviews submissions, and records attendance.
4. A coordinator manages department-scoped clubs and events.
5. An administrator manages privileged academic accounts and setup.
6. Access is enforced by the server, not only by hiding frontend navigation.

The strongest story is one continuous workflow: faculty publishes an assignment → student submits work → faculty evaluates it → student sees grade and feedback.

## 3. Pre-demo environment

### Required services

- MongoDB Atlas development database (or an isolated local MongoDB instance).
- Backend API running at `http://localhost:5000`.
- Frontend Vite server running at `http://localhost:5173`.
- Private object storage configured if demonstrating actual file upload/download.
- Four demo roles provisioned in the development database.

### Safety checklist

- [ ] Confirm `NODE_ENV=development`.
- [ ] Confirm the MongoDB URI points to a dedicated development database.
- [ ] Confirm `ALLOW_DEMO_SEED=true` only in the local development environment.
- [ ] Keep the seed passwords local; never paste them into slides, screenshots, Git, or the report.
- [ ] Do not use production credentials or production data.
- [ ] Ensure storage bucket credentials are development-only and the bucket remains private.
- [ ] Use synthetic demo records only.
- [ ] Close unrelated browser tabs and disable personal notifications before presenting.

## 4. Seed the demo environment

The Phase 57 seed is opt-in and idempotent. Follow the exact instructions in `PHASE-57-IMPLEMENTATION-NOTES.md` and the root README.

From the project root, after configuring `server/.env` for a development database:

```powershell
npm --prefix server run seed:development
```

The seed creates or reuses the demo CSE department, three course offerings (DSA, DBMS, CN), demo accounts for admin/faculty/coordinator/two students, assignments, attendance, announcements, a club, and a future event. It does not create fake uploaded files or submissions.

If an account already exists, the seed does not reset its password. Use the password you originally configured or provision a new local demo account through the approved admin workflow.

## 5. Start the application

Open two PowerShell terminals from the repository root.

Terminal 1 — backend:

```powershell
Set-Location D:\CampusConnect\server
npm run dev
```

Terminal 2 — frontend:

```powershell
Set-Location D:\CampusConnect\client
npm run dev
```

Open `http://localhost:5173`. For screenshot capture, install the browser once with `cd client; npx playwright install chromium`. Confirm the backend health endpoint at `http://localhost:5000/api/v1/health`. A healthy process response does not by itself prove database readiness; use `/api/v1/health/ready` for that check.

## 6. Suggested 7–9 minute walkthrough

| Time | Role | Action | What to explain |
|---|---|---|---|
| 0:00–0:45 | All | Introduce the dashboard and role-specific navigation | One portal, different permissions and views |
| 0:45–2:00 | Student | Dashboard → My Courses → Timetable → Attendance | Academic information is consolidated |
| 2:00–3:00 | Student | Announcements → Campus Events | Notices and campus activities are discoverable |
| 3:00–4:15 | Faculty | Assignment Management → publish a prepared assignment | Faculty scope is limited to assigned offerings |
| 4:15–5:15 | Student | Open Submissions → upload a prepared sample PDF | Submission is tied to the student and assignment |
| 5:15–6:15 | Faculty | Submissions → select submission → grade and feedback | Faculty evaluates submitted work |
| 6:15–6:45 | Student | Refresh Submissions | Student sees the saved grade and feedback |
| 6:45–7:45 | Coordinator | Clubs & Communities → Campus Events | Coordinator manages scoped campus activity |
| 7:45–8:30 | Admin | Faculty Management / Enrollment Management | Admin handles privileged academic setup |

The walkthrough is a suggested narrative, not a claim that every workflow is pre-populated in the seed. Create the assignment and upload a real sample PDF before the presentation if you want to show the complete grading loop.

## 7. Recommended live demo order

Prefer this order to minimize account switching:

1. Start on the student dashboard.
2. Show course, timetable, attendance, announcement, and event visibility.
3. Switch to faculty and show assignment management and the grading queue.
4. If prepared, create/publish a new assignment and submit a sample PDF as the student.
5. Return to faculty to grade and add feedback.
6. Return to student to confirm the evaluation.
7. Switch to coordinator and show club/event management.
8. Finish with admin account/faculty/enrollment management.
9. Close with the architecture and security model.

## 8. Backup plan

If live login or network access fails:

- Keep the local application already running before the session.
- Have reviewed screenshots captured using `docs/SCREENSHOT-CATALOGUE.md`.
- Use the presentation deck as the narrative fallback.
- Do not claim an upload, grade, event registration, or deployment succeeded unless the UI confirms it.
- Do not use screenshots from a different build or older feature state without labelling them.

## 9. Presentation and screenshot assets

- Presentation: `presentation/CampusConnect-Project-Presentation.pptx`
- Screenshot instructions and catalogue: `docs/SCREENSHOT-CATALOGUE.md`
- Technical docs: `docs/TECHNICAL-ARCHITECTURE.md`, `docs/DATABASE-ERD.md`, and `docs/API-REFERENCE.md`

Review generated screenshots and replace any empty/error-state images before using them in an academic submission.
