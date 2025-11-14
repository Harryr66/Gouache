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
import { Filter, RefreshCcw } from 'lucide-react';

const ARTICLE_COLLECTION = 'newsArticles';

const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80';

const PLACEHOLDER_ARTICLES: NewsArticle[] = [
  {
    id: 'placeholder-1',
    title: 'Contemporary Art Fair Returns to New York',
    summary: 'The annual contemporary art showcase brings together over 200 galleries from around the world, featuring emerging and established artists.',
    category: 'Headlines',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80',
    author: 'Gouache Editorial',
    publishedAt: new Date(),
    tags: ['art fair', 'contemporary art', 'galleries'],
    featured: false,
    archived: false
  },
  {
    id: 'placeholder-2',
    title: 'Rising Artist Spotlight: The Next Generation',
    summary: 'Discover the emerging talents reshaping the art landscape with innovative techniques and bold perspectives.',
    category: 'Features',
    imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    author: 'Gouache Editorial',
    publishedAt: new Date(),
    tags: ['emerging artists', 'spotlight', 'talent'],
    featured: false,
    archived: false
  },
  {
    id: 'placeholder-3',
    title: 'Gallery Openings: What to Watch This Season',
    summary: 'A curated guide to the most anticipated gallery openings and exhibitions happening across major art capitals.',
    category: 'Events',
    imageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&w=1200&q=80',
    author: 'Gouache Editorial',
    publishedAt: new Date(),
    tags: ['gallery openings', 'exhibitions', 'events'],
    featured: false,
    archived: false
  },
  {
    id: 'placeholder-4',
    title: 'Art Market Trends: Investment Insights',
    summary: 'An analysis of current market movements, collector behavior, and investment opportunities in the contemporary art space.',
    category: 'Market',
    imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560e8f5?auto=format&fit=crop&w=1200&q=80',
    author: 'Gouache Editorial',
    publishedAt: new Date(),
    tags: ['art market', 'investment', 'trends'],
    featured: false,
    archived: false
  },
  {
    id: 'placeholder-5',
    title: 'Museum Exhibitions: Must-See Shows This Year',
    summary: 'Explore the most compelling museum exhibitions opening this season, from retrospectives to groundbreaking contemporary installations.',
    category: 'Headlines',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
    author: 'Gouache Editorial',
    publishedAt: new Date(),
    tags: ['museums', 'exhibitions', 'must-see'],
    featured: false,
    archived: false
  },
  {
    id: 'placeholder-6',
    title: 'Artist Residencies: Opportunities for Creatives',
    summary: 'A comprehensive guide to artist residency programs around the world, offering time, space, and community for artistic development.',
    category: 'Features',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    author: 'Gouache Editorial',
    publishedAt: new Date(),
    tags: ['residencies', 'opportunities', 'artists'],
    featured: false,
    archived: false
  }
];

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredCategory, setFilteredCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const articleSnapshot = await getDocs(query(collection(db, ARTICLE_COLLECTION), orderBy('publishedAt', 'desc')));
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

  const categories = useMemo(() => {
    const unique = new Set<string>(['All']);
    articles.forEach((article) => unique.add(article.category ?? 'General'));
    // Add placeholder categories if no real articles
    if (articles.length === 0) {
      PLACEHOLDER_ARTICLES.forEach((article) => unique.add(article.category));
    }
    return Array.from(unique);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const realArticles = articles.filter((article) => {
      if (article.archived) {
        return false;
      }
      const matchesCategory = filteredCategory === 'All' || article.category === filteredCategory;
      const matchesSearch =
        !searchTerm ||
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    // Show placeholders only when there are no real articles and no search/filter applied
    if (realArticles.length === 0 && articles.length === 0 && !searchTerm && filteredCategory === 'All') {
      return PLACEHOLDER_ARTICLES;
    }

    return realArticles;
  }, [articles, filteredCategory, searchTerm]);

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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={filteredCategory === category ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => setFilteredCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search news, trends, or artists…"
              className="w-full sm:w-72"
            />
            <Button variant="outline" size="icon" onClick={() => { setSearchTerm(''); setFilteredCategory('All'); }}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <ThemeLoading text="Curating today's headlines…" size="lg" />
        </div>
      ) : filteredArticles.length === 0 && (searchTerm || filteredCategory !== 'All' || articles.length > 0) ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Filter className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No stories found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {searchTerm || filteredCategory !== 'All'
              ? 'Try adjusting your search or filter to find more stories.'
              : 'Check back soon as we expand our newsroom coverage with reports, interviews, and features.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <NewsTile key={article.id} article={article} />
            ))}
          </div>
        </>
      )}
    </div>
    
    {/* Newsletter Signup - Full Width */}
    <div className="container max-w-6xl pt-12 border-t">
      <NewsletterSignup />
    </div>
    </>
  );
}

