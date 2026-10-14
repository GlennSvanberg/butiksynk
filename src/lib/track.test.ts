// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { trackEvent } from './track'

describe('trackEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubDom(script: HTMLScriptElement | null) {
    vi.stubGlobal('document', {
      querySelector: () => script,
      referrer: 'https://referrer.test/',
    })
    vi.stubGlobal('window', {
      innerWidth: 1200,
      location: {
        href: 'https://selio.test/app/varor',
        pathname: '/app/varor',
      },
    })
  }

  it('no-ops when the Trackaton script tag is absent', () => {
    stubDom(null)
    trackEvent('login_click')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts a custom event when the script tag is present', () => {
    const script = {
      getAttribute: (name: string) => {
        if (name === 'data-website-id') return 'test-site'
        if (name === 'data-endpoint') return 'https://example.com/api/e'
        return null
      },
    } as HTMLScriptElement
    stubDom(script)

    trackEvent('product_created')

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api/e',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    )
    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body)) as {
      websiteId: string
      type: string
      name: string
    }
    expect(body.websiteId).toBe('test-site')
    expect(body.type).toBe('custom')
    expect(body.name).toBe('product_created')
  })
})
