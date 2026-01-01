import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface SellerNotificationEmailProps {
  sellerName: string;
  buyerName: string;
  itemTitle: string;
  itemType: 'Course' | 'Artwork' | 'Product' | 'course' | 'artwork' | 'product';
  formattedAmount: string;
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

export const SellerNotificationEmail = ({
  sellerName = 'Artist',
  buyerName = 'Customer',
  itemTitle = 'Your Item',
  itemType = 'product',
  formattedAmount = '$0.00',
  shippingAddress,
}: SellerNotificationEmailProps) => {
  const itemTypeLabel = itemType === 'course' || itemType === 'Course' ? 'course' : 
                        itemType === 'artwork' || itemType === 'Artwork' ? 'artwork' : 'product';

  return (
    <Html>
      <Head />
      <Preview>🎉 You made a sale on Gouache!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://www.gouache.art/assets/gouache-logo-light-20241111.png"
            width="150"
            height="32"
            alt="Gouache"
            style={logo}
          />
          
          <div style={celebrationBanner}>
            <Text style={celebrationEmoji}>🎉</Text>
            <Heading style={h1}>Congratulations!</Heading>
            <Text style={celebrationText}>You just made a sale!</Text>
          </div>
          
          <Text style={text}>Hi {sellerName},</Text>
          
          <Text style={text}>
            Great news! <strong>{buyerName}</strong> just purchased your {itemTypeLabel}:
          </Text>

          <Section style={saleBox}>
            <Text style={saleTitle}>Sale Details</Text>
            <Hr style={hr} />
            <Text style={itemTitleStyle}>
              "{itemTitle}"
            </Text>
            <Text style={amountStyle}>
              {formattedAmount}
            </Text>
          </Section>

          {shippingAddress && (
            <Section style={shippingBox}>
              <Text style={shippingTitle}>📦 Ship To</Text>
              <Hr style={hr} />
              <Text style={shippingDetail}>{shippingAddress.name}</Text>
              <Text style={shippingDetail}>{shippingAddress.line1}</Text>
              {shippingAddress.line2 && (
                <Text style={shippingDetail}>{shippingAddress.line2}</Text>
              )}
              <Text style={shippingDetail}>
                {shippingAddress.city}
                {shippingAddress.state && `, ${shippingAddress.state}`}
                {shippingAddress.postalCode && ` ${shippingAddress.postalCode}`}
              </Text>
              <Text style={shippingDetail}>{shippingAddress.country}</Text>
            </Section>
          )}

          <Section style={infoBox}>
            <Text style={infoText}>
              💰 The payment will be transferred to your Stripe account according to your payout schedule.
            </Text>
            {shippingAddress && (
              <Text style={infoText}>
                📦 Please ship the item to the address above as soon as possible.
              </Text>
            )}
            <Text style={infoText}>
              📊 You can view all your sales and earnings in your Gouache dashboard.
            </Text>
          </Section>

          <Text style={text}>
            Keep up the great work! Your art is making a difference.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            © 2026 Gouache. All rights reserved.
            <br />
            <Link href="https://www.gouache.art/profile" style={link}>
              View Your Dashboard
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SellerNotificationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logo = {
  margin: '0 auto',
  display: 'block',
  marginTop: '32px',
  marginBottom: '32px',
};

const celebrationBanner = {
  backgroundColor: '#f0fdf4',
  borderRadius: '12px',
  margin: '32px 32px',
  padding: '32px',
  textAlign: 'center' as const,
};

const celebrationEmoji = {
  fontSize: '48px',
  margin: '0',
  lineHeight: '1',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '16px 0 8px 0',
  padding: '0',
};

const celebrationText = {
  color: '#10b981',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  margin: '16px 32px',
};

const saleBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  borderLeft: '4px solid #10b981',
  margin: '32px 32px',
  padding: '24px',
};

const saleTitle = {
  color: '#10b981',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const itemTitleStyle = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '8px 0',
};

const amountStyle = {
  color: '#10b981',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '12px 0 0 0',
};

const shippingBox = {
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  borderLeft: '4px solid #f97316',
  margin: '32px 32px',
  padding: '24px',
};

const shippingTitle = {
  color: '#f97316',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const shippingDetail = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '4px 0',
};

const infoBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  margin: '32px 32px',
  padding: '20px',
};

const infoText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '32px 32px',
};

const link = {
  color: '#5e5ce6',
  textDecoration: 'underline',
};

