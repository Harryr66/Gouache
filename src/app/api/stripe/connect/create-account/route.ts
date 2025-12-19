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

// Normalize country name for matching (case-insensitive, handle common aliases)
function normalizeCountryName(countryName: string): string {
  const normalized = countryName.trim();
  
  // Common aliases and variations
  const aliases: { [key: string]: string } = {
    'uk': 'United Kingdom',
    'u.k.': 'United Kingdom',
    'u.k': 'United Kingdom',
    'great britain': 'United Kingdom',
    'gb': 'United Kingdom',
    'usa': 'United States',
    'u.s.a.': 'United States',
    'u.s.a': 'United States',
    'u.s.': 'United States',
    'u.s': 'United States',
    'us': 'United States',
    'america': 'United States',
    'united states of america': 'United States',
  };
  
  const lower = normalized.toLowerCase();
  if (aliases[lower]) {
    return aliases[lower];
  }
  
  // Try case-insensitive match in the main map
  const matchedKey = Object.keys(COUNTRY_NAME_TO_CODE).find(
    key => key.toLowerCase() === normalized.toLowerCase()
  );
  
  return matchedKey || normalized;
}

// Convert country name to ISO code, return null if not found (no default to US)
function getCountryCode(countryName?: string): string | null {
  if (!countryName) return null;
  
  const normalized = normalizeCountryName(countryName);
  return COUNTRY_NAME_TO_CODE[normalized] || null;
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

    // Check if user already has a Stripe account
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const existingAccountId = userData.stripeAccountId;
        
        if (existingAccountId) {
          // Check if existing account has wrong country
          try {
            const account = await stripe.accounts.retrieve(existingAccountId);
            const existingCountry = account.country;
            
            // Get user's expected country
            const countryName = userData.countryOfResidence || userData.countryOfOrigin;
            const expectedCountryCode = getCountryCode(countryName);
            
            // Only check mismatch if we have a valid expected country code
            if (expectedCountryCode && existingCountry !== expectedCountryCode) {
              return NextResponse.json(
                { 
                  error: 'Existing Stripe account has wrong country',
                  message: `Your existing Stripe account was created with country ${existingCountry}, but your profile indicates ${countryName}. Please reset your account connection and create a new account with the correct country.`,
                  existingCountry,
                  expectedCountry: expectedCountryCode,
                  helpUrl: 'https://dashboard.stripe.com/settings/connect/platform-profile'
                },
                { status: 400 }
              );
            }
          } catch (accountError: any) {
            // If account doesn't exist in Stripe, continue to create new one
            if (accountError.code !== 'resource_missing') {
              console.error('Error checking existing account:', accountError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing account:', error);
      // Continue to create account if check fails
    }

    // Fetch user profile to get country information
    let countryCode: string | null = null;
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', userId));
      if (!userDoc.exists()) {
        return NextResponse.json(
          { 
            error: 'User profile not found',
            message: 'Unable to find your user profile. Please try again.'
          },
          { status: 404 }
        );
      }
      
      const userData = userDoc.data();
      // Prefer countryOfResidence, fallback to countryOfOrigin
      let countryName = userData.countryOfResidence || userData.countryOfOrigin;
      
      // If still no country, try to infer from location field
      if (!countryName && userData.location) {
        const location = userData.location.toLowerCase();
        if (location.includes('uk') || location.includes('united kingdom') || location.includes('england') || location.includes('scotland') || location.includes('wales') || location.includes('london') || location.includes('manchester') || location.includes('birmingham')) {
          countryName = 'United Kingdom';
        } else if (location.includes('usa') || location.includes('united states') || location.includes('us,')) {
          countryName = 'United States';
        }
      }
      
      // If no country is set, return error - user MUST set their country
      if (!countryName) {
        return NextResponse.json(
          { 
            error: 'Country not set in profile',
            message: 'Please set your "Country of Residence" in your profile settings before connecting Stripe. Go to Profile → Edit → Personal Details and select your country.',
            helpUrl: '/profile/edit'
          },
          { status: 400 }
        );
      }
      
      countryCode = getCountryCode(countryName);
      
      // If country couldn't be mapped, return error (no default to US)
      if (!countryCode) {
        return NextResponse.json(
          { 
            error: 'Country mapping failed',
            message: `Unable to map country "${countryName}" to a Stripe country code. Please ensure your profile has a valid country set (e.g., "United Kingdom", "United States", etc.). Go to Profile → Edit → Personal Details to update your country.`,
            detectedCountry: countryName,
            helpUrl: '/profile/edit'
          },
          { status: 400 }
        );
      }
      
      console.log(`[Stripe Account Creation] User ${userId}:`, {
        countryOfResidence: userData.countryOfResidence,
        countryOfOrigin: userData.countryOfOrigin,
        location: userData.location,
        detectedCountryName: countryName,
        finalCountryCode: countryCode
      });
    } catch (error) {
      console.error('Error fetching user country:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch user profile',
          message: 'Unable to retrieve your profile information. Please try again.'
        },
        { status: 500 }
      );
    }
    
    // Ensure we have a valid country code
    if (!countryCode) {
      return NextResponse.json(
        { 
          error: 'Country code not determined',
          message: 'Unable to determine your country. Please set your Country of Residence in your profile settings.',
          helpUrl: '/profile/edit'
        },
        { status: 400 }
      );
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
    
    // Handle specific Stripe Connect setup errors
    if (error.message && error.message.includes('responsibilities of managing losses')) {
      return NextResponse.json(
        { 
          error: 'Stripe Connect platform profile not completed',
          message: 'Please complete your Stripe Connect platform profile setup in the Stripe Dashboard. Go to Settings → Connect → Platform Profile and accept the responsibilities.',
          helpUrl: 'https://dashboard.stripe.com/settings/connect/platform-profile',
          code: 'CONNECT_PROFILE_INCOMPLETE'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create Stripe account',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

