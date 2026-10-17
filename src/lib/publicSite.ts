/** Canonical origin for public pages, robots and sitemap. */
export const PUBLIC_SITE_ORIGIN = 'https://www.selio.se'

export function absolutePublicUrl(path: string): string {
  if (path === '/' || path === '') return `${PUBLIC_SITE_ORIGIN}/`
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${PUBLIC_SITE_ORIGIN}${normalized}`
}

/** Canonical link plus matching og:url for a public path. */
export function publicPageHead(path: string) {
  const href = absolutePublicUrl(path)
  return {
    meta: [{ property: 'og:url', content: href }],
    links: [{ rel: 'canonical' as const, href }],
  }
}
