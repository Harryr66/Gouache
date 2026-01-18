import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      galleryName,
      contactName,
      email,
      phone,
      galleryType,
      location,
      city,
      country,
      website,
      bio,
      yearsOperating,
      artistsRepresented,
      exhibitionHistory,
      portfolioImages,
      socialLinks, 
      source,
      userId 
    } = body as {
      galleryName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      galleryType?: string;
      location?: string;
      city?: string;
      country?: string;
      website?: string;
      bio?: string;
      yearsOperating?: string;
      artistsRepresented?: string;
      exhibitionHistory?: string;
      portfolioImages?: string[];
      socialLinks?: {
        instagram?: string;
        facebook?: string;
        x?: string;
        website?: string;
      };
      source?: string;
      userId?: string;
    };

    if (!galleryName || !email || !contactName) {
      return NextResponse.json({ error: 'Gallery name, contact name, and email are required.' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedGalleryName = galleryName.trim();
    const trimmedContactName = contactName.trim();

    // Build the gallery request document
    const galleryRequest: any = {
      galleryName: trimmedGalleryName,
      contactName: trimmedContactName,
      email: trimmedEmail,
      status: 'pending',
      submittedAt: serverTimestamp(),
      source: source || 'partners-gallery-request',
    };

    // Add userId if provided (for logged-in users)
    if (userId) {
      galleryRequest.userId = userId;
    }

    // Add optional fields
    if (phone?.trim()) {
      galleryRequest.phone = phone.trim();
    }
    if (galleryType) {
      galleryRequest.galleryType = galleryType;
    }
    if (location?.trim()) {
      galleryRequest.location = location.trim();
    }
    if (city?.trim()) {
      galleryRequest.city = city.trim();
    }
    if (country?.trim()) {
      galleryRequest.country = country.trim();
    }
    if (website?.trim()) {
      galleryRequest.website = website.trim();
    }
    if (bio?.trim()) {
      galleryRequest.bio = bio.trim();
    }
    if (yearsOperating?.trim()) {
      galleryRequest.yearsOperating = yearsOperating.trim();
    }
    if (artistsRepresented?.trim()) {
      galleryRequest.artistsRepresented = artistsRepresented.trim();
    }
    if (exhibitionHistory?.trim()) {
      galleryRequest.exhibitionHistory = exhibitionHistory.trim();
    }

    // Add portfolio images (artworks by represented artists)
    if (portfolioImages && Array.isArray(portfolioImages) && portfolioImages.length > 0) {
      galleryRequest.portfolioImages = portfolioImages;
    } else {
      galleryRequest.portfolioImages = [];
    }

    // Add social links
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
      if (socialLinks.facebook?.trim()) {
        cleanSocialLinks.facebook = socialLinks.facebook.trim();
      }
      if (Object.keys(cleanSocialLinks).length > 0) {
        galleryRequest.socialLinks = cleanSocialLinks;
      }
    }

    // Save to Firestore in the galleryRequests collection
    await addDoc(collection(db, 'galleryRequests'), galleryRequest);

    return NextResponse.json({ 
      success: true, 
      message: 'Gallery account request submitted successfully.' 
    });
  } catch (error) {
    console.error('Failed to submit gallery request:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit gallery request.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
