import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

type NewsTileProps = {
  article: NewsArticle;
};

export function NewsTile({ article }: NewsTileProps) {
  const isPlaceholder = Boolean(article?.id?.toString?.().startsWith('placeholder'));
  const hasExternalUrl = article.externalUrl && article.externalUrl.trim() !== '';
  const articleId = article?.id;
  const href = isPlaceholder 
    ? '#' 
    : (hasExternalUrl 
        ? article.externalUrl 
        : articleId ? `/news/${articleId}` : '#');

  const cardContent = (
    <>
      <div className="relative w-full pt-[60%] overflow-hidden">
        <img
          src={article.imageUrl}
          alt={article.title || 'Coming Soon'}
          className={cn(
            'absolute inset-0 h-full w-full transition-transform duration-500',
            isPlaceholder ? 'object-contain bg-muted p-8' : 'group-hover:scale-105 object-cover'
          )}
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary">{article.category}</Badge>
        </div>
      </div>

      <CardContent className="flex flex-col justify-between flex-1 p-5 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight text-foreground">
            {article.title || 'Coming Soon'}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {article.summary || 'Stay tuned for upcoming stories from the Gouache newsroom.'}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {article.publishedAt
              ? (article.author
                  ? `${article.author} • ${new Date(article.publishedAt).toLocaleDateString()}`
                  : new Date(article.publishedAt).toLocaleDateString())
              : article.author || 'No date'}
          </span>
          {!isPlaceholder && <span className="font-medium text-primary">Read more</span>}
        </div>
      </CardContent>
    </>
  );

  // For placeholders, return non-clickable card
  if (isPlaceholder) {
    return (
      <Card className={cn('overflow-hidden transition hover:shadow-lg group h-full flex flex-col')}>
        <div className="flex flex-col h-full pointer-events-none select-none" aria-hidden>
          {cardContent}
        </div>
      </Card>
    );
  }

  // For external URLs, use anchor tag
  if (hasExternalUrl) {
    return (
      <Card className={cn('overflow-hidden transition hover:shadow-lg group h-full flex flex-col cursor-pointer')}>
        <a 
          href={href as string}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col h-full"
        >
          {cardContent}
        </a>
      </Card>
    );
  }

  // For internal articles, wrap in Next.js Link
  return (
    <Card className={cn('overflow-hidden transition hover:shadow-lg group h-full flex flex-col cursor-pointer')}>
      <Link href={href as string} className="flex flex-col h-full">
        {cardContent}
      </Link>
    </Card>
  );
}
