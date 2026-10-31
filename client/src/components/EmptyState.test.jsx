import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EmptyState from './EmptyState.jsx'

afterEach(() => {
  cleanup()
})

describe('EmptyState', () => {
  it('renders the required title', () => {
    render(<EmptyState title="No assignments yet" />)

    expect(
      screen.getByRole('heading', { name: 'No assignments yet' }),
    ).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(
      <EmptyState
        title="No assignments yet"
        description="Your assignments will appear here."
      />,
    )

    expect(
      screen.getByText('Your assignments will appear here.'),
    ).toBeInTheDocument()
  })

  it('does not render a description when one is not provided', () => {
    render(<EmptyState title="No assignments yet" />)

    expect(
      screen.queryByText('Your assignments will appear here.'),
    ).not.toBeInTheDocument()
  })

  it('connects the section to its heading and description', () => {
    render(
      <EmptyState
        title="No assignments yet"
        description="Your assignments will appear here."
      />,
    )

    const section = screen.getByRole('region', {
      name: 'No assignments yet',
    })

    const heading = screen.getByRole('heading', {
      name: 'No assignments yet',
    })

    const description = screen.getByText('Your assignments will appear here.')

    expect(section).toHaveAttribute('aria-labelledby', heading.id)
    expect(section).toHaveAttribute('aria-describedby', description.id)
  })

  it('renders the default decorative icon', () => {
    const { container } = render(<EmptyState title="No assignments yet" />)

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('renders a custom icon', () => {
    const { container } = render(
      <EmptyState
        title="No classes today"
        icon={<span data-testid="custom-icon">Calendar</span>}
      />,
    )

    expect(
      container.querySelector('[data-testid="custom-icon"]'),
    ).toBeInTheDocument()
  })

  it('does not render the icon when icon is null', () => {
    const { container } = render(
      <EmptyState title="No assignments yet" icon={null} />,
    )

    expect(
      container.querySelector('[aria-hidden="true"]'),
    ).not.toBeInTheDocument()
  })

  it('renders the primary action', () => {
    render(
      <EmptyState
        title="No assignments yet"
        action={<button type="button">Create assignment</button>}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Create assignment' }),
    ).toBeInTheDocument()
  })

  it('renders the secondary action', () => {
    render(
      <EmptyState
        title="No assignments yet"
        secondaryAction={<button type="button">Refresh</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('renders both actions', () => {
    render(
      <EmptyState
        title="No assignments yet"
        action={<button type="button">Create assignment</button>}
        secondaryAction={<button type="button">Refresh</button>}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Create assignment' }),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('executes the supplied action when clicked', () => {
    const handleCreate = vi.fn()

    render(
      <EmptyState
        title="No assignments yet"
        action={
          <button type="button" onClick={handleCreate}>
            Create assignment
          </button>
        }
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create assignment' }))

    expect(handleCreate).toHaveBeenCalledTimes(1)
  })

  it('does not render the action container when no actions are provided', () => {
    const { container } = render(<EmptyState title="No assignments yet" />)

    expect(container.querySelector('.mt-5')).not.toBeInTheDocument()
  })

  it('supports custom classes', () => {
    const { container } = render(
      <EmptyState title="No assignments yet" className="custom-empty-state" />,
    )

    expect(container.firstChild).toHaveClass('custom-empty-state')
  })

  it('forwards native HTML attributes to the section', () => {
    render(
      <EmptyState
        title="No assignments yet"
        data-testid="assignments-empty-state"
      />,
    )

    expect(screen.getByTestId('assignments-empty-state')).toBeInTheDocument()
  })
})
