import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, artistStatement, experience, socialLinks, source } = body as {
      name?: string;
      email?: string;
      artistStatement?: string;
      experience?: string;
      socialLinks?: {
        instagram?: string;
        website?: string;
        x?: string;
        tiktok?: string;
      };
      source?: string;
    };

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Build the artist request document
    const artistRequest: any = {
      name: trimmedName,
      email: trimmedEmail,
      status: 'pending',
      submittedAt: serverTimestamp(),
      source: source || 'discover-coming-soon'
    };

    // Add optional fields only if they have values
    if (artistStatement?.trim()) {
      artistRequest.artistStatement = artistStatement.trim();
    }
    if (experience?.trim()) {
      artistRequest.experience = experience.trim();
    }
    if (socialLinks) {
      const cleanSocialLinks: any = {};
      if (socialLinks.instagram?.trim()) {
        cleanSocialLinks.instagram = socialLinks.instagram.trim();
      }
      if (socialLinks.website?.trim()) {
        cleanSocialLinks.website = socialLinks.website.trim();
      }
      if (socialLinks.x?.trim()) {
        cleanSocialLinks.x = socialLinks.x.trim();
      }
      if (socialLinks.tiktok?.trim()) {
        cleanSocialLinks.tiktok = socialLinks.tiktok.trim();
      }
      if (Object.keys(cleanSocialLinks).length > 0) {
        artistRequest.socialLinks = cleanSocialLinks;
      }
    }

    // Save to Firestore in the artistRequests collection
    await addDoc(collection(db, 'artistRequests'), artistRequest);

    return NextResponse.json({ 
      success: true, 
      message: 'Artist profile request submitted successfully.' 
    });
  } catch (error) {
    console.error('Failed to submit artist request:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit artist request.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

