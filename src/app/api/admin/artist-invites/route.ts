import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromAddress =
  process.env.ARTIST_INVITE_FROM_EMAIL || 'Gouache Invitations <no-reply@gouache.art>';
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

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY environment variable.');
      return NextResponse.json(
        {
          error: 'Email provider not configured. Please set RESEND_API_KEY on the server.'
        },
        { status: 500 }
      );
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

    if (inviteTemplateId || inviteTemplateAlias) {
      await resend.emails.send({
        ...payloadBase,
        ...(inviteTemplateId ? { template_id: inviteTemplateId } : {}),
        ...(inviteTemplateAlias ? { template_alias: inviteTemplateAlias } : {}),
        personalizations: [
          {
            data: {
              invite_url: inviteUrl,
              artist_name: name ?? '',
              custom_message: message ?? '',
              greeting_name: recipientName
            }
          }
        ]
      });
    } else {
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

      await resend.emails.send({
        ...payloadBase,
        html
      });
    }

    return NextResponse.json({ success: true });
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
