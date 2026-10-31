import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

import Toast from './Toast.jsx'

describe('Toast', () => {
  it('renders an informational notification by default', () => {
    render(<Toast message="New assignment available." />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'New assignment available.',
    )
  })

  it('renders a success notification', () => {
    render(<Toast message="Saved successfully." type="success" />)

    expect(screen.getByRole('status')).toHaveTextContent('Saved successfully.')
  })

  it('renders an error notification as an alert', () => {
    render(<Toast message="Unable to save changes." type="error" />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to save changes.',
    )
  })

  it('renders a warning notification', () => {
    render(<Toast message="Session expiring soon." type="warning" />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Session expiring soon.',
    )
  })

  it('renders an information notification', () => {
    render(<Toast message="New information." type="info" />)

    expect(screen.getByRole('status')).toHaveTextContent('New information.')
  })

  it('falls back to the informational variant for an unknown type', () => {
    render(<Toast message="Fallback message." type="unknown" />)

    expect(screen.getByRole('status')).toHaveTextContent('Fallback message.')
  })

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()

    render(<Toast message="Dismiss this notification." onDismiss={onDismiss} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Dismiss notification',
      }),
    )

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
