# CampusConnect — API Reference

## 1. Base URL and conventions

All application routes are mounted below `/api/v1`.

```text
Local API: http://localhost:5000/api/v1
Production API: use the deployed API origin configured for the client
```

- JSON requests use `Content-Type: application/json`, except the storage upload operation which uploads directly to the URL returned by the API.
- Protected routes require `Authorization: Bearer <accessToken>`.
- Refresh-token operations use the HttpOnly refresh cookie; browser requests must include credentials.
- Successful responses generally use `{ "success": true, "data": ... }`. Mutations may also include `message`.
- Path identifiers are MongoDB ObjectIds unless the route explicitly uses a slug.
- The server's validation modules and service methods define exact field names, limits, and workflow rules. This reference is a route catalogue, not a substitute for those source contracts.

## 2. Authentication and account management

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/login` | Public + trusted origin + rate limit | Authenticate credentials; returns user/access token and sets refresh cookie |
| POST | `/auth/refresh` | Refresh cookie + trusted origin + rate limit | Rotate/refresh session and return a new access token |
| POST | `/auth/logout` | Refresh cookie + trusted origin | Revoke refresh session and clear cookie |
| GET | `/auth/me` | Authenticated | Return current user |
| POST | `/auth/register` | Admin | Provision an account; this is not public self-registration |
| GET | `/auth/faculty` | Admin | List faculty accounts |

## 3. Dashboard

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/dashboard/summary` | Authenticated; summary is role-scoped | Retrieve dashboard aggregates for the current user |

## 4. Departments, courses, offerings, and enrollment

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/departments` | Admin, coordinator | List departments in permitted scope |
| POST | `/departments` | Admin | Create a department |
| GET | `/courses` | Authenticated; service-scoped | List visible courses |
| GET | `/courses/my` | Student, faculty | List the current user's course context |
| GET | `/courses/:courseId` | Admin, coordinator | Read a course |
| POST | `/courses` | Admin, coordinator | Create a course |
| PATCH | `/courses/:courseId` | Admin, coordinator | Update a course |
| PATCH | `/courses/:courseId/deactivate` | Admin, coordinator | Deactivate a course |
| GET | `/course-offerings/options` | Admin, coordinator | Retrieve offering options for management forms |
| POST | `/course-offerings` | Admin, coordinator | Create a course offering |
| POST | `/course-offerings/:offeringId/faculty` | Admin, coordinator | Assign faculty to an offering |
| GET | `/course-offerings/:offeringId/faculty` | Admin, coordinator, faculty | List assigned faculty |
| DELETE | `/course-offerings/:offeringId/faculty/:facultyId` | Admin, coordinator | Remove a faculty assignment |
| GET | `/enrollments/options` | Authenticated; service-scoped | Retrieve enrollment options |
| GET | `/enrollments/offerings/:offeringId` | Authenticated; service-scoped | List offering enrollments/roster within scope |
| POST | `/enrollments` | Authenticated; service-scoped | Create an enrollment subject to service authorization |
| DELETE | `/enrollments/:enrollmentId` | Authenticated; service-scoped | Remove/deactivate an enrollment according to service rules |

## 5. Timetable

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/timetable` | Authenticated; role-scoped | List visible timetable entries |
| GET | `/timetable/:entryId` | Authenticated; role-scoped | Read one visible timetable entry |
| POST | `/timetable` | Admin, coordinator | Create a timetable entry |
| PATCH | `/timetable/:entryId` | Admin, coordinator | Update a timetable entry |
| PATCH | `/timetable/:entryId/deactivate` | Admin, coordinator | Soft-deactivate a timetable entry |

## 6. Assignments, submissions, and course materials

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/assignments` | Authenticated; service-scoped | List visible assignments |
| GET | `/assignments/:assignmentId` | Authenticated; service-scoped | Read one visible assignment |
| POST | `/assignments` | Faculty | Create an assignment draft for an authorized offering |
| PATCH | `/assignments/:assignmentId` | Faculty | Update an owned draft |
| PATCH | `/assignments/:assignmentId/publish` | Faculty | Publish an owned draft after service checks |
| POST | `/submissions/upload-url` | Student | Request a private upload URL for a submission file |
| POST | `/submissions/complete` | Student | Complete/record an uploaded submission or resubmission |
| GET | `/submissions/my` | Student | List the student's submissions |
| GET | `/submissions/department` | Coordinator | List submissions in permitted department scope |
| GET | `/submissions/institution` | Admin | List institution-level submissions |
| GET | `/submissions/assignment/:assignmentId` | Faculty | List submissions for an assignment the faculty member may review |
| PATCH | `/submissions/:submissionId/evaluate` | Faculty | Grade and provide feedback on a submission |
| GET | `/submissions/:submissionId/download-url` | Student, faculty | Obtain an authorized temporary file download URL |
| POST | `/course-materials/upload-url` | Faculty | Request a private course-material upload URL |
| POST | `/course-materials/complete` | Faculty | Finalize uploaded course-material metadata |
| GET | `/course-materials/offering/:courseOfferingId` | Faculty, student | List materials visible for an offering |
| GET | `/course-materials/:materialId/download-url` | Faculty, student | Obtain an authorized temporary download URL |
| DELETE | `/course-materials/:materialId` | Faculty | Delete an owned course material and its storage object through service rules |

### Private file workflow

1. The authorized client requests an upload URL.
2. The API validates user role, offering/assignment scope, file metadata, and workflow conditions.
3. The browser uploads bytes directly to private object storage using the returned URL and required headers.
4. The client calls the completion endpoint with the upload metadata returned/required by the API.
5. The service validates and persists the file reference.
6. A later download request rechecks access and returns a temporary URL.

Do not treat an upload URL as a permanent share link. Do not expose storage credentials or object keys in public client code.

## 7. Attendance

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/attendance/options` | Faculty | Retrieve faculty attendance options |
| GET | `/attendance/my` | Student | Retrieve the student's attendance |
| GET | `/attendance/overview` | Authenticated; service-scoped | Retrieve attendance overview in permitted scope |
| GET | `/attendance/sessions` | Authenticated; service-scoped | List visible attendance sessions |
| POST | `/attendance/sessions` | Faculty | Create an attendance session |
| GET | `/attendance/correction-requests` | Student, faculty, coordinator | List correction requests in permitted scope |
| POST | `/attendance/records/:recordId/correction-requests` | Student | Request correction for own attendance record |
| PATCH | `/attendance/correction-requests/:requestId/review` | Faculty | Review a correction request subject to reviewer scope |
| GET | `/attendance/sessions/:sessionId` | Authenticated; service-scoped | Read a session and permitted records |
| GET | `/attendance/faculty/options` | Authenticated; service-scoped | Faculty session/roster options |
| GET | `/attendance/faculty/offerings/:courseOfferingId/roster` | Authenticated; service-scoped | Retrieve enrolled roster for an offering |
| POST | `/attendance/faculty/sessions` | Authenticated; service-scoped | Create a faculty attendance session through faculty workflow |
| PUT | `/attendance-sessions/:sessionId/records` | Authenticated; service-scoped | Bulk-save attendance records for a session |

