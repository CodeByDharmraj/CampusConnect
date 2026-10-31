import { describe, expect, it } from 'vitest'
import Input from './Input.jsx'

import { afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

describe('Input', () => {
  it('renders a labelled input', () => {
    render(<Input label="Email address" />)

    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('supports different input types', () => {
    render(<Input label="Password" type="password" />)

    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    )
  })

  it('displays helper text', () => {
    render(<Input label="Email" hint="Use your college email." />)

    expect(screen.getByText('Use your college email.')).toBeInTheDocument()
  })

  it('displays validation errors accessibly', () => {
    render(<Input label="Email" error="Enter a valid email." />)

    const input = screen.getByLabelText('Email')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email.')
  })

  it('gives an error priority over helper text', () => {
    render(
      <Input
        label="Email"
        hint="Use your college email."
        error="Invalid email."
      />,
    )

    expect(screen.getByText('Invalid email.')).toBeInTheDocument()
    expect(
      screen.queryByText('Use your college email.'),
    ).not.toBeInTheDocument()
  })

  it('supports required and disabled states', () => {
    render(<Input label="Name" required disabled />)

    const input = screen.getByLabelText(/Name/)

    expect(input).toBeRequired()
    expect(input).toBeDisabled()
  })

  it('forwards native input attributes', () => {
    render(
      <Input
        label="Student ID"
        name="studentId"
        placeholder="Enter student ID"
        maxLength={12}
      />,
    )

    const input = screen.getByLabelText('Student ID')

    expect(input).toHaveAttribute('name', 'studentId')
    expect(input).toHaveAttribute('placeholder', 'Enter student ID')
    expect(input).toHaveAttribute('maxlength', '12')
  })
})
