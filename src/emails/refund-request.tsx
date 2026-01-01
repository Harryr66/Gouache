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

interface RefundRequestEmailProps {
  sellerName: string;
  buyerName: string;
  buyerEmail: string;
  itemTitle: string;
  orderId: string;
  orderType: string;
  formattedAmount: string;
  reason: string;
}

export const RefundRequestEmail = ({
  sellerName = 'Seller',
  buyerName = 'Customer',
  buyerEmail = 'customer@example.com',
  itemTitle = 'Item',
  orderId = 'ORDER-123',
  orderType = 'product',
  formattedAmount = '$0.00',
  reason = 'No reason provided',
}: RefundRequestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Refund request for {itemTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://www.gouache.art/assets/gouache-logo-light-20241111.png"
            width="150"
            height="32"
            alt="Gouache"
            style={logo}
          />
          
          <Heading style={h1}>Refund Request Received</Heading>
          
          <Text style={text}>Hi {sellerName},</Text>
          
          <Text style={text}>
            A customer has requested a refund for one of your items. Please review the details below:
          </Text>

          <Section style={orderBox}>
            <Text style={orderTitle}>Order Details</Text>
            <Hr style={hr} />
            <Text style={orderDetail}>
              <strong>Item:</strong> {itemTitle}
            </Text>
            <Text style={orderDetail}>
              <strong>Type:</strong> {orderType === 'product' ? 'Product' : orderType === 'course' ? 'Course' : 'Artwork'}
            </Text>
            <Text style={orderDetail}>
              <strong>Amount:</strong> {formattedAmount}
            </Text>
            <Text style={orderDetail}>
              <strong>Order ID:</strong> {orderId}
            </Text>
          </Section>

          <Section style={customerBox}>
            <Text style={customerTitle}>Customer Information</Text>
            <Hr style={hr} />
            <Text style={orderDetail}>
              <strong>Name:</strong> {buyerName}
            </Text>
            <Text style={orderDetail}>
              <strong>Email:</strong> {buyerEmail}
            </Text>
          </Section>

          <Section style={reasonBox}>
            <Text style={reasonTitle}>Reason for Refund</Text>
            <Hr style={hr} />
            <Text style={reasonText}>"{reason}"</Text>
          </Section>

          <Text style={text}>
            <strong>Next Steps:</strong>
          </Text>
          <Text style={text}>
            1. Review the refund request reason carefully<br />
            2. Contact the customer directly at {buyerEmail} if you need more information<br />
            3. Process the refund through your Business Dashboard on Gouache<br />
            4. Respond to the customer within 48 hours
          </Text>

          <Text style={actionText}>
            You can process this refund from your{' '}
            <Link href="https://www.gouache.art/profile?tab=business" style={link}>
              Business Dashboard
            </Link>
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

export default RefundRequestEmail;

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
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '30px 0',
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

const actionText = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  margin: '24px 32px',
};

const orderBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  margin: '32px 32px',
  padding: '24px',
};

const customerBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  margin: '32px 32px',
  padding: '24px',
  borderLeft: '4px solid #5e5ce6',
};

const reasonBox = {
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  margin: '32px 32px',
  padding: '24px',
  borderLeft: '4px solid #f59e0b',
};

const orderTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const customerTitle = {
  color: '#5e5ce6',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const reasonTitle = {
  color: '#f59e0b',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const orderDetail = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const reasonText = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  fontStyle: 'italic' as const,
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

