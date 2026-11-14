import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Dialog from './Dialog.jsx'

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
)

const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
)

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function () {
      this.setAttribute('open', '')
    }),
  })

  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function () {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()

  if (originalShowModal) {
    Object.defineProperty(
      HTMLDialogElement.prototype,
      'showModal',
      originalShowModal,
    )
  } else {
    delete HTMLDialogElement.prototype.showModal
  }

  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  } else {
    delete HTMLDialogElement.prototype.close
  }
})

describe('Dialog', () => {
  it('renders its title and content when open', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Delete course?">
        Are you sure?
      </Dialog>,
    )

    expect(
      screen.getByRole('dialog', { name: 'Delete course?' }),
    ).toBeInTheDocument()

    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('renders an accessible description when provided', () => {
    render(
      <Dialog
        open
        onClose={vi.fn()}
        title="Delete course?"
        description="This action cannot be undone."
      >
        Confirm deletion.
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Delete course?',
    })

    expect(dialog).toHaveAccessibleDescription('This action cannot be undone.')
  })

  it('does not render a description when one is not provided', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Course details">
        Course information.
      </Dialog>,
    )

    expect(
      screen.getByRole('dialog', { name: 'Course details' }),
    ).not.toHaveAttribute('aria-describedby')
  })

  it('opens the native dialog when open is true', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Confirm">
        Confirmation content.
      </Dialog>,
    )

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
  })

  it('closes the native dialog when open changes to false', () => {
    const onClose = vi.fn()

    const { rerender } = render(
      <Dialog open onClose={onClose} title="Confirm">
        Confirmation content.
      </Dialog>,
    )

    rerender(
      <Dialog open={false} onClose={onClose} title="Confirm">
        Confirmation content.
      </Dialog>,
    )

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1)

    // React closing the dialog must not trigger another onClose.
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose} title="Confirm">
        Confirmation content.
      </Dialog>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape triggers the cancel event', () => {
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose} title="Confirm">
        Confirmation content.
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog')

    const event = new Event('cancel', {
      bubbles: false,
      cancelable: true,
    })

    fireEvent(dialog, event)

    expect(event.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is clicked by default', () => {
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose} title="Confirm">
        Confirmation content.
      </Dialog>,
    )

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when backdrop dismissal is disabled', () => {
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose} title="Confirm" closeOnBackdrop={false}>
        Confirmation content.
      </Dialog>,
    )

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not render the close button when disabled', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Confirm" showCloseButton={false}>
        Confirmation content.
      </Dialog>,
    )

    expect(
      screen.queryByRole('button', { name: 'Close dialog' }),
    ).not.toBeInTheDocument()
  })

  it('renders footer actions', () => {
    render(
      <Dialog
        open
        onClose={vi.fn()}
        title="Confirm"
        footer={<button type="button">Confirm action</button>}
      >
        Confirmation content.
      </Dialog>,
    )

    expect(
      screen.getByRole('button', { name: 'Confirm action' }),
    ).toBeInTheDocument()
  })

  it('supports different sizes', () => {
    const { rerender } = render(
      <Dialog open onClose={vi.fn()} title="Small" size="sm">
        Content.
      </Dialog>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm')

    rerender(
      <Dialog open onClose={vi.fn()} title="Large" size="lg">
        Content.
      </Dialog>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl')
  })

  it('supports custom CSS classes', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Confirm" className="custom-dialog">
        Content.
      </Dialog>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('custom-dialog')
  })

  it('does not open the native dialog when open is false', () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Confirm">
        Content.
      </Dialog>,
    )

    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
  })
})
