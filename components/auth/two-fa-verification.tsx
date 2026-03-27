"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Shield, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { fadeInUpVariants } from "@/lib/animations"

interface TwoFAVerificationProps {
  email: string
  onVerify: (code: string) => boolean
  onCancel: () => void
  isLoading?: boolean
}

export default function TwoFAVerification({ email, onVerify, onCancel, isLoading = false }: TwoFAVerificationProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [codeInput, setCodeInput] = useState(["", "", "", "", "", ""])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.split("").slice(0, 6 - index)
      const newCodeInput = [...codeInput]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCodeInput[index + i] = digit
        }
      })
      setCodeInput(newCodeInput)
      setCode(newCodeInput.join(""))
    } else if (/^\d*$/.test(value)) {
      const newCodeInput = [...codeInput]
      newCodeInput[index] = value
      setCodeInput(newCodeInput)
      setCode(newCodeInput.join(""))

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleBackspace = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeInput[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (code.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    const isValid = onVerify(code)
    if (isValid) {
      setSuccess(true)
    } else {
      setError("Invalid verification code. Try again.")
      setCodeInput(["", "", "", "", "", ""])
      setCode("")
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUpVariants}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background"
    >
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-center">Enter the 6-digit code from your authenticator app</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Verification Successful</h3>
                <p className="text-sm text-muted-foreground">Your account is now secured</p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  Account
                </Label>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Verification Code</Label>
                <div className="flex gap-2 justify-between">
                  {codeInput.map((digit, index) => (
                    <motion.input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleBackspace(index, e)}
                      className="w-12 h-12 text-center text-2xl font-semibold border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      whileFocus={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                For demo: use code <span className="font-mono font-semibold">123456</span>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
