import * as React from 'react'
import type { Id } from '../../convex/_generated/dataModel'

const STORAGE_KEY = 'selio_shop_session'

export type ShopSession = {
  shopId: Id<'shops'>
  shopName: string
  shopSlug: string
}

export function readShopSession(): ShopSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShopSession
    if (
      typeof parsed.shopId === 'string' &&
      typeof parsed.shopName === 'string' &&
      typeof parsed.shopSlug === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function writeShopSession(session: ShopSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearShopSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

type ShopSessionContextValue = {
  session: ShopSession | null
  setSession: (s: ShopSession | null) => void
}

const ShopSessionContext = React.createContext<ShopSessionContextValue | null>(
  null,
)

export function ShopSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, setSessionState] = React.useState<ShopSession | null>(() =>
    typeof window !== 'undefined' ? readShopSession() : null,
  )

  const setSession = React.useCallback((s: ShopSession | null) => {
    if (s === null) {
      clearShopSession()
    } else {
      writeShopSession(s)
    }
    setSessionState(s)
  }, [])

  const value = React.useMemo(
    () => ({ session, setSession }),
    [session, setSession],
  )

  return (
    <ShopSessionContext.Provider value={value}>
      {children}
    </ShopSessionContext.Provider>
  )
}

export function useShopSession(): ShopSessionContextValue {
  const ctx = React.useContext(ShopSessionContext)
  if (!ctx) {
    throw new Error('useShopSession must be used within ShopSessionProvider')
  }
  return ctx
}
