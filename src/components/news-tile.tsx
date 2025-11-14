import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsAd, NewsArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

type NewsTileProps = {
  article?: NewsArticle;
  ad?: NewsAd;
  index: number;
};

export function NewsTile({ article, ad, index }: NewsTileProps) {
  const isAd = Boolean(ad);

  if (isAd && !ad) {
    return null;
  }

  if (!isAd && !article) {
    return null;
  }

  const href = isAd ? ad!.ctaUrl : article!.externalUrl ?? `/news/${article!.id}`;

  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:shadow-lg group h-full flex flex-col',
        isAd && 'border-primary/20'
      )}
    >
      <Link href={href} target={isAd ? '_blank' : '_self'} rel="noopener noreferrer" className="flex flex-col h-full">
        <div className="relative w-full pt-[60%] overflow-hidden">
          <img
            src={isAd ? ad!.imageUrl : article!.imageUrl}
            alt={isAd ? ad!.title : article!.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {isAd ? (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
                Sponsored
              </Badge>
            </div>
          ) : (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary">{article!.category}</Badge>
            </div>
          )}
        </div>

        <CardContent className="flex flex-col justify-between flex-1 p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
              {isAd ? ad!.title : article!.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {isAd ? ad!.tagline ?? `Promoted by ${ad!.advertiserName}` : article!.summary}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isAd
                ? `Presented by ${ad!.advertiserName}`
                : article!.author
                  ? `${article!.author} • ${article!.publishedAt.toLocaleDateString()}`
                  : article!.publishedAt.toLocaleDateString()}
            </span>
            <span className="font-medium text-primary">
              {isAd ? ad!.ctaText : 'Read more'}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

