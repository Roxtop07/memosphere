import PDFDocument from 'pdfkit'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      title = 'Meeting Transcript', 
      description = '',
      summary = '',
      agenda = [],
      discussions = [],
      decisions = [],
      transcript = '' 
    } = body

    const doc = new PDFDocument({ autoFirstPage: true })
    const chunks: Uint8Array[] = []

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    const ended = new Promise<void>((res) => doc.on('end', () => res()))

    // Title
    doc.fontSize(24).fillColor('#2563eb').text(title, { align: 'center' })
    doc.moveDown(0.5)
    
    // Description
    if (description) {
      doc.fontSize(12).fillColor('#64748b').text(description, { align: 'center' })
      doc.moveDown()
    }
    
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown()

    // Summary
    if (summary) {
      doc.fontSize(16).fillColor('#1e293b').text('Summary', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#334155').text(summary)
      doc.moveDown()
    }

    // Agenda
    if (agenda && agenda.length > 0) {
      doc.fontSize(16).fillColor('#1e293b').text('Agenda', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#334155')
      agenda.forEach((item: string, index: number) => {
        doc.text(`${index + 1}. ${item}`)
        doc.moveDown(0.3)
      })
      doc.moveDown()
    }

    // Discussions
    if (discussions && discussions.length > 0) {
      doc.fontSize(16).fillColor('#1e293b').text('Discussions', { underline: true })
      doc.moveDown(0.5)
      discussions.forEach((discussion: any, index: number) => {
        doc.fontSize(12).fillColor('#0f172a').font('Helvetica-Bold').text(`${index + 1}. ${discussion.topic || 'Discussion'}`)
        doc.font('Helvetica')
        doc.moveDown(0.3)
        if (discussion.points && discussion.points.length > 0) {
          discussion.points.forEach((point: string) => {
            doc.fontSize(11).fillColor('#475569').text(`   • ${point}`)
            doc.moveDown(0.2)
          })
        }
        doc.moveDown(0.5)
      })
      doc.moveDown()
    }

    // Decisions
    if (decisions && decisions.length > 0) {
      doc.fontSize(16).fillColor('#1e293b').text('Decisions', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#334155')
      decisions.forEach((decision: any, index: number) => {
        doc.fontSize(11).fillColor('#0f172a').text(`${index + 1}. ${decision.decision || decision}`)
        if (decision.owner) {
          doc.fontSize(10).fillColor('#64748b').text(`   Owner: ${decision.owner}`)
        }
        if (decision.dueDate) {
          doc.fontSize(10).fillColor('#64748b').text(`   Due Date: ${decision.dueDate}`)
        }
        doc.moveDown(0.5)
      })
    }

    doc.end()
    await ended

    const pdfBuffer = Buffer.concat(chunks)

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('[meetings/generate-pdf] error', err)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
