import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App.jsx'

afterEach(() => {
  cleanup()
})

describe('CampusConnect application', () => {
  it('renders the CampusConnect dashboard', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Your campus, connected.',
      }),
    ).toBeInTheDocument()
  })

  it('navigates to the timetable page', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: /Timetable/ }))

    expect(
      screen.getByRole('heading', { name: 'Timetable' }),
    ).toBeInTheDocument()
  })

  it('switches to dark mode when requested', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument()
  })

  it('shows a not-found page for an unknown route', () => {
    window.history.pushState({}, '', '/unknown-page')

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
  })
})
