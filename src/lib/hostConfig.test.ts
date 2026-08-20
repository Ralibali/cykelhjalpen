import { afterEach, describe, expect, it } from 'vitest'
import { getCurrentHost } from './hostConfig'

const originalLocation = window.location

function setHostname(hostname: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { hostname },
  })
}

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
})

describe('getCurrentHost', () => {
  it('treats Vercel preview hostnames as cykelhjalpen', () => {
    setHostname('cykelhjalpen-git-feat-abc.vercel.app')
    expect(getCurrentHost()).toBe('cykelhjalpen')
    setHostname('cykelhjalpen.vercel.app')
    expect(getCurrentHost()).toBe('cykelhjalpen')
    setHostname('project-abc123.vercel.app')
    expect(getCurrentHost()).toBe('cykelhjalpen')
  })

  it('defaults unknown hosts to cykelhjalpen', () => {
    setHostname('localhost')
    expect(getCurrentHost()).toBe('cykelhjalpen')
    setHostname('cykelhjalpen.se')
    expect(getCurrentHost()).toBe('cykelhjalpen')
  })

  it('only switches to updro for updro.se / updro.* hostnames', () => {
    setHostname('updro.se')
    expect(getCurrentHost()).toBe('updro')
    setHostname('www.updro.se')
    expect(getCurrentHost()).toBe('updro')
    setHostname('updro.example.com')
    expect(getCurrentHost()).toBe('updro')
  })
})
