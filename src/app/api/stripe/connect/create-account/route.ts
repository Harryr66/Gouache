import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

// Map country names to ISO 3166-1 alpha-2 country codes (Stripe format)
const COUNTRY_NAME_TO_CODE: { [key: string]: string } = {
  'United States': 'US',
  'United Kingdom': 'GB',
  'Canada': 'CA',
  'Australia': 'AU',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Ireland': 'IE',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Slovenia': 'SI',
  'Slovakia': 'SK',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Japan': 'JP',
  'South Korea': 'KR',
  'China': 'CN',
  'India': 'IN',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  'New Zealand': 'NZ',
  'South Africa': 'ZA',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Uruguay': 'UY',
  'Ecuador': 'EC',
  'Venezuela': 'VE',
  'Panama': 'PA',
  'Costa Rica': 'CR',
  'Guatemala': 'GT',
  'Israel': 'IL',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  'Qatar': 'QA',
  'Kuwait': 'KW',
  'Bahrain': 'BH',
  'Oman': 'OM',
  'Jordan': 'JO',
  'Lebanon': 'LB',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Tunisia': 'TN',
  'Turkey': 'TR',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'Belarus': 'BY',
  'Iceland': 'IS',
  'Liechtenstein': 'LI',
  'Monaco': 'MC',
  'Andorra': 'AD',
  'San Marino': 'SM',
  'Vatican City': 'VA',
  'Albania': 'AL',
  'Bosnia and Herzegovina': 'BA',
  'Serbia': 'RS',
  'Montenegro': 'ME',
  'North Macedonia': 'MK',
  'Kosovo': 'XK',
  'Moldova': 'MD',
  'Georgia': 'GE',
  'Armenia': 'AM',
  'Azerbaijan': 'AZ',
  'Kazakhstan': 'KZ',
  'Uzbekistan': 'UZ',
  'Kyrgyzstan': 'KG',
  'Tajikistan': 'TJ',
  'Turkmenistan': 'TM',
  'Mongolia': 'MN',
  'Nepal': 'NP',
  'Bhutan': 'BT',
  'Bangladesh': 'BD',
  'Sri Lanka': 'LK',
  'Maldives': 'MV',
  'Myanmar': 'MM',
  'Cambodia': 'KH',
  'Laos': 'LA',
  'Brunei': 'BN',
  'East Timor': 'TL',
  'Papua New Guinea': 'PG',
  'Fiji': 'FJ',
  'Samoa': 'WS',
  'Tonga': 'TO',
  'Vanuatu': 'VU',
  'Solomon Islands': 'SB',
  'Palau': 'PW',
  'Micronesia': 'FM',
  'Marshall Islands': 'MH',
  'Kiribati': 'KI',
  'Tuvalu': 'TV',
  'Nauru': 'NR',
  'Mauritius': 'MU',
  'Seychelles': 'SC',
  'Madagascar': 'MG',
  'Kenya': 'KE',
  'Tanzania': 'TZ',
  'Uganda': 'UG',
  'Rwanda': 'RW',
  'Ethiopia': 'ET',
  'Ghana': 'GH',
  'Nigeria': 'NG',
  'Senegal': 'SN',
  'Ivory Coast': 'CI',
  'Cameroon': 'CM',
  'Gabon': 'GA',
  'Botswana': 'BW',
  'Namibia': 'NA',
  'Zimbabwe': 'ZW',
  'Zambia': 'ZM',
  'Mozambique': 'MZ',
  'Angola': 'AO',
  'Malawi': 'MW',
  'Lesotho': 'LS',
  'Swaziland': 'SZ',
  'Djibouti': 'DJ',
  'Eritrea': 'ER',
  'Sudan': 'SD',
  'Chad': 'TD',
  'Niger': 'NE',
  'Mali': 'ML',
  'Burkina Faso': 'BF',
  'Guinea': 'GN',
  'Sierra Leone': 'SL',
  'Liberia': 'LR',
  'Togo': 'TG',
  'Benin': 'BJ',
  'Gambia': 'GM',
  'Guinea-Bissau': 'GW',
  'Cape Verde': 'CV',
  'São Tomé and Príncipe': 'ST',
  'Equatorial Guinea': 'GQ',
  'Central African Republic': 'CF',
  'Democratic Republic of the Congo': 'CD',
  'Republic of the Congo': 'CG',
  'Burundi': 'BI',
  'Comoros': 'KM',
  'Algeria': 'DZ',
  'Libya': 'LY',
  'Mauritania': 'MR',
  'Western Sahara': 'EH',
};

// Convert country name to ISO code, fallback to 'US' if not found
function getCountryCode(countryName?: string): string {
  if (!countryName) return 'US';
  return COUNTRY_NAME_TO_CODE[countryName] || 'US';
}

export async function POST(request: NextRequest) {
  try {
    // Check for Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Stripe with secret key from environment
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
    const body = await request.json();
    const { userId, email, name } = body;

    if (!userId || !email) {
      console.error('Missing required fields:', { userId: !!userId, email: !!email });
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Fetch user profile to get country information
    let countryCode = 'US'; // Default fallback
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Prefer countryOfResidence, fallback to countryOfOrigin
        const countryName = userData.countryOfResidence || userData.countryOfOrigin;
        countryCode = getCountryCode(countryName);
        console.log(`Using country code ${countryCode} for user ${userId} (from: ${countryName || 'default'})`);
      }
    } catch (error) {
      console.error('Error fetching user country:', error);
      // Continue with default 'US' if fetch fails
    }

    // Create a Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: countryCode,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // Can be 'individual' or 'company'
      metadata: {
        userId: userId,
        platform: 'soma',
      },
    });

    // Create account link for onboarding
    // Ensure HTTPS for live mode, allow HTTP only for localhost
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const refreshUrl = isLocalhost ? baseUrl : baseUrl.replace(/^http:/, 'https:');
    const returnUrl = isLocalhost ? baseUrl : baseUrl.replace(/^http:/, 'https:');
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${refreshUrl}/settings?tab=business&refresh=true`,
      return_url: `${returnUrl}/settings?tab=business&success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create Stripe account',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

