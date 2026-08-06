import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PasswordInput } from '@/components/ui/password-input'

describe('PasswordInput', () => {
  it('toggles between password and text without touching the value', () => {
    render(<PasswordInput aria-label="pw" defaultValue="hemligt123" required minLength={8} />)
    const input = screen.getByLabelText('pw') as HTMLInputElement
    expect(input.type).toBe('password')
    expect(input.required).toBe(true)
    expect(input.minLength).toBe(8)

    fireEvent.click(screen.getByRole('button', { name: 'Visa lösenord' }))
    expect(input.type).toBe('text')
    expect(input.value).toBe('hemligt123')
    expect(input.required).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Dölj lösenord' }))
    expect(input.type).toBe('password')
  })
})
