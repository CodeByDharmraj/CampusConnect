import { describe, expect, it } from 'vitest'
import Select from './Select.jsx'

import { afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

const options = [
  { label: 'Computer Science', value: 'cse' },
  { label: 'Electronics', value: 'ece' },
]

describe('Select', () => {
  it('renders a labelled select', () => {
    render(<Select label="Department" options={options} />)

    expect(screen.getByLabelText('Department')).toBeInTheDocument()
  })

  it('renders the supplied options', () => {
    render(<Select label="Department" options={options} />)

    expect(
      screen.getByRole('option', { name: 'Computer Science' }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('option', { name: 'Electronics' }),
    ).toBeInTheDocument()
  })

  it('supports string options', () => {
    render(<Select label="Semester" options={['Semester 1', 'Semester 2']} />)

    expect(screen.getByRole('option', { name: 'Semester 1' })).toHaveValue(
      'Semester 1',
    )
  })

  it('renders a custom placeholder', () => {
    render(
      <Select
        label="Department"
        placeholder="Choose department"
        options={options}
      />,
    )

    expect(
      screen.getByRole('option', { name: 'Choose department' }),
    ).toBeInTheDocument()
  })

  it('displays validation errors accessibly', () => {
    render(
      <Select
        label="Department"
        options={options}
        error="Select a department."
      />,
    )

    const select = screen.getByLabelText('Department')

    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('Select a department.')
  })

  it('supports required and disabled states', () => {
    render(<Select label="Department" options={options} required disabled />)

    const select = screen.getByLabelText(/Department/)

    expect(select).toBeRequired()
    expect(select).toBeDisabled()
  })

  it('forwards native select attributes', () => {
    render(<Select label="Department" name="department" options={options} />)

    expect(screen.getByLabelText('Department')).toHaveAttribute(
      'name',
      'department',
    )
  })
})
