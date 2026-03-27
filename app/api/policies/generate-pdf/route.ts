import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'

export async function POST(request: NextRequest) {
  try {
    const { policy } = await request.json()
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 })
    const buffers: Uint8Array[] = []
    
    doc.on('data', (chunk) => buffers.push(chunk))
    
    // Header with logo space
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text('MEMOSPHERE', 50, 50)
    
    doc.fontSize(20)
       .fillColor('#000')
       .text(policy.title, 50, 100)
    
    // Policy details
    doc.fontSize(12)
       .fillColor('#666')
       .text(`Category: ${policy.category}`, 50, 140)
       .text(`Version: ${policy.version}`, 50, 160)
       .text(`Last Updated: ${policy.updated}`, 50, 180)
    
    if (policy.department) {
      doc.text(`Department: ${policy.department}`, 50, 200)
    }
    
    if (policy.isEncrypted) {
      doc.fillColor('#16a34a')
         .text('🔒 This document is encrypted for security', 50, 220)
    }
    
    // Description
    if (policy.description) {
      doc.fontSize(14)
         .fillColor('#000')
         .text('Policy Description:', 50, 260)
         .fontSize(12)
         .fillColor('#333')
         .text(policy.description, 50, 285, { 
           width: 500, 
           align: 'justify' 
         })
    }
    
    // Footer
    doc.fontSize(10)
       .fillColor('#999')
       .text(
         `Generated on ${new Date().toLocaleString()}`,
         50,
         doc.page.height - 100,
         { align: 'center', width: doc.page.width - 100 }
       )
    
    doc.end()
    
    return new Promise<NextResponse>((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        
        resolve(new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${policy.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`
          }
        }))
      })
    })
    
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}