/**
 * Trackaton custom events — same payload shape as https://www.trackaton.com/track.js
 * (`type: "custom"`). The script does not expose a global API; clicks can also use the
 * `trackaton-on-click` attribute. This helper reads `data-website-id` / `data-endpoint`
 * from the script tag and no-ops when missing (SSR, tests, or script not in the document).
 */

const TRACK_SCRIPT_SELECTOR =
  'script[src*="trackaton.com/track.js"][data-website-id][data-endpoint]'

const DEMO_LOGIN_TRACK_KEY = 'selio:track:pending_demo_login_success'

export type TrackEventName =
  | 'signup_click'
  | 'login_click'
  | 'login_success'
  | 'demo_start'
  | 'product_created'

export type TrackEventProps = {
  signup_click?: Record<string, never>
  login_click?: Record<string, never>
  login_success?: { demo?: boolean }
  demo_start?: Record<string, never>
  product_created?: Record<string, never>
}

type TrackConfig = {
  websiteId: string
  endpoint: string
}

function readTrackConfig(): TrackConfig | null {
  if (typeof document === 'undefined') {
    return null
  }
  const el = document.querySelector(TRACK_SCRIPT_SELECTOR)
  if (!el) {
    return null
  }
  const websiteId = el.getAttribute('data-website-id')
  const endpoint = el.getAttribute('data-endpoint')
  if (!websiteId || !endpoint) {
    return null
  }
  return { websiteId, endpoint }
}

function technicalMetadata(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}
  }
  const width = window.innerWidth
  let deviceType = 'desktop'
  if (width < 768) {
    deviceType = 'mobile'
  } else if (width < 1024) {
    deviceType = 'tablet'
  }
  let screenCategory = '<768'
  if (width >= 1024) {
    screenCategory = '>=1024'
  } else if (width >= 768) {
    screenCategory = '768-1023'
  }
  return {
    device_type: deviceType,
    screen_category: screenCategory,
  }
}

function utmMetadata(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}
  }
  const url = new URL(window.location.href)
  const utmParams: Record<string, string> = {}
  for (const param of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ]) {
    const val = url.searchParams.get(param)
    if (val) {
      utmParams[param] = val
    }
  }
  return utmParams
}

/** Call before demo `persistDemoSession` reload so the next `finishLogin` can tag success. */
export function markPendingDemoLoginSuccess(): void {
  try {
    sessionStorage.setItem(DEMO_LOGIN_TRACK_KEY, '1')
  } catch {
    // ignore
  }
}

export function consumePendingDemoLoginSuccess(): boolean {
  try {
    const v = sessionStorage.getItem(DEMO_LOGIN_TRACK_KEY)
    if (v) {
      sessionStorage.removeItem(DEMO_LOGIN_TRACK_KEY)
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function trackEvent<TEvent extends TrackEventName>(
  name: TEvent,
  props?: TrackEventProps[TEvent],
): void {
  const config = readTrackConfig()
  if (!config || typeof window === 'undefined') {
    return
  }

  const metadata = {
    ...technicalMetadata(),
    ...(props ?? {}),
    ...utmMetadata(),
    url: window.location.href,
    path: window.location.pathname,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
  }

  const payload = {
    websiteId: config.websiteId,
    type: 'custom',
    name,
    metadata,
  }

  try {
    void fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore
  }
}
