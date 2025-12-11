'use server';

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.ADVERTISING_FROM_EMAIL || 'Gouache Ads <ads@example.com>';
const fallbackRecipient = 'news@gouache.art';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      website,
      advertisingType,
      budget,
      targetAudience,
      campaignGoals,
      message,
      timeline,
      applicationId,
      sendTo
    } = payload || {};

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY for advertising notifications.');
      return NextResponse.json(
        { error: 'Email provider not configured (RESEND_API_KEY missing).' },
        { status: 500 }
      );
    }

    const toAddress = sendTo || fallbackRecipient;
    const resend = new Resend(resendApiKey);

    const subject = `New Advertising Application${companyName ? ` - ${companyName}` : ''}`;
    const lines = [
      `<strong>Company:</strong> ${companyName || 'N/A'}`,
      `<strong>Contact:</strong> ${contactName || 'N/A'}`,
      `<strong>Email:</strong> ${email || 'N/A'}`,
      phone ? `<strong>Phone:</strong> ${phone}` : null,
      website ? `<strong>Website:</strong> ${website}` : null,
      advertisingType ? `<strong>Type:</strong> ${advertisingType}` : null,
      budget ? `<strong>Budget:</strong> ${budget}` : null,
      targetAudience ? `<strong>Target Audience:</strong> ${targetAudience}` : null,
      campaignGoals ? `<strong>Goals:</strong> ${campaignGoals}` : null,
      timeline ? `<strong>Timeline:</strong> ${timeline}` : null,
      message ? `<strong>Message:</strong> ${message}` : null,
      applicationId ? `<strong>Application ID:</strong> ${applicationId}` : null,
    ].filter(Boolean);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2 style="margin-bottom: 12px;">New Advertising Application</h2>
        <div style="line-height: 1.5;">
          ${lines.map((line) => `<p style="margin: 4px 0;">${line}</p>`).join('')}
        </div>
      </div>
    `;

    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject,
      html
    });

    if (!sendResult || sendResult.error) {
      console.error('Failed to send advertising notification email:', sendResult?.error);
      return NextResponse.json(
        { error: 'Failed to send advertising notification email.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, emailId: sendResult.data?.id ?? null });
  } catch (error) {
    console.error('Error in notify-advertising handler:', error);
    return NextResponse.json(
      { error: 'Failed to process advertising notification.', details: `${error}` },
      { status: 500 }
    );
  }
}

