import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

type NewsTileProps = {
  article: NewsArticle;
};

export function NewsTile({ article }: NewsTileProps) {
  const href = article.externalUrl ?? `/news/${article.id}`;

  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:shadow-lg group h-full flex flex-col'
      )}
    >
      <Link href={href} target={article.externalUrl ? '_blank' : '_self'} rel="noopener noreferrer" className="flex flex-col h-full">
        <div className="relative w-full pt-[60%] overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary">{article.category}</Badge>
          </div>
        </div>

        <CardContent className="flex flex-col justify-between flex-1 p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {article.summary}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {article.author ? `${article.author} • ${article.publishedAt.toLocaleDateString()}` : article.publishedAt.toLocaleDateString()}
            </span>
            <span className="font-medium text-primary">
              Read more
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

