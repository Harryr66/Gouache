import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Force this route to be dynamic (not prerendered at build time)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, reportId } = body;

    // Verify admin authentication (you should implement proper admin auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Implement actual email sending via SendGrid, AWS SES, or other email service
    // For now, this is a placeholder that logs the email
    console.log('[Admin Email] Sending email:', {
      to,
      subject,
      body: emailBody,
      reportId,
    });

    // Example with SendGrid (you would need to install @sendgrid/mail):
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
      to,
      from: process.env.ADMIN_EMAIL,
      subject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>'),
    });
    */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
