import { NextRequest, NextResponse } from 'next/server';
import { structureArticle } from '@/ai/flows/structure-article';
import { ArticleSection } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText, headlines, imageUrls, imageDescriptions } = body;

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json(
        { error: 'rawText is required and must be a string' },
        { status: 400 }
      );
    }

    // Call the AI flow to structure the article
    const result = await structureArticle({
      rawText,
      headlines: headlines || [],
      imageUrls: imageUrls || [],
      imageDescriptions: imageDescriptions || [],
    });

    // Convert AI output to ArticleSection format
    const sections: ArticleSection[] = result.sections.map((section, index) => ({
      id: `ai-section-${Date.now()}-${index}`,
      type: section.type as 'headline' | 'subheadline' | 'intro' | 'body' | 'outro' | 'image' | 'text-image',
      content: section.content,
      imageUrl: section.imageUrl,
      imagePosition: section.imagePosition as 'above' | 'below' | 'left' | 'right' | undefined,
      caption: section.caption,
      order: section.order,
    }));

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error structuring article:', error);
    return NextResponse.json(
      { error: 'Failed to structure article', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

