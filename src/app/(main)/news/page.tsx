'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NewsArticle, AdCampaign } from '@/lib/types';
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
import { fetchActiveAds, mixAdsIntoContent } from '@/lib/ad-fetcher';
import { AdTile } from '@/components/ad-tile';
import { useAuth } from '@/providers/auth-provider';

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
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [filteredCategory, setFilteredCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [isNewsletterSuccess, setIsNewsletterSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        // Fetch all articles, then filter client-side to handle backward compatibility
        // (old articles may not have status field)
        const articleSnapshot = await getDocs(query(collection(db, ARTICLE_COLLECTION), orderBy('publishedAt', 'desc')));
        const loadedArticles: NewsArticle[] = articleSnapshot.docs
          .map((doc) => {
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
              sections: data.sections ?? undefined,
              status: data.status ?? (data.publishedAt ? 'published' : 'draft'),
              archived: data.archived ?? false,
              archivedAt: data.archivedAt?.toDate?.()
            };
          })
          .filter((article) => {
            // Only show published articles (or articles without status that have publishedAt)
            return article.status === 'published' || (!article.status && article.publishedAt);
          });

        if (!isMounted) return;
        setArticles(loadedArticles);

        // Load ads
        const activeAds = await fetchActiveAds('news', user?.id);
        setAds(activeAds);
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
  }, [user]);

  const categories = ['All', 'Stories', 'Events', 'News', 'Partners'];

  const filteredArticles = useMemo(() => {
    const realArticles = articles.filter((article) => {
      if (article.archived) {
        return false;
      }
      const matchesCategory = filteredCategory === 'All' || article.category === filteredCategory;
      return matchesCategory;
    });

    // Always show 8 tiles, fill with placeholders if needed
    const displayArticles = [...realArticles];
    while (displayArticles.length < 8) {
      displayArticles.push(
        createPlaceholderArticle(theme, `placeholder-${displayArticles.length + 1}`)
      );
    }

    // Mix ads into content
    const articlesWithAds = mixAdsIntoContent(displayArticles.slice(0, 8), ads, 2);
    return articlesWithAds;
  }, [articles, filteredCategory, theme, ads]);

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
    <div className="container max-w-6xl w-full px-4 sm:px-6 lg:px-20 xl:px-24 py-6 sm:py-12 space-y-6 sm:space-y-10 overflow-x-hidden">
      <header className="space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="uppercase tracking-widest">
            Gouache Newsroom
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Stories, Events, and Emerging Artists Shaping Today&apos;s Art World
          </h1>
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
      <div className="bg-red-600 dark:bg-slate-900 rounded-xl sm:rounded-full px-5 py-4 sm:px-6 sm:py-4">
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
          <ThemeLoading text="" size="lg" />
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
          {/* Hero Media Tile + Grid */}
          <div className="space-y-4 md:space-y-12">
            {/* Hero Tile - First Article */}
            {filteredArticles.length > 0 && (
              <div>
                {'type' in filteredArticles[0] && filteredArticles[0].type === 'ad' ? (
                  <AdTile 
                    campaign={filteredArticles[0].campaign} 
                    placement="news"
                    userId={user?.id}
                  />
                ) : (
                  <NewsTile article={filteredArticles[0] as NewsArticle} />
                )}
              </div>
            )}

            {/* Responsive, editorial-style grid - Remaining articles */}
            {filteredArticles.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredArticles.slice(1).map((item, idx) => {
                  const isAd = 'type' in item && item.type === 'ad';
                  const itemKey = isAd 
                    ? (item as { type: 'ad'; campaign: AdCampaign }).campaign.id 
                    : (item as NewsArticle).id;
                  return (
                    <div
                      key={itemKey}
                      className={
                        idx % 5 === 0
                          ? 'lg:col-span-2'
                          : ''
                      }
                    >
                      {isAd ? (
                        <AdTile 
                          campaign={(item as { type: 'ad'; campaign: AdCampaign }).campaign} 
                          placement="news"
                          userId={user?.id}
                        />
                      ) : (
                        <NewsTile article={item as NewsArticle} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    
    {/* Newsletter Signup - Bottom with Standard Theme Colors */}
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-20 xl:px-24 pt-6 sm:pt-12 pb-8 sm:pb-16 border-t">
      <NewsletterSignup />
    </div>
    </>
  );
}

