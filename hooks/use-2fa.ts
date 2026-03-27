"use client"

import { useState, useCallback } from "react"

export interface TwoFAState {
  isEnabled: boolean
  secret?: string
  verified: boolean
}

export function use2FA() {
  const [twoFAState, setTwoFAState] = useState<TwoFAState>({
    isEnabled: false,
    verified: false,
  })

  // Mock function - in production, would use totp library or backend
  const generateSecret = useCallback(() => {
    // Generate a random 6-digit code for mock purposes
    const secret = Math.random().toString(36).substring(2, 8).toUpperCase()
    setTwoFAState((prev) => ({ ...prev, secret, isEnabled: false }))
    return secret
  }, [])

  const verififyCode = useCallback((code: string): boolean => {
    // Mock verification - in production, would validate against stored secret using TOTP
    // For demo purposes, we'll accept "123456" or any 6-digit code starting with "1"
    const isValid = /^\d{6}$/.test(code) && (code === "123456" || code.startsWith("1"))
    if (isValid) {
      setTwoFAState((prev) => ({
        ...prev,
        verified: true,
        isEnabled: true,
      }))
    }
    return isValid
  }, [])

  const resetVerification = useCallback(() => {
    setTwoFAState({
      isEnabled: false,
      verified: false,
    })
  }, [])

  return {
    twoFAState,
    generateSecret,
    verififyCode,
    resetVerification,
  }
}
