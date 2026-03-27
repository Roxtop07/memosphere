import emailjs from '@emailjs/browser'

// EmailJS Configuration
// Sign up at https://www.emailjs.com/ and get your keys
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_default'
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_default'
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY'

// Initialize EmailJS (optional, but recommended)
export const initEmailJS = () => {
  if (EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY)
  }
}

interface SendInviteEmailParams {
  toEmail: string
  toName: string
  inviteCode: string
  orgName: string
  orgCode: string
  role: string
  invitedBy: string
  expiresAt: string
}

export const sendInviteEmail = async (params: SendInviteEmailParams): Promise<boolean> => {
  try {
    // Check if EmailJS is configured
    if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      console.warn('EmailJS not configured. Email not sent.')
      // Fallback: Show invitation details in console for development
      console.log('📧 Invitation Email (Development Mode):')
      console.log('━'.repeat(50))
      console.log(`To: ${params.toEmail}`)
      console.log(`Organization: ${params.orgName}`)
      console.log(`Invite Code: ${params.inviteCode}`)
      console.log(`Role: ${params.role}`)
      console.log(`Expires: ${params.expiresAt}`)
      console.log('━'.repeat(50))
      
      // For development, show a modal or notification with the invite code
      return false // Return false to indicate email wasn't actually sent
    }

    // Prepare email template parameters
    const templateParams = {
      to_email: params.toEmail,
      to_name: params.toName || params.toEmail.split('@')[0],
      invite_code: params.inviteCode,
      org_name: params.orgName,
      org_code: params.orgCode,
      role: params.role.charAt(0).toUpperCase() + params.role.slice(1),
      invited_by: params.invitedBy,
      expires_at: new Date(params.expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      app_url: window.location.origin,
    }

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    )

    if (response.status === 200) {
      console.log('✅ Invitation email sent successfully!')
      return true
    } else {
      console.error('❌ Failed to send invitation email:', response)
      return false
    }
  } catch (error) {
    console.error('❌ Error sending invitation email:', error)
    return false
  }
}

// Fallback email template (for copying to clipboard or displaying)
export const generateInviteEmailText = (params: SendInviteEmailParams): string => {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 You're Invited to Join ${params.orgName}!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello ${params.toName || params.toEmail}!

${params.invitedBy} has invited you to join their organization on our platform.

📋 Invitation Details:
   • Organization: ${params.orgName}
   • Organization Code: ${params.orgCode}
   • Your Role: ${params.role.charAt(0).toUpperCase() + params.role.slice(1)}
   • Invited By: ${params.invitedBy}

🔑 Your Invitation Code:
   ${params.inviteCode}

⏰ This invitation expires on: ${new Date(params.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}

🚀 To Accept This Invitation:
   1. Visit: ${typeof window !== 'undefined' ? window.location.origin : 'our application'}
   2. Click "Register" or "Join Organization"
   3. Enter the invitation code: ${params.inviteCode}
   4. Complete your registration

If you have any questions, please contact ${params.invitedBy}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `
}
