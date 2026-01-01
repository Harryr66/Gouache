import {
  Body,
  Button,
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

interface PurchaseConfirmationEmailProps {
  buyerName: string;
  itemTitle: string;
  itemType: 'Course' | 'Artwork' | 'Product' | 'course' | 'artwork' | 'product';
  formattedAmount: string;
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

export const PurchaseConfirmationEmail = ({
  buyerName = 'Customer',
  itemTitle = 'Your Purchase',
  itemType = 'product',
  formattedAmount = '$0.00',
  itemId,
  shippingAddress,
}: PurchaseConfirmationEmailProps) => {
  const itemTypeLabel = itemType === 'course' || itemType === 'Course' ? 'Course' : 
                        itemType === 'artwork' || itemType === 'Artwork' ? 'Artwork' : 'Product';
  
  const accessUrl = itemType === 'course' || itemType === 'Course' && itemId
    ? `https://www.gouache.art/learn/${itemId}/player`
    : 'https://www.gouache.art';

  return (
    <Html>
      <Head />
      <Preview>Thank you for your purchase on Gouache!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://www.gouache.art/assets/gouache-logo-light-20241111.png"
            width="150"
            height="32"
            alt="Gouache"
            style={logo}
          />
          
          <Heading style={h1}>Thank you for your purchase!</Heading>
          
          <Text style={text}>Hi {buyerName},</Text>
          
          <Text style={text}>
            Your order has been confirmed. Here are the details:
          </Text>

          <Section style={orderSection}>
            <Text style={orderDetail}>
              <strong>{itemTypeLabel}:</strong> {itemTitle}
            </Text>
            <Text style={orderDetail}>
              <strong>Amount:</strong> {formattedAmount}
            </Text>
          </Section>

          {shippingAddress && (
            <>
              <Hr style={hr} />
              <Section style={shippingSection}>
                <Text style={shippingTitle}>Shipping Address</Text>
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
            </>
          )}

          {(itemType === 'course' || itemType === 'Course') && itemId && (
            <Section style={buttonContainer}>
              <Button style={button} href={accessUrl}>
                Access Your Course
              </Button>
            </Section>
          )}

          <Text style={text}>
            Thank you for supporting artists on Gouache!
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            © 2026 Gouache. All rights reserved.
            <br />
            <Link href="https://www.gouache.art" style={link}>
              Visit Gouache
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PurchaseConfirmationEmail;

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

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '32px 32px 24px 32px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  margin: '16px 32px',
};

const orderSection = {
  margin: '24px 32px',
  padding: '0',
};

const orderDetail = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const shippingSection = {
  margin: '24px 32px',
  padding: '0',
};

const shippingTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const shippingDetail = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '4px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 32px',
};

const button = {
  backgroundColor: '#5e5ce6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
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