Bulk attendance must be checked against the session's course offering and current enrolled roster. The client must not be trusted to supply arbitrary student IDs.

## 8. Announcements

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/announcements/options` | Faculty | Retrieve allowed announcement targets |
| GET | `/announcements` | Authenticated; visibility-scoped | List active announcements visible to the user |
| POST | `/announcements` | Admin, coordinator, faculty | Publish within the caller's permitted scope |
| PATCH | `/announcements/:announcementId/read` | Student | Create/update the student's read marker |

Announcement visibility is enforced by the service using announcement scope, department/course context, and expiry. Read tracking is per student.

## 9. Clubs and events

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/clubs` | Admin, coordinator | List clubs within permitted scope |
| POST | `/clubs` | Admin, coordinator | Create a club within permitted scope |
| GET | `/clubs/:slug` | Admin, coordinator | Read a club by slug |
| PATCH | `/clubs/:clubId` | Admin, coordinator | Update a club within permitted scope |
| PATCH | `/clubs/:clubId/deactivate` | Admin, coordinator | Deactivate a club |
| GET | `/events` | Authenticated; visibility-scoped | List visible events |
| POST | `/events` | Admin, coordinator | Create an event draft |
| GET | `/events/:eventId` | Authenticated; visibility-scoped | Read a visible event |
| PATCH | `/events/:eventId` | Admin, coordinator | Update an event draft |
| PATCH | `/events/:eventId/publish` | Admin, coordinator | Publish an event |
| PATCH | `/events/:eventId/cancel` | Admin, coordinator | Cancel an event with a reason |
| PATCH | `/events/:eventId/complete` | Admin, coordinator | Mark an event completed |
| GET | `/events/registrations/me` | Student | List the student's event registrations |
| POST | `/events/:eventId/registrations` | Student | Register for an event |
| DELETE | `/events/:eventId/registrations/me` | Student | Cancel own registration |
| GET | `/events/:eventId/participants` | Coordinator, admin | List event participants |
| PUT | `/events/:eventId/attendance` | Coordinator, admin | Save event attendance |

Event services enforce lifecycle, capacity, registration, department/club ownership, and attendance timing rules. The route's role list does not by itself grant access to every event.

## 10. Health endpoints

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Compatibility process health response |
| GET | `/health/live` | Public | Liveness probe |
| GET | `/health/ready` | Public | Readiness probe; checks MongoDB connection |

These health paths are relative to `/api/v1`.

## 11. Common status codes

| Status | Meaning |
|---|---|
| 200 | Successful read or mutation |
| 201 | Resource created |
| 400 | Invalid request data, identifier, or workflow input |
| 401 | Missing/invalid/expired authentication |
| 403 | Role or permission denied |
| 404 | Resource missing or intentionally hidden outside caller scope |
| 409 | Conflicting state or uniqueness/capacity conflict where implemented |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 503 | Readiness check reports a required dependency unavailable |

The exact error `code` values are defined by the server's `ApiError`, validation, and middleware implementations.

## 12. Example request patterns

### Authenticated JSON request

```http
GET /api/v1/dashboard/summary HTTP/1.1
Authorization: Bearer <access-token>
Accept: application/json
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "student@example.edu",
  "password": "<local-or-user-supplied-password>"
}
```

The actual login validator defines accepted field constraints. The response includes an access token and user data; the refresh token is set as an HttpOnly cookie.

### Refresh-cookie request

```http
POST /api/v1/auth/refresh
Origin: https://<configured-client-origin>
Cookie: <browser-managed-refresh-cookie>
```

For browser code, use credentialed fetch/client configuration rather than manually reading or constructing the HttpOnly cookie.

## 13. Contract maintenance

Before changing an endpoint, inspect its route, validation module, service, and tests together. Update this reference and `openapi.yaml` in the same change. Do not add undocumented request fields or claim that an endpoint is available merely because a frontend screen exists.
