import { Resend } from 'resend';
import { render } from '@react-email/components';
import { PurchaseConfirmationEmail as PurchaseConfirmationTemplate } from '@/emails/purchase-confirmation';
import { SellerNotificationEmail as SellerNotificationTemplate } from '@/emails/seller-notification';

export interface ErrorReportEmail {
  errorMessage: string;
  stack?: string;
  route: string;
  timestamp: string;
  userAgent: string;
  userContext: string;
  fix?: string;
}

export interface PurchaseConfirmationEmail {
  buyerEmail: string;
  buyerName: string;
  itemTitle: string;
  itemType: 'Course' | 'Artwork' | 'Product' | 'course' | 'artwork' | 'product';
  amount: number;
  currency: string;
  itemId?: string;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

export interface SellerNotificationEmail {
  sellerEmail: string;
  sellerName: string;
  buyerName: string;
  itemTitle: string;
  itemType: 'Course' | 'Artwork' | 'Product' | 'course' | 'artwork' | 'product';
  amount: number;
  currency: string;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

export async function sendPurchaseConfirmationEmail(data: PurchaseConfirmationEmail) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Gouache <hello@gouache.art>';
  
  if (!resendApiKey) {
    console.error('⚠️ Email not configured: RESEND_API_KEY required');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const resend = new Resend(resendApiKey);
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.amount / 100);

    // Render React Email template to HTML
    const emailHtml = await render(
      PurchaseConfirmationTemplate({
        buyerName: data.buyerName,
        itemTitle: data.itemTitle,
        itemType: data.itemType,
        formattedAmount,
        itemId: data.itemId,
      })
    );

    const result = await resend.emails.send({
      from: fromAddress,
      to: data.buyerEmail,
      subject: `Purchase Confirmation - ${data.itemTitle}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Failed to send email' };
    }

    console.log('✅ Purchase confirmation email sent:', result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('❌ Failed to send purchase confirmation email:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export async function sendSellerNotificationEmail(data: SellerNotificationEmail) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Gouache <hello@gouache.art>';
  
  if (!resendApiKey) {
    console.error('⚠️ Email not configured: RESEND_API_KEY required');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const resend = new Resend(resendApiKey);
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency.toUpperCase(),
    }).format(data.amount / 100);

    // Render React Email template to HTML
    const emailHtml = await render(
      SellerNotificationTemplate({
        sellerName: data.sellerName,
        buyerName: data.buyerName,
        itemTitle: data.itemTitle,
        itemType: data.itemType,
        formattedAmount,
      })
    );

    const result = await resend.emails.send({
      from: fromAddress,
      to: data.sellerEmail,
      subject: `🎉 You made a sale! - ${data.itemTitle}`,
      html: emailHtml,
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Failed to send email' };
    }

    console.log('✅ Seller notification email sent:', result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('❌ Failed to send seller notification email:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export async function sendErrorReportEmail(data: ErrorReportEmail) {
  const devEmail = process.env.DEV_EMAIL || 'dev@gouache.art';
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Hue <hue@gouache.art>';
  
  if (!resendApiKey) {
    console.error('⚠️ Email not configured: RESEND_API_KEY required');
    console.log('📧 Would send email to:', devEmail);
    console.log('📋 Error report:', data);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const resend = new Resend(resendApiKey);
    
    const emailBody = `
Hey gouache dev-team,

A user encountered an error on the platform. Here's the full report:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error Message: ${data.errorMessage}
Route: ${data.route}
Timestamp: ${data.timestamp}
User Agent: ${data.userAgent}

${data.stack ? `Stack Trace:\n${data.stack}` : 'No stack trace available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.userContext}

${data.fix ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUGGESTED FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.fix}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This report was automatically generated by Hue, the AI-powered error detection system.

`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #111827;">
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Hey gouache dev-team,</h2>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">A user encountered an error on the platform. Here's the full report:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="color: #ef4444; margin-top: 0; font-size: 18px; font-weight: 600;">ERROR DETAILS</h3>
          <p style="margin: 8px 0;"><strong>Error Message:</strong> ${data.errorMessage}</p>
          <p style="margin: 8px 0;"><strong>Route:</strong> ${data.route}</p>
          <p style="margin: 8px 0;"><strong>Timestamp:</strong> ${data.timestamp}</p>
          <p style="margin: 8px 0;"><strong>User Agent:</strong> ${data.userAgent}</p>
          ${data.stack ? `<pre style="background: #1f2937; color: #fff; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 12px;">${data.stack}</pre>` : '<p style="margin-top: 12px;">No stack trace available</p>'}
        </div>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #3b82f6; margin-top: 0; font-size: 18px; font-weight: 600;">USER CONTEXT</h3>
          <p style="white-space: pre-wrap; margin: 0;">${data.userContext}</p>
        </div>
        
        ${data.fix ? `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #10b981; margin-top: 0; font-size: 18px; font-weight: 600;">SUGGESTED FIX</h3>
          <pre style="background: #1f2937; color: #fff; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 12px;">${data.fix}</pre>
        </div>
        ` : ''}
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          This report was automatically generated by Hue, the AI-powered error detection system.
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: fromAddress,
      to: devEmail,
      subject: '🐛 Gouache App Bug + Fix',
      text: emailBody,
      html: html,
    });

    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Failed to send email' };
    }

    console.log('✅ Error report email sent:', result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('❌ Failed to send error report email:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
