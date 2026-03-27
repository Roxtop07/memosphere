import { NextRequest, NextResponse } from "next/server"
import PDFDocument from "pdfkit"

export async function POST(req: NextRequest) {
  try {
    const summary = await req.json()

    const doc = new PDFDocument({ autoFirstPage: true, margins: { top: 50, bottom: 50, left: 50, right: 50 } })
    const chunks: Uint8Array[] = []

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk))
    const ended = new Promise<void>((res) => doc.on("end", () => res()))

    // Title
    doc.fontSize(24).fillColor("#2563eb").text(summary.title, { align: "center" })
    doc.moveDown(0.5)

    // Description
    if (summary.description) {
      doc.fontSize(12).fillColor("#64748b").text(summary.description, { align: "center" })
      doc.moveDown()
    }

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    // Summary
    if (summary.summary) {
      doc.fontSize(16).fillColor("#1e293b").text("Summary", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor("#334155").text(summary.summary)
      doc.moveDown()
    }

    // Agenda
    if (summary.agenda && summary.agenda.length > 0) {
      doc.fontSize(16).fillColor("#1e293b").text("Agenda", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor("#334155")
      summary.agenda.forEach((item: string, index: number) => {
        doc.text(`${index + 1}. ${item}`)
        doc.moveDown(0.3)
      })
      doc.moveDown()
    }

    // Key Points
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      doc.fontSize(16).fillColor("#1e293b").text("Key Points", { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor("#334155")
      summary.keyPoints.forEach((point: string) => {
        doc.text(`• ${point}`)
        doc.moveDown(0.3)
      })
      doc.moveDown()
    }

    // Action Items
    if (summary.actionItems && summary.actionItems.length > 0) {
      doc.fontSize(16).fillColor("#1e293b").text("Action Items", { underline: true })
      doc.moveDown(0.5)
      summary.actionItems.forEach((item: any, index: number) => {
        doc.fontSize(11).fillColor("#0f172a").font("Helvetica-Bold").text(`${index + 1}. ${item.action}`)
        doc.font("Helvetica")
        if (item.owner) {
          doc.fontSize(10).fillColor("#64748b").text(`   Owner: ${item.owner}`)
        }
        if (item.dueDate) {
          doc.fontSize(10).fillColor("#64748b").text(`   Due: ${item.dueDate}`)
        }
        if (item.priority) {
          doc.fontSize(10).fillColor("#64748b").text(`   Priority: ${item.priority}`)
        }
        doc.moveDown(0.5)
      })
      doc.moveDown()
    }

    // Decisions
    if (summary.decisions && summary.decisions.length > 0) {
      doc.fontSize(16).fillColor("#1e293b").text("Decisions", { underline: true })
      doc.moveDown(0.5)
      summary.decisions.forEach((decision: any, index: number) => {
        doc.fontSize(11).fillColor("#0f172a").font("Helvetica-Bold").text(`${index + 1}. ${decision.decision}`)
        doc.font("Helvetica")
        if (decision.rationale) {
          doc.fontSize(10).fillColor("#64748b").text(`   Rationale: ${decision.rationale}`)
        }
        if (decision.owner) {
          doc.fontSize(10).fillColor("#64748b").text(`   Owner: ${decision.owner}`)
        }
        doc.moveDown(0.5)
      })
      doc.moveDown()
    }

    // Metadata footer
    doc.moveDown(2)
    doc.fontSize(8).fillColor("#94a3b8").text(
      `Generated: ${new Date(summary.metadata.generatedAt).toLocaleString()} | Sources: ${summary.metadata.totalSources} | Words: ${summary.metadata.wordCount}`,
      { align: "center" }
    )

    doc.end()
    await ended

    const pdfBuffer = Buffer.concat(chunks)

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${summary.title.replace(/\s+/g, "_")}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    })
  } catch (error: any) {
    console.error("[export-summary] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export summary" },
      { status: 500 }
    )
  }
}
