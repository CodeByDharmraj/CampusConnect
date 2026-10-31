import { describe, expect, it } from 'vitest'

import {
  ROLES,
  ALL_ROLES,
  hasPermission,
  navigationPermissions,
  timetablePermissions,
  coursePermissions,
  assignmentPermissions,
  facultyCoursePermissions,
  announcementPermissions,
  accountPermissions,
  gradePermissions,
  submissionPermissions,
  clubsEventsPermissions,
} from './rolePermissions.js'

describe('CampusConnect role permissions', () => {
  it('defines exactly four supported roles', () => {
    expect(ALL_ROLES).toEqual(['student', 'faculty', 'coordinator', 'admin'])
  })
  it('allows all four roles to access Clubs & Events', () => {
    expect(navigationPermissions.clubsEvents).toEqual(ALL_ROLES)
    expect(clubsEventsPermissions.view).toEqual(ALL_ROLES)
  })

  it('allows students, faculty and admins to access Grades & Feedback', () => {
    expect(navigationPermissions.grades).toEqual([
      ROLES.STUDENT,
      ROLES.FACULTY,
      ROLES.ADMIN,
    ])
  })

  it('restricts grade management to faculty and administrators', () => {
    expect(gradePermissions.manageAssignedCourses).toEqual([ROLES.FACULTY])

    expect(gradePermissions.manageInstitution).toEqual([ROLES.ADMIN])
  })

  it('allows coordinators to view department submissions without grading', () => {
    expect(submissionPermissions.viewDepartment).toEqual([ROLES.COORDINATOR])

    expect(submissionPermissions.evaluateAssignedCourses).toEqual([
      ROLES.FACULTY,
    ])
  })

  it('restricts submission evaluation to faculty', () => {
    expect(submissionPermissions.evaluateAssignedCourses).not.toContain(
      ROLES.STUDENT,
    )

    expect(submissionPermissions.evaluateAssignedCourses).not.toContain(
      ROLES.COORDINATOR,
    )

    expect(submissionPermissions.evaluateAssignedCourses).not.toContain(
      ROLES.ADMIN,
    )
  })

  it('restricts event registration to students', () => {
    expect(clubsEventsPermissions.registerForEvents).toEqual([ROLES.STUDENT])
  })

  it('restricts club and event management by scope', () => {
    expect(clubsEventsPermissions.manageAssignedClubs).toEqual([
      ROLES.COORDINATOR,
    ])

    expect(clubsEventsPermissions.manageDepartmentEvents).toEqual([
      ROLES.COORDINATOR,
    ])

    expect(clubsEventsPermissions.manageInstitution).toEqual([ROLES.ADMIN])
  })

  it('allows all roles to view core academic navigation', () => {
    const features = [
      'dashboard',
      'courses',
      'timetable',
      'assignments',
      'attendance',
      'announcements',
    ]

    features.forEach((feature) => {
      expect(navigationPermissions[feature]).toEqual(ALL_ROLES)
    })
  })

  it('restricts management navigation appropriately', () => {
    expect(navigationPermissions.facultyCourseManagement).toEqual([
      ROLES.COORDINATOR,
      ROLES.ADMIN,
    ])

    expect(navigationPermissions.departmentManagement).toEqual([ROLES.ADMIN])

    expect(navigationPermissions.facultyManagement).toEqual([ROLES.ADMIN])

    expect(navigationPermissions.institutionalSettings).toEqual([ROLES.ADMIN])
  })

  it('allows only administrators to delete courses', () => {
    expect(coursePermissions.delete).toEqual([ROLES.ADMIN])
  })

  it('allows coordinators and administrators to manage courses', () => {
    expect(coursePermissions.create).toEqual([ROLES.COORDINATOR, ROLES.ADMIN])

    expect(coursePermissions.update).toEqual([ROLES.COORDINATOR, ROLES.ADMIN])
  })

  it('allows faculty, coordinators and administrators to manage assignments', () => {
    expect(assignmentPermissions.create).toEqual([
      ROLES.FACULTY,
      ROLES.COORDINATOR,
      ROLES.ADMIN,
    ])
  })

  it('allows students to submit assignments', () => {
    expect(assignmentPermissions.submit).toEqual([ROLES.STUDENT])
  })

  it('restricts faculty-course assignment management', () => {
    expect(facultyCoursePermissions.create).toEqual([
      ROLES.COORDINATOR,
      ROLES.ADMIN,
    ])

    expect(facultyCoursePermissions.update).toEqual([
      ROLES.COORDINATOR,
      ROLES.ADMIN,
    ])
  })

  it('enforces announcement publishing scopes', () => {
    expect(announcementPermissions.publishInstitution).toEqual([ROLES.ADMIN])

    expect(announcementPermissions.publishDepartment).toEqual([
      ROLES.COORDINATOR,
      ROLES.ADMIN,
    ])

    expect(announcementPermissions.publishCourse).toEqual([
      ROLES.FACULTY,
      ROLES.ADMIN,
    ])
  })

  it('restricts account management to administrators', () => {
    expect(accountPermissions.manageFaculty).toEqual([ROLES.ADMIN])
    expect(accountPermissions.manageStudents).toEqual([ROLES.ADMIN])
    expect(accountPermissions.manageCoordinators).toEqual([ROLES.ADMIN])
  })

  it('allows only administrators to manage timetable entries', () => {
    expect(timetablePermissions.view).toEqual(ALL_ROLES)
    expect(timetablePermissions.create).toEqual([ROLES.ADMIN])
    expect(timetablePermissions.update).toEqual([ROLES.ADMIN])
    expect(timetablePermissions.delete).toEqual([ROLES.ADMIN])
  })

  it('checks role permissions correctly', () => {
    expect(hasPermission(ROLES.COORDINATOR, coursePermissions.create)).toBe(
      true,
    )

    expect(hasPermission(ROLES.STUDENT, coursePermissions.create)).toBe(false)

    expect(
      hasPermission(ROLES.FACULTY, announcementPermissions.publishCourse),
    ).toBe(true)

    expect(
      hasPermission(ROLES.STUDENT, announcementPermissions.publishCourse),
    ).toBe(false)
  })

  it('does not grant permissions to unknown roles', () => {
    expect(hasPermission('unknown-role', navigationPermissions.dashboard)).toBe(
      false,
    )
  })

  it('does not grant permissions when the role is missing', () => {
    expect(hasPermission(undefined, navigationPermissions.dashboard)).toBe(
      false,
    )
  })
})
