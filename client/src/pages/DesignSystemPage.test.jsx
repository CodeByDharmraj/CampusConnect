import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DesignSystemPage from './DesignSystemPage.jsx'

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

describe('DesignSystemPage', () => {
  it('renders the page heading', () => {
    render(<DesignSystemPage />)

    expect(
      screen.getByRole('heading', { name: 'Design System' }),
    ).toBeInTheDocument()
  })

  it('renders the Buttons section', () => {
    render(<DesignSystemPage />)

    expect(screen.getByRole('heading', { name: 'Buttons' })).toBeInTheDocument()
  })

  it('demonstrates all five button variants', () => {
    render(<DesignSystemPage />)

    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Secondary' }),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument()
  })

  it('demonstrates button sizes and states', () => {
    render(<DesignSystemPage />)

    expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled()

    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('renders the Cards section and examples', () => {
    render(<DesignSystemPage />)

    expect(screen.getByRole('heading', { name: 'Cards' })).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Computer Networks' }),
    ).toBeInTheDocument()

    expect(screen.getByText('Enrolled students: 62')).toBeInTheDocument()
  })

  it('demonstrates all five badge variants', () => {
    render(<DesignSystemPage />)

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getAllByText('Danger')).toHaveLength(2)
    expect(screen.getByText('Info')).toBeInTheDocument()
    expect(screen.getAllByText('Secondary')).toHaveLength(2)
  })

  it('demonstrates badge sizes', () => {
    render(<DesignSystemPage />)

    expect(screen.getAllByText('Small')).toHaveLength(2)
    expect(screen.getAllByText('Medium')).toHaveLength(2)
    expect(screen.getAllByText('Large')).toHaveLength(2)
  })

  it('renders the theme support section', () => {
    render(<DesignSystemPage />)

    expect(
      screen.getByRole('heading', { name: 'Theme support' }),
    ).toBeInTheDocument()

    expect(screen.getByText('Theme compatible')).toBeInTheDocument()
  })

  it('renders the Dialog section and open button', () => {
    render(<DesignSystemPage />)

    expect(screen.getByRole('heading', { name: 'Dialogs' })).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Open dialog' }),
    ).toBeInTheDocument()
  })

  it('opens the demonstration dialog when its trigger is clicked', () => {
    render(<DesignSystemPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }))

    expect(
      screen.getByRole('dialog', { name: 'Confirm action' }),
    ).toBeInTheDocument()
  })

  it('closes the demonstration dialog when Cancel is clicked', () => {
    render(<DesignSystemPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.queryByRole('dialog', { name: 'Confirm action' }),
    ).not.toBeInTheDocument()
  })

  it('renders the Empty States section', () => {
    render(<DesignSystemPage />)

    expect(
      screen.getByRole('heading', { name: 'Empty states' }),
    ).toBeInTheDocument()
  })

  it('demonstrates an empty state with a title and description', () => {
    render(<DesignSystemPage />)

    expect(
      screen.getByRole('heading', { name: 'No assignments yet' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Your assigned coursework will appear here when your faculty publishes an assignment.',
      ),
    ).toBeInTheDocument()
  })

  it('demonstrates an empty state with a custom icon', () => {
    render(<DesignSystemPage />)

    expect(
      screen.getByRole('heading', { name: 'No courses available' }),
    ).toBeInTheDocument()
  })

  it('renders the empty-state action button', () => {
    render(<DesignSystemPage />)

    expect(
      screen.getByRole('button', { name: 'Refresh page' }),
    ).toBeInTheDocument()
  })
})
