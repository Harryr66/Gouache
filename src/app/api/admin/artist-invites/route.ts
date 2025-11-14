import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromAddress =
  process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache Invitations <invite@example.com>';
const inviteTemplateId = process.env.ARTIST_INVITE_TEMPLATE_ID;
const inviteTemplateAlias = process.env.ARTIST_INVITE_TEMPLATE_ALIAS;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, inviteUrl, message } = body as {
      email?: string;
      name?: string;
      inviteUrl?: string;
      message?: string;
    };

    if (!email || !inviteUrl) {
      return NextResponse.json({ error: 'Email and inviteUrl are required.' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY environment variable.');
      return NextResponse.json(
        {
          error: 'Email provider not configured. Please set RESEND_API_KEY on the server.'
        },
        { status: 500 }
      );
    }

    // Validate from address format
    if (!defaultFromAddress || defaultFromAddress === 'Gouache Invitations <invite@example.com>') {
      console.warn('Using default/placeholder from address. Set ARTIST_INVITE_FROM_EMAIL environment variable.');
    }

    const resend = new Resend(resendApiKey);
    const recipientName = name || 'there';
    const inviteMessage =
      message ||
      "We've created an artist onboarding link for you on Gouache. Click below to start setting up your profile.";

    const payloadBase = {
      from: defaultFromAddress,
      to: email,
      subject: 'Your Gouache artist onboarding invitation'
    } as const;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">You're invited to join Gouache</h1>
        <p style="font-size: 16px; line-height: 1.5;">Hi ${recipientName},</p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 16px;">${inviteMessage}</p>
        <p style="margin: 24px 0;">
          <a
            href="${inviteUrl}"
            style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 20px; border-radius: 999px; font-weight: 600; text-decoration: none;"
          >
            Start Artist Onboarding
          </a>
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
          If the button above does not work, copy and paste this link into your browser:<br />
          <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
        </p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 32px;">We’re excited to see your work!</p>
        <p style="font-size: 16px; font-weight: 600;">Team Gouache</p>
      </div>
    `;

    let sendResult;
    try {
      sendResult = await resend.emails.send({
        ...payloadBase,
        html
      });
    } catch (resendError: any) {
      console.error('Resend API call failed:', {
        error: resendError,
        message: resendError?.message,
        code: resendError?.code,
        statusCode: resendError?.statusCode,
        response: resendError?.response
      });
      return NextResponse.json(
        {
          error: 'Failed to send artist invite email.',
          details: resendError?.message || resendError?.toString() || 'Resend API call failed',
          code: resendError?.code,
          statusCode: resendError?.statusCode
        },
        { status: 502 }
      );
    }

    if (!sendResult || sendResult.error) {
      const errorDetails = sendResult?.error;
      const message = errorDetails?.message ?? 'Unknown error while sending invite email.';
      console.error('Resend email send error:', {
        error: errorDetails,
        message,
        fullResponse: sendResult
      });
      return NextResponse.json(
        {
          error: 'Failed to send artist invite email.',
          details: message,
          code: (errorDetails as any)?.name || (errorDetails as any)?.code
        },
        { status: 502 }
      );
    }

    console.log('Artist invite email queued:', sendResult.data?.id);

    return NextResponse.json({ success: true, emailId: sendResult.data?.id ?? null });
  } catch (error) {
    console.error('Failed to send artist invite email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send artist invite email.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
