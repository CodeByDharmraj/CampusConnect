import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getProfilePhotoKey } from '../../lib/profilePhoto.js'
import ProfileMenu from './ProfileMenu.jsx'

const user = {
  id: 'u1',
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  role: 'student',
}

function Harness({ onLogout = vi.fn() }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <MemoryRouter>
      <button type="button">before</button>
      <ProfileMenu
        user={user}
        isOpen={open}
        onToggle={() => setOpen((current) => !current)}
        onClose={close}
        onLogout={onLogout}
      />
      <button type="button">after</button>
    </MemoryRouter>
  )
}

const trigger = () => screen.getByRole('button', { name: 'Open profile menu' })

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('ProfileMenu', () => {
  it('shows the account summary and moves focus to the first item on open', () => {
    render(<Harness />)
    fireEvent.click(trigger())

    const menu = screen.getByRole('menu', { name: 'Profile menu' })
    expect(menu).toHaveTextContent('Aarav Sharma')
    expect(menu).toHaveTextContent('aarav@example.com')
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveAttribute(
      'href',
      '/profile',
    )
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveFocus()
  })

  it('moves between items with the arrow keys, wrapping at the ends', () => {
    render(<Harness />)
    fireEvent.click(trigger())

    const profile = screen.getByRole('menuitem', { name: 'My profile' })
    const logout = screen.getByRole('menuitem', { name: /logout/i })

    fireEvent.keyDown(profile, { key: 'ArrowDown' })
    expect(logout).toHaveFocus()
    fireEvent.keyDown(logout, { key: 'ArrowDown' })
    expect(profile).toHaveFocus()
    fireEvent.keyDown(profile, { key: 'ArrowUp' })
    expect(logout).toHaveFocus()
    fireEvent.keyDown(logout, { key: 'Home' })
    expect(profile).toHaveFocus()
    fireEvent.keyDown(profile, { key: 'End' })
    expect(logout).toHaveFocus()
  })

  it('closes on Escape and returns focus to the button', () => {
    render(<Harness />)
    fireEvent.click(trigger())

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Tab, handing focus back to the button first', () => {
    render(<Harness />)
    fireEvent.click(trigger())

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'My profile' }), {
      key: 'Tab',
    })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('closes when the user presses outside it, but not inside', () => {
    render(<Harness />)
    fireEvent.click(trigger())

    fireEvent.pointerDown(screen.getByRole('menu'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'after' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes after choosing My profile', () => {
    render(<Harness />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'My profile' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onLogout from the Logout item', () => {
    const onLogout = vi.fn()
    render(<Harness onLogout={onLogout} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('shows initials without a photo and the photo once one is stored', () => {
    const { container, unmount } = render(<Harness />)
    expect(trigger()).toHaveTextContent('AS')
    expect(container.querySelector('img')).toBeNull()
    unmount()

    window.localStorage.setItem(
      getProfilePhotoKey(user),
      'data:image/jpeg;base64,AAAA',
    )
    const second = render(<Harness />)
    expect(second.container.querySelector('button img')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,AAAA',
    )
    expect(trigger()).not.toHaveTextContent('AS')
  })
})
