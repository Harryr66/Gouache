'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NewsArticle } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';
import { NewsTile } from '@/components/news-tile';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, RefreshCcw } from 'lucide-react';

const ARTICLE_COLLECTION = 'newsArticles';

const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80';

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
    return Array.from(unique);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
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
  }, [articles, filteredCategory, searchTerm]);

  return (
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
          <ThemeLoading text="Curating today’s headlines…" size="lg" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Filter className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No stories yet</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Check back soon as we expand our newsroom coverage with reports, interviews, and features.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <NewsTile key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

