import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import Button from './Button.jsx'

afterEach(() => {
  cleanup()
})

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Save changes</Button>)

    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument()
  })

  it('uses the primary variant by default', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
  })

  it('supports the secondary variant', () => {
    render(<Button variant="secondary">Cancel</Button>)

    expect(screen.getByRole('button')).toHaveClass('bg-slate-100')
  })

  it('supports the outline variant', () => {
    render(<Button variant="outline">Edit</Button>)

    expect(screen.getByRole('button')).toHaveClass('border')
  })

  it('supports the ghost variant', () => {
    render(<Button variant="ghost">Menu</Button>)

    expect(screen.getByRole('button')).toHaveClass('bg-transparent')
  })

  it('supports the danger variant', () => {
    render(<Button variant="danger">Delete</Button>)

    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('uses the medium size by default', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button')).toHaveClass('min-h-10')
  })

  it('supports different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)

    expect(screen.getByRole('button')).toHaveClass('min-h-8')

    rerender(<Button size="lg">Large</Button>)

    expect(screen.getByRole('button')).toHaveClass('min-h-12')
  })

  it('supports a custom button type', () => {
    render(<Button type="submit">Submit</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('is disabled when the disabled prop is true', () => {
    render(<Button disabled>Save</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('disables itself and displays a loading indicator when loading', () => {
    render(<Button isLoading>Saving</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.getByRole('button').querySelector('[aria-hidden="true"]'),
    ).toBeInTheDocument()
  })

  it('supports full width', () => {
    render(<Button fullWidth>Continue</Button>)

    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('supports custom CSS classes', () => {
    render(<Button className="custom-button">Continue</Button>)

    expect(screen.getByRole('button')).toHaveClass('custom-button')
  })

  it('renders a leading icon', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">+</span>}>Add</Button>,
    )

    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
  })

  it('renders a trailing icon', () => {
    render(
      <Button rightIcon={<span data-testid="right-icon">?</span>}>
        Continue
      </Button>,
    )

    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('does not render icons while loading', () => {
    render(
      <Button
        isLoading
        leftIcon={<span data-testid="left-icon">+</span>}
        rightIcon={<span data-testid="right-icon">?</span>}
      >
        Saving
      </Button>,
    )

    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
  })

  it('preserves additional native button attributes', () => {
    render(
      <Button aria-label="Save the form" data-testid="save-button">
        Save
      </Button>,
    )

    expect(screen.getByTestId('save-button')).toHaveAttribute(
      'aria-label',
      'Save the form',
    )
  })

  it('falls back to primary styling for an unknown variant', () => {
    render(<Button variant="unknown">Save</Button>)

    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
  })

  it('falls back to medium sizing for an unknown size', () => {
    render(<Button size="unknown">Save</Button>)

    expect(screen.getByRole('button')).toHaveClass('min-h-10')
  })
})
