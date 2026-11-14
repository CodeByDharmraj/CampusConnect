import { cleanup, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Textarea from './Textarea.jsx'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

describe('Textarea', () => {
  it('renders a labelled textarea', () => {
    render(<Textarea label="Description" />)

    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('uses four rows by default', () => {
    render(<Textarea label="Description" />)

    expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '4')
  })

  it('supports a custom row count', () => {
    render(<Textarea label="Description" rows={8} />)

    expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '8')
  })

  it('displays helper text', () => {
    render(<Textarea label="Description" hint="Provide a short description." />)

    expect(screen.getByText('Provide a short description.')).toBeInTheDocument()
  })

  it('displays validation errors accessibly', () => {
    render(<Textarea label="Description" error="Description is required." />)

    const textarea = screen.getByLabelText('Description')

    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAccessibleDescription('Description is required.')
  })

  it('supports required and disabled states', () => {
    render(<Textarea label="Description" required disabled />)

    const textarea = screen.getByLabelText(/Description/)

    expect(textarea).toBeRequired()
    expect(textarea).toBeDisabled()
  })

  it('forwards native textarea attributes', () => {
    render(
      <Textarea
        label="Description"
        name="description"
        placeholder="Write something"
        maxLength={500}
      />,
    )

    const textarea = screen.getByLabelText('Description')

    expect(textarea).toHaveAttribute('name', 'description')
    expect(textarea).toHaveAttribute('placeholder', 'Write something')
    expect(textarea).toHaveAttribute('maxlength', '500')
  })
})
