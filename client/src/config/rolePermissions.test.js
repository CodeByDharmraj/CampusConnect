import { describe, expect, it } from 'vitest'

import {
  ROLES,
  hasPermission,
  navigationPermissions,
  timetablePermissions,
} from './rolePermissions.js'

describe('CampusConnect role permissions', () => {
  it('allows every authenticated role to view the timetable', () => {
    expect(timetablePermissions.view).toEqual([
      ROLES.STUDENT,
      ROLES.FACULTY,
      ROLES.COORDINATOR,
      ROLES.ADMIN,
    ])
  })

  it('allows only administrators to create timetable entries', () => {
    expect(timetablePermissions.create).toEqual([ROLES.ADMIN])
  })

  it('allows only administrators to update timetable entries', () => {
    expect(timetablePermissions.update).toEqual([ROLES.ADMIN])
  })

  it('allows only administrators to delete timetable entries', () => {
    expect(timetablePermissions.delete).toEqual([ROLES.ADMIN])
  })

  it('checks whether a role has a navigation permission', () => {
    expect(hasPermission(ROLES.STUDENT, navigationPermissions.timetable)).toBe(
      true,
    )

    expect(hasPermission(ROLES.FACULTY, navigationPermissions.timetable)).toBe(
      true,
    )

    expect(
      hasPermission(ROLES.COORDINATOR, navigationPermissions.timetable),
    ).toBe(true)

    expect(hasPermission(ROLES.ADMIN, navigationPermissions.timetable)).toBe(
      true,
    )
  })

  it('does not grant a permission to an unknown role', () => {
    expect(hasPermission('unknown-role', navigationPermissions.timetable)).toBe(
      false,
    )
  })
})
