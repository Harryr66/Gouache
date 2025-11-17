'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NewsArticle } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { ThemeLoading } from '@/components/theme-loading';
import Image from 'next/image';
import Link from 'next/link';

export default function NewsArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const articleDoc = await getDoc(doc(db, 'newsArticles', articleId));
        
        if (articleDoc.exists()) {
          const data = articleDoc.data();
          const articleData: NewsArticle = {
            id: articleDoc.id,
            title: data.title || 'Untitled Article',
            summary: data.summary || '',
            category: data.category || 'Stories',
            imageUrl: data.imageUrl || '/assets/placeholder-light.png',
            publishedAt: data.publishedAt?.toDate?.() || new Date(data.publishedAt || Date.now()),
            updatedAt: data.updatedAt?.toDate?.(),
            author: data.author || '',
            tags: data.tags || [],
            externalUrl: data.externalUrl || undefined,
            featured: data.featured || false,
            content: data.content || '',
            sections: data.sections || undefined,
            archived: data.archived || false,
            archivedAt: data.archivedAt?.toDate?.(),
            location: data.location || undefined,
          };
          setArticle(articleData);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ThemeLoading />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'The article you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Button onClick={() => router.push('/news')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
        </div>
      </div>
    );
  }

  // If article has external URL, redirect to it
  if (article.externalUrl) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{article.title}</h1>
          <p className="text-muted-foreground mb-6">
            This article is hosted externally. You will be redirected shortly...
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.open(article.externalUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Article
            </Button>
            <Button variant="outline" onClick={() => router.push('/news')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const publishedDate = article.publishedAt instanceof Date 
    ? article.publishedAt 
    : new Date(article.publishedAt || Date.now());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/news')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
            <Badge variant="secondary">{article.category}</Badge>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: article.title,
                  text: article.summary,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                // You could add a toast here
              }
            }}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              {article.author && (
                <span>By {article.author}</span>
              )}
              <span>{publishedDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}</span>
            </div>
            {article.imageUrl && (
              <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden mb-8">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </header>

          {/* Article Body */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {article.summary && (
              <p className="text-xl text-muted-foreground mb-8 font-medium">
                {article.summary}
              </p>
            )}
            
            {/* Render Rich Sections */}
            {article.sections && article.sections.length > 0 ? (
              <div className="space-y-8">
                {article.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div key={section.id} className="article-section">
                      {section.type === 'text' && section.content && (
                        <div className="text-foreground whitespace-pre-wrap">
                          {section.content}
                        </div>
                      )}

                      {section.type === 'image' && section.imageUrl && (
                        <figure className="my-6">
                          <img
                            src={section.imageUrl}
                            alt={section.caption || article.title}
                            className="w-full rounded-lg"
                          />
                          {section.caption && (
                            <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                              {section.caption}
                            </figcaption>
                          )}
                        </figure>
                      )}

                      {section.type === 'text-image' && (
                        <div className="space-y-4">
                          {section.imagePosition === 'above' && section.imageUrl && (
                            <figure className="my-6">
                              <img
                                src={section.imageUrl}
                                alt={section.caption || article.title}
                                className="w-full rounded-lg"
                              />
                              {section.caption && (
                                <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                                  {section.caption}
                                </figcaption>
                              )}
                            </figure>
                          )}

                          {section.imagePosition === 'left' && (
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                              {section.imageUrl && (
                                <figure className="flex-shrink-0 w-full md:w-1/2">
                                  <img
                                    src={section.imageUrl}
                                    alt={section.caption || article.title}
                                    className="w-full rounded-lg"
                                  />
                                  {section.caption && (
                                    <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                                      {section.caption}
                                    </figcaption>
                                  )}
                                </figure>
                              )}
                              {section.content && (
                                <div className="text-foreground whitespace-pre-wrap flex-1">
                                  {section.content}
                                </div>
                              )}
                            </div>
                          )}

                          {section.imagePosition === 'right' && (
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                              {section.content && (
                                <div className="text-foreground whitespace-pre-wrap flex-1">
                                  {section.content}
                                </div>
                              )}
                              {section.imageUrl && (
                                <figure className="flex-shrink-0 w-full md:w-1/2">
                                  <img
                                    src={section.imageUrl}
                                    alt={section.caption || article.title}
                                    className="w-full rounded-lg"
                                  />
                                  {section.caption && (
                                    <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                                      {section.caption}
                                    </figcaption>
                                  )}
                                </figure>
                              )}
                            </div>
                          )}

                          {section.imagePosition === 'below' && (
                            <>
                              {section.content && (
                                <div className="text-foreground whitespace-pre-wrap">
                                  {section.content}
                                </div>
                              )}
                              {section.imageUrl && (
                                <figure className="my-6">
                                  <img
                                    src={section.imageUrl}
                                    alt={section.caption || article.title}
                                    className="w-full rounded-lg"
                                  />
                                  {section.caption && (
                                    <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                                      {section.caption}
                                    </figcaption>
                                  )}
                                </figure>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : article.content ? (
              // Fallback to legacy content if no sections
              <div 
                className="text-foreground whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <p className="text-muted-foreground">
                Full article content coming soon...
              </p>
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

