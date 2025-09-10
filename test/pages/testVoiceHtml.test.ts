/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('public smoke page', () => {
  it('test-voice-llm.html exists and contains expected title', () => {
    const p = resolve(process.cwd(), 'public', 'test-voice-llm.html')
    const s = readFileSync(p, 'utf8')
    expect(s).toMatch(/Agent Lee \u2014 Voice \+ LLM Smoke Test/)
  })
})
