import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card.jsx'

afterEach(() => {
  cleanup()
})

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Course information</Card>)

    expect(screen.getByText('Course information')).toBeInTheDocument()
  })

  it('uses the default variant', () => {
    render(<Card>Default card</Card>)

    expect(screen.getByText('Default card')).toHaveClass('border-slate-200')
    expect(screen.getByText('Default card')).toHaveClass('bg-white')
  })

  it('supports the elevated variant', () => {
    render(<Card variant="elevated">Elevated card</Card>)

    expect(screen.getByText('Elevated card')).toHaveClass('shadow-md')
  })

  it('supports the interactive variant', () => {
    render(<Card variant="interactive">Interactive card</Card>)

    expect(screen.getByText('Interactive card')).toHaveClass('hover:shadow-md')
  })

  it('supports different padding sizes', () => {
    const { rerender } = render(<Card padding="sm">Small</Card>)

    expect(screen.getByText('Small')).toHaveClass('p-3')

    rerender(<Card padding="md">Medium</Card>)

    expect(screen.getByText('Medium')).toHaveClass('p-5')

    rerender(<Card padding="lg">Large</Card>)

    expect(screen.getByText('Large')).toHaveClass('p-6')
  })

  it('supports no padding', () => {
    render(<Card padding="none">No padding</Card>)

    expect(screen.getByText('No padding')).not.toHaveClass('p-3')
    expect(screen.getByText('No padding')).not.toHaveClass('p-5')
    expect(screen.getByText('No padding')).not.toHaveClass('p-6')
  })

  it('supports custom CSS classes', () => {
    render(<Card className="custom-card">Custom</Card>)

    expect(screen.getByText('Custom')).toHaveClass('custom-card')
  })

  it('supports native HTML attributes', () => {
    render(
      <Card data-testid="course-card" aria-label="Course details">
        Course
      </Card>,
    )

    expect(screen.getByTestId('course-card')).toHaveAttribute(
      'aria-label',
      'Course details',
    )
  })

  it('falls back to the default variant for an unknown variant', () => {
    render(<Card variant="unknown">Fallback</Card>)

    expect(screen.getByText('Fallback')).toHaveClass('bg-white')
  })

  it('falls back to no padding for an unknown padding value', () => {
    render(<Card padding="unknown">Fallback</Card>)

    expect(screen.getByText('Fallback')).not.toHaveClass('p-3')
  })
})

describe('Card subcomponents', () => {
  it('renders CardHeader', () => {
    render(<CardHeader>Course heading</CardHeader>)

    expect(screen.getByText('Course heading')).toBeInTheDocument()
  })

  it('renders CardTitle as a heading', () => {
    render(<CardTitle>Computer Networks</CardTitle>)

    expect(
      screen.getByRole('heading', { name: 'Computer Networks' }),
    ).toBeInTheDocument()
  })

  it('renders CardDescription', () => {
    render(<CardDescription>Semester 5 course</CardDescription>)

    expect(screen.getByText('Semester 5 course').tagName).toBe('P')
  })

  it('renders CardContent', () => {
    render(<CardContent>Course details</CardContent>)

    expect(screen.getByText('Course details')).toBeInTheDocument()
  })

  it('renders CardFooter', () => {
    render(<CardFooter>Footer information</CardFooter>)

    expect(screen.getByText('Footer information')).toBeInTheDocument()
  })

  it('supports custom classes on subcomponents', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>)

    expect(screen.getByText('Header')).toHaveClass('custom-header')
  })
})

describe('Card composition', () => {
  it('renders all card sections together', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Computer Networks</CardTitle>
          <CardDescription>Semester 5</CardDescription>
        </CardHeader>

        <CardContent>Faculty: Dr. Sharma</CardContent>

        <CardFooter>View course</CardFooter>
      </Card>,
    )

    expect(
      screen.getByRole('heading', { name: 'Computer Networks' }),
    ).toBeInTheDocument()

    expect(screen.getByText('Semester 5')).toBeInTheDocument()
    expect(screen.getByText('Faculty: Dr. Sharma')).toBeInTheDocument()
    expect(screen.getByText('View course')).toBeInTheDocument()
  })
})
