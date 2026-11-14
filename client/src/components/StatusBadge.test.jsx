import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import StatusBadge from './StatusBadge.jsx'

afterEach(() => {
  cleanup()
})

describe('StatusBadge', () => {
  it('renders its children', () => {
    render(<StatusBadge>Approved</StatusBadge>)

    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('uses the secondary variant by default', () => {
    render(<StatusBadge>Inactive</StatusBadge>)

    expect(screen.getByText('Inactive')).toHaveClass('bg-slate-100')
  })

  it('supports the success variant', () => {
    render(<StatusBadge variant="success">Approved</StatusBadge>)

    expect(screen.getByText('Approved')).toHaveClass('bg-green-100')
  })

  it('supports the warning variant', () => {
    render(<StatusBadge variant="warning">Pending</StatusBadge>)

    expect(screen.getByText('Pending')).toHaveClass('bg-amber-100')
  })

  it('supports the danger variant', () => {
    render(<StatusBadge variant="danger">Rejected</StatusBadge>)

    expect(screen.getByText('Rejected')).toHaveClass('bg-red-100')
  })

  it('supports the info variant', () => {
    render(<StatusBadge variant="info">Active</StatusBadge>)

    expect(screen.getByText('Active')).toHaveClass('bg-blue-100')
  })

  it('supports the secondary variant', () => {
    render(<StatusBadge variant="secondary">Inactive</StatusBadge>)

    expect(screen.getByText('Inactive')).toHaveClass('bg-slate-100')
  })

  it('uses the medium size by default', () => {
    render(<StatusBadge>Pending</StatusBadge>)

    expect(screen.getByText('Pending')).toHaveClass('px-2.5')
  })

  it('supports different sizes', () => {
    const { rerender } = render(<StatusBadge size="sm">Small</StatusBadge>)

    expect(screen.getByText('Small')).toHaveClass('px-2')

    rerender(<StatusBadge size="lg">Large</StatusBadge>)

    expect(screen.getByText('Large')).toHaveClass('px-3')
  })

  it('supports custom CSS classes', () => {
    render(<StatusBadge className="custom-badge">Custom</StatusBadge>)

    expect(screen.getByText('Custom')).toHaveClass('custom-badge')
  })

  it('supports native HTML attributes', () => {
    render(
      <StatusBadge data-testid="status" aria-label="Approval status">
        Approved
      </StatusBadge>,
    )

    expect(screen.getByTestId('status')).toHaveAttribute(
      'aria-label',
      'Approval status',
    )
  })

  it('falls back to the secondary variant for an unknown variant', () => {
    render(<StatusBadge variant="unknown">Unknown</StatusBadge>)

    expect(screen.getByText('Unknown')).toHaveClass('bg-slate-100')
  })

  it('falls back to medium size for an unknown size', () => {
    render(<StatusBadge size="unknown">Unknown</StatusBadge>)

    expect(screen.getByText('Unknown')).toHaveClass('px-2.5')
  })

  it('renders as a non-interactive span', () => {
    render(<StatusBadge>Approved</StatusBadge>)

    expect(screen.getByText('Approved').tagName).toBe('SPAN')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
