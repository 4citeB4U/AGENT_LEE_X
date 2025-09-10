/// <reference types="vitest" />
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, screen } from '@testing-library/react'
import { SettingsPanel } from '../../src/components/agent-lee/SettingsPanel'

describe('SettingsPanel', () => {
  it('renders settings button trigger', () => {
    render(<SettingsPanel />)
    const btn = screen.getByRole('button', { name: /settings/i })
    expect(btn).toBeInTheDocument()
  })
})
