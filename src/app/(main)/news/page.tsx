'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NewsArticle } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';
import { NewsTile } from '@/components/news-tile';
import { NewsletterSignup } from '@/components/newsletter-signup';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import Link from 'next/link';

const ARTICLE_COLLECTION = 'newsArticles';

const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80';

const createPlaceholderArticle = (theme: string | undefined, id: string): NewsArticle => ({
  id,
  title: 'Coming Soon',
  summary: 'New stories and insights from the art world will appear here.',
  category: 'Stories',
  imageUrl: theme === 'dark'
    ? '/assets/placeholder-dark.png'
    : '/assets/placeholder-light.png',
  author: 'Gouache Editorial',
  publishedAt: new Date(),
  tags: [],
  featured: false,
  archived: false
});

export default function NewsPage() {
  const { theme } = useTheme();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredCategory, setFilteredCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [isNewsletterSuccess, setIsNewsletterSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const articleSnapshot = await getDocs(query(collection(db, ARTICLE_COLLECTION), where('status', '==', 'published'), orderBy('publishedAt', 'desc')));
        const loadedArticles: NewsArticle[] = articleSnapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            title: data.title ?? 'Untitled',
            summary: data.summary ?? '',
            category: data.category ?? 'General',
            imageUrl: data.imageUrl ?? DEFAULT_ARTICLE_IMAGE,
            author: data.author ?? '',
            publishedAt: data.publishedAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.(),
            tags: data.tags ?? [],
            externalUrl: data.externalUrl ?? '',
            featured: data.featured ?? false,
            content: data.content ?? '',
            archived: data.archived ?? false,
            archivedAt: data.archivedAt?.toDate?.()
          };
        });

        if (!isMounted) return;
        setArticles(loadedArticles);
      } catch (error) {
        console.error('Failed to load newsroom content:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = ['All', 'Stories', 'Events', 'News', 'Partners'];

  const filteredArticles = useMemo(() => {
    const realArticles = articles.filter((article) => {
      if (article.archived) {
        return false;
      }
      const matchesCategory = filteredCategory === 'All' || article.category === filteredCategory;
      return matchesCategory;
    });

    // Always show 9 tiles, fill with placeholders if needed
    const displayArticles = [...realArticles];
    while (displayArticles.length < 9) {
      displayArticles.push(
        createPlaceholderArticle(theme, `placeholder-${displayArticles.length + 1}`)
      );
    }

    return displayArticles.slice(0, 9);
  }, [articles, filteredCategory, theme]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsNewsletterSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newsletterEmail.trim().toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe to newsletter');
      }

      setIsNewsletterSuccess(true);
      setNewsletterEmail('');
      
      toast({
        title: 'Successfully subscribed!',
        description: 'Thank you for subscribing to the Gouache newsletter.',
      });

      setTimeout(() => {
        setIsNewsletterSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Unable to subscribe. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  return (
    <>
    <div className="container max-w-6xl py-12 space-y-10">
      <header className="space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="uppercase tracking-widest">
            Gouache Newsroom
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Stories, insights, and opportunities shaping today&apos;s art world
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Follow the latest movements across galleries, fairs, studios, and creative communities.
            We feature headline news, trend pieces, and opportunities that support artists.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x snap-mandatory">
            {categories.map((category) => (
              <Button
                key={category}
                variant={filteredCategory === category ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => setFilteredCategory(category)}
                className="shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 snap-start"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Newsletter Signup - Accent Banner (pill, slimmer) */}
      <div className="bg-red-600 dark:bg-slate-900 rounded-full px-5 py-4 sm:px-6 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0 px-2 sm:px-4">
            <div className="text-center sm:text-left">
              <div className="text-sm sm:text-base font-semibold text-white sm:uppercase leading-relaxed">
                Subscribe to Gouache Discovery
              </div>
              <div className="hidden sm:inline text-sm sm:text-base font-normal text-white normal-case">
                — Discover New Artists Weekly
              </div>
              <div className="block sm:hidden text-xs font-normal text-white normal-case mt-1">
                Discover New Artists Weekly
              </div>
            </div>
          </div>
          <form onSubmit={handleNewsletterSubmit} className="flex items-center gap-2 flex-1 sm:max-w-md sm:ml-0 w-full">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={isNewsletterSubmitting || isNewsletterSuccess}
                className="bg-white dark:bg-slate-800/90 border-0 text-foreground placeholder:text-muted-foreground h-8 text-sm sm:h-9 sm:text-base"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isNewsletterSubmitting || isNewsletterSuccess}
              variant="secondary"
              className="bg-white dark:bg-slate-700 text-foreground hover:bg-white/90 dark:hover:bg-slate-700/90 shrink-0 h-8 px-3 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              {isNewsletterSubmitting ? (
                <>
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span className="text-xs sm:text-sm">Subscribing...</span>
                </>
              ) : isNewsletterSuccess ? (
                <>
                  <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Subscribed!</span>
                </>
              ) : (
                <span className="text-xs sm:text-sm">Subscribe</span>
              )}
            </Button>
          </form>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <ThemeLoading text="Loading today&apos;s headlines…" size="lg" />
        </div>
      ) : filteredArticles.length === 0 && (filteredCategory !== 'All' || articles.length > 0) ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Filter className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No stories found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {filteredCategory !== 'All'
              ? 'Try adjusting your filter to find more stories.'
              : 'Check back soon as we expand our newsroom coverage with reports, interviews, and features.'}
          </p>
        </div>
      ) : (
        <>
          {/* Hero Media Tile + What's New Section */}
          <div className="space-y-12">
            {/* Hero Tile - First Article */}
            {filteredArticles.length > 0 && (
              <div>
                <NewsTile article={filteredArticles[0]} />
              </div>
            )}

            {/* WHAT'S NEW Section - Editorial Style (moved under hero) */}
            {filteredArticles.length > 1 && (
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold italic text-left tracking-tight">
                  WHAT&apos;S NEW
                </h2>
                <div className="space-y-6">
                  {filteredArticles.slice(1, 4).map((article) => {
                    const isPlaceholder = Boolean(article.id?.toString?.().startsWith('placeholder'));
                    const href = isPlaceholder ? '#' : (article.externalUrl ?? `/news/${article.id}`);
                    const publishedDate = article.publishedAt instanceof Date 
                      ? article.publishedAt 
                      : new Date(article.publishedAt || Date.now());
                    
                    const Wrapper = ({ children }: { children: React.ReactNode }) => {
                      if (isPlaceholder) {
                        return <div className="pointer-events-none">{children}</div>;
                      }
                      return (
                        <Link 
                          href={href as string} 
                          target={article.externalUrl ? '_blank' : '_self'} 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {children}
                        </Link>
                      );
                    };

                    return (
                      <Wrapper key={article.id}>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 group hover:opacity-90 transition-opacity">
                          <div className="relative w-full sm:w-48 md:w-64 flex-shrink-0 aspect-[4/3] overflow-hidden rounded-lg">
                            <img
                              src={article.imageUrl}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <div className="text-xs sm:text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                              {article.category} | {publishedDate.toLocaleDateString('en-US', { 
                                month: '2-digit', 
                                day: '2-digit', 
                                year: 'numeric' 
                              })}
                            </div>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                              {article.title || 'Coming Soon'}
                            </h3>
                            {article.summary && (
                              <p className="text-sm sm:text-base text-muted-foreground mt-2 line-clamp-2">
                                {article.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Responsive, editorial-style grid - Remaining 5 articles (total 9) */}
            {filteredArticles.length > 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.slice(4, 9).map((article, idx) => (
                  <div
                    key={article.id}
                    className={
                      idx % 5 === 0
                        ? 'lg:col-span-2'
                        : ''
                    }
                  >
                    <NewsTile article={article} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    
    {/* Newsletter Signup - Bottom with Standard Theme Colors */}
    <div className="container max-w-6xl pt-12 pb-16 border-t">
      <NewsletterSignup />
    </div>
    </>
  );
}

