"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Loader2 } from "lucide-react"
import { fadeInUpVariants } from "@/lib/animations"

interface AIGreetingProps {
  userName: string
  role: "admin" | "manager" | "viewer"
}

export default function AIGreeting({ userName, role }: AIGreetingProps) {
  const [greeting, setGreeting] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateGreeting = async () => {
      try {
        // Determine time period for greeting personalization
        const hour = new Date().getHours()
        let timePeriod = "morning"
        if (hour >= 12 && hour < 17) timePeriod = "afternoon"
        if (hour >= 17 || hour < 5) timePeriod = "evening"

        const response = await fetch("/api/generate-greeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName,
            role,
            time: timePeriod,
          }),
        })

        if (!response.ok) throw new Error("Failed to generate greeting")
        const data = await response.json()
        setGreeting(data.greeting)
      } catch (error) {
        console.error("Error:", error)
        // Fallback greeting
        setGreeting(`Welcome back, ${userName}! Ready to manage your day?`)
      } finally {
        setLoading(false)
      }
    }

    generateGreeting()
  }, [userName, role])

  return (
    <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible">
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3 }}
              className="mt-1"
            >
              <Sparkles className="w-6 h-6 text-accent" />
            </motion.div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                Welcome, {userName}
              </h2>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm">Generating your greeting...</p>
                </div>
              ) : (
                <motion.p
                  className="text-sm text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {greeting}
                </motion.p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
