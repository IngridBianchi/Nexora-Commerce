import { useCallback, useEffect, useState } from "react"

export type StorefrontUser = {
  email: string
  name: string
  emailVerified: boolean
}

export function useStorefrontUser() {
  const [storefrontUser, setStorefrontUser] = useState<StorefrontUser | null>(null)
  const [isLoadingStorefrontUser, setIsLoadingStorefrontUser] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadStorefrontUser() {
      try {
        const response = await fetch("/api/storefront/auth/me", { cache: "no-store" })
        if (!isMounted) {
          return
        }

        if (!response.ok) {
          setStorefrontUser(null)
          return
        }

        const data = (await response.json()) as {
          authenticated: boolean
          user?: StorefrontUser
        }

        if (data.authenticated && data.user) {
          setStorefrontUser(data.user)
        } else {
          setStorefrontUser(null)
        }
      } catch {
        if (isMounted) {
          setStorefrontUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingStorefrontUser(false)
        }
      }
    }

    void loadStorefrontUser()

    return () => {
      isMounted = false
    }
  }, [])

  const logoutStorefrontUser = useCallback(async () => {
    try {
      await fetch("/api/storefront/auth/logout", { method: "POST" })
    } finally {
      setStorefrontUser(null)
    }
  }, [])

  return {
    storefrontUser,
    isLoadingStorefrontUser,
    setStorefrontUser,
    logoutStorefrontUser
  }
}
