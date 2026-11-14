import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ToastProvider from './ToastProvider.jsx'
import useToast from './useToast.js'

function ToastTestConsumer() {
  const toast = useToast()

  return (
    <div>
      <button onClick={() => toast.success('Saved successfully.')}>
        Show success
      </button>

      <button onClick={() => toast.error('Unable to save.')}>Show error</button>

      <button onClick={() => toast.warning('Session expiring.')}>
        Show warning
      </button>

      <button onClick={() => toast.info('New assignment.')}>Show info</button>

      <button
        onClick={() => toast.info('Persistent notification.', { duration: 0 })}
      >
        Show persistent
      </button>

      <button
        onClick={() => {
          toast.info('Notification 1', { duration: 0 })
          toast.info('Notification 2', { duration: 0 })
          toast.info('Notification 3', { duration: 0 })
          toast.info('Notification 4', { duration: 0 })
          toast.info('Notification 5', { duration: 0 })
          toast.info('Notification 6', { duration: 0 })
        }}
      >
        Show six notifications
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <ToastProvider>
      <ToastTestConsumer />
    </ToastProvider>,
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('provides the success notification method', () => {
    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))

    expect(screen.getByRole('status')).toHaveTextContent('Saved successfully.')
  })

  it('provides the error notification method', () => {
    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Show error' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save.')
  })

  it('provides warning and info notification methods', () => {
    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Show warning' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show info' }))

    expect(screen.getByText('Session expiring.')).toBeInTheDocument()
    expect(screen.getByText('New assignment.')).toBeInTheDocument()
  })

  it('automatically dismisses notifications after the default duration', () => {
    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))

    expect(screen.getByText('Saved successfully.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByText('Saved successfully.')).not.toBeInTheDocument()
  })

  it('keeps notifications visible when duration is zero', () => {
    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Show persistent' }))

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Persistent notification.')).toBeInTheDocument()
  })

  it('allows manual dismissal', () => {
    renderProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Show success' }))

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    )

    expect(screen.queryByText('Saved successfully.')).not.toBeInTheDocument()
  })

  it('limits simultaneous notifications to five', () => {
    renderProvider()

    fireEvent.click(
      screen.getByRole('button', { name: 'Show six notifications' }),
    )

    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument()

    for (let number = 2; number <= 6; number += 1) {
      expect(screen.getByText(`Notification ${number}`)).toBeInTheDocument()
    }

    expect(screen.getByLabelText('Notifications').children).toHaveLength(5)
  })

  it('throws a helpful error when used outside its provider', () => {
    function InvalidConsumer() {
      useToast()
      return null
    }

    expect(() => render(<InvalidConsumer />)).toThrow(
      'useToast must be used within a ToastProvider',
    )
  })
})
