"use client"

import { Kbd } from "@/components/ui/kbd"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export default function AIAssistantHint() {
  return (
    <Card className="border-dashed border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            MemoSphere AI Assistant
          </p>
          <p className="text-xs text-muted-foreground">
            Press{" "}
            <Kbd>
              <span className="text-xs">Ctrl</span>
            </Kbd>{" "}
            +{" "}
            <Kbd>
              <span className="text-xs">K</span>
            </Kbd>{" "}
            to open AI overlay, or select text and press the shortcut
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
