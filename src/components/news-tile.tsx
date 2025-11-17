import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsArticle } from '@/lib/types';
import { cn } from '@/lib/utils';

type NewsTileProps = {
  article: NewsArticle;
};

export function NewsTile({ article }: NewsTileProps) {
  const router = useRouter();
  
  const isPlaceholder = Boolean(article?.id?.toString?.().startsWith('placeholder'));
  const hasExternalUrl = article.externalUrl && article.externalUrl.trim() !== '';
  const articleId = article?.id;
  const href = isPlaceholder 
    ? '#' 
    : (hasExternalUrl 
        ? article.externalUrl 
        : articleId ? `/news/${articleId}` : '#');

  const handleCardClick = (e: React.MouseEvent) => {
    // Only handle clicks if it's not a placeholder and not an external URL (Link handles those)
    if (isPlaceholder || hasExternalUrl) {
      return;
    }
    
    // If clicking directly on the card (not a link), navigate programmatically
    if (articleId && (e.target as HTMLElement).tagName !== 'A') {
      e.preventDefault();
      router.push(`/news/${articleId}`);
    }
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isPlaceholder) {
      return (
        <div className="flex flex-col h-full pointer-events-none select-none" aria-hidden>
          {children}
        </div>
      );
    }
    if (hasExternalUrl) {
      return (
        <a 
          href={href as string} 
          onClick={handleClick}
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex flex-col h-full cursor-pointer"
        >
          {children}
        </a>
      );
    }
    return (
      <Link 
        href={href as string} 
        className="flex flex-col h-full"
      >
        {children}
      </Link>
    );
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:shadow-lg group h-full flex flex-col',
        !isPlaceholder && 'cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <Wrapper>
        <div className="relative w-full pt-[60%] overflow-hidden">
          <img
            src={(article as any).imageUrl}
            alt={(article as any).title}
            className={cn(
              'absolute inset-0 h-full w-full transition-transform duration-500',
              isPlaceholder ? 'object-contain bg-muted p-8' : 'group-hover:scale-105 object-cover'
            )}
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary">{(article as any).category}</Badge>
          </div>
        </div>

        <CardContent className="flex flex-col justify-between flex-1 p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight text-foreground">
              {(article as any).title
                ? (article as any).title
                : 'Coming Soon'}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {(article as any).summary
                ? (article as any).summary
                : 'Stay tuned for upcoming stories from the Gouache newsroom.'}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {(article as any).author
                ? `${(article as any).author} • ${new Date((article as any).publishedAt).toLocaleDateString()}`
                : new Date((article as any).publishedAt).toLocaleDateString()}
            </span>
            {!isPlaceholder && <span className="font-medium text-primary">Read more</span>}
          </div>
        </CardContent>
      </Wrapper>
    </Card>
  );
}

