'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Artwork, Artist } from '@/lib/types';
import { useFollow } from '@/providers/follow-provider';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLikes } from '@/providers/likes-provider';
import { 
  UserPlus, 
  UserCheck, 
  Instagram, 
  Globe, 
  Calendar, 
  MapPin, 
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  BookOpen,
  Users,
  Play,
  Heart as HeartIcon,
  X
} from 'lucide-react';

interface ArtworkTileProps {
  artwork: Artwork;
  onClick?: () => void;
}

export function ArtworkTile({ artwork, onClick }: ArtworkTileProps) {
  const { isFollowing, followArtist, unfollowArtist } = useFollow();
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const { theme, resolvedTheme } = useTheme();
  const [showArtistPreview, setShowArtistPreview] = useState(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any>(null);

  const handleTileClick = () => {
    setShowArtistPreview(true);
    if (onClick) onClick();
  };

  const handleFollowToggle = () => {
    if (isFollowing(artwork.artist.id)) {
      unfollowArtist(artwork.artist.id);
    } else {
      followArtist(artwork.artist.id);
    }
  };

  // Mock data for artist's additional content
const generateArtistContent = (artist: Artist) => ({
    events: [
      {
        id: `event-${artist.id}-1`,
        title: `${artist.name} - Gallery Opening`,
        description: 'Join us for an exclusive gallery opening featuring new works by the artist.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
        location: artist.location || 'TBA',
        venue: 'Modern Art Gallery',
        type: 'Exhibition',
        bookingUrl: 'https://gallery-booking.com/event1',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: 'Free',
        capacity: 100,
        isEditable: true
      },
      {
        id: `event-${artist.id}-2`,
        title: 'Live Art Workshop',
        description: 'Learn advanced techniques in a hands-on workshop with the artist.',
        date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        location: 'Virtual Event',
        venue: 'Online Studio',
        type: 'Workshop',
        bookingUrl: 'https://workshop-booking.com/event2',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: '$75',
        capacity: 25,
        isEditable: true
      },
      {
        id: `event-${artist.id}-3`,
        title: 'Artist Talk & Q&A',
        description: 'An intimate conversation about the creative process and artistic journey.',
        date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Community Center',
        venue: 'Downtown Arts Center',
        type: 'Talk',
        bookingUrl: 'https://talk-booking.com/event3',
        imageUrl: generatePlaceholderUrl(400, 200),
        price: '$25',
        capacity: 50,
        isEditable: true
      }
    ],
    courses: [
      {
        id: `course-${artist.id}-1`,
        title: `${artist.name} - Masterclass`,
        price: Math.floor(Math.random() * 200) + 50,
        students: Math.floor(Math.random() * 100) + 10,
        rating: 4.5 + Math.random() * 0.5
      }
    ],
  shopItems: [
    {
      id: `shop-${artist.id}-1`,
      title: `${artist.name} Limited Print`,
      description: 'Signed archival print on museum-grade paper. Edition of 50.',
      price: Math.floor(Math.random() * 300) + 150,
      available: Math.floor(Math.random() * 20) + 5,
      imageUrl: generatePlaceholderUrl(480, 320),
      shipping: 'Worldwide shipping available'
    },
    {
      id: `shop-${artist.id}-2`,
      title: `${artist.name} Original Canvas`,
      description: 'Original mixed media canvas piece with certificate of authenticity.',
      price: Math.floor(Math.random() * 1500) + 500,
      available: 1,
      imageUrl: generatePlaceholderUrl(480, 320),
      shipping: 'Ships from artist studio'
    }
  ],
    communities: [
      {
        id: `community-${artist.id}-1`,
        name: `${artist.name}'s Art Circle`,
        members: Math.floor(Math.random() * 500) + 50,
        isPrivate: Math.random() > 0.5
      }
    ]
  });

  const artistContent = generateArtistContent(artwork.artist);
  const following = isFollowing(artwork.artist.id);

  const router = useRouter();
  const { toggleLike, isLiked, loading: likesLoading } = useLikes();
  const liked = isLiked(artwork.id);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // Use artist ID for profile link - this should be the Firestore document ID
  const profileSlug = artwork.artist.id;
  const handleViewProfile = () => {
    setShowArtistPreview(false);
    if (profileSlug) {
      // Always use the artist ID (Firestore document ID) for profile links
      router.push(`/profile/${profileSlug}`);
    } else {
      console.warn('⚠️ No artist ID found for profile link');
      router.push('/profile');
    }
  };

  // Swipe down gesture handlers
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isBannerExpanded) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isBannerExpanded) return;
    setTouchEnd(e.targetTouches[0].clientY);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !isBannerExpanded) return;
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;
    if (isDownSwipe) {
      setIsBannerExpanded(false);
    }
  };

  return (
    <>
    <Card 
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-0"
        onClick={handleTileClick}
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={artwork.imageUrl}
          alt={artwork.imageAiHint}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {artwork.isForSale && artwork.price && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1">
              ${artwork.price.toLocaleString()}
            </Badge>
          </div>
        )}

        {/* AI badge */}
        {artwork.isAI && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              AI {artwork.aiAssistance}
            </Badge>
          </div>
        )}

          {/* Artist banner at bottom */}
          <div
            className={`absolute bottom-0 left-0 right-0 backdrop-blur-sm p-2 ${
              (resolvedTheme || theme) === 'dark' ? 'bg-gray-900/90' : 'bg-white/90'
            }`}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage 
                  src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(24, 24)} 
                  alt={artwork.artist.name}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">{artwork.artist.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">
                    {artwork.artist.name}
                  </span>
                  {artwork.artist.isVerified && <BadgeCheck className={`h-3 w-3 flex-shrink-0 fill-current ${
                    (resolvedTheme || theme) === 'dark' 
                      ? 'text-blue-400' 
                      : 'text-blue-500'
                  }`} />}
                </div>
                {artwork.artist.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{artwork.artist.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </Card>

      {/* Artist Preview Dialog */}
      <Dialog open={showArtistPreview} onOpenChange={(open) => {
        setShowArtistPreview(open);
        if (!open) setIsBannerExpanded(false);
      }}>
        <DialogContent className="max-w-6xl w-full h-full md:h-auto p-0 md:p-6 overflow-hidden border-0 md:border-border rounded-none md:rounded-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Artist Profile</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col md:flex-row h-full md:max-h-[90vh]">
            {/* Hero Artwork - Fullscreen on mobile */}
            <div className={`relative w-full h-full md:w-3/5 flex flex-col ${
              (resolvedTheme || theme) === 'dark' 
                ? 'bg-slate-900' 
                : 'bg-slate-50'
            }`}>
              {/* Close button - mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 md:hidden bg-background/80 backdrop-blur-sm"
                onClick={() => setShowArtistPreview(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div className="flex-1 flex items-center justify-center p-0 md:p-6 relative">
                <div className="relative w-full h-full md:aspect-[4/3] lg:aspect-[16/9] md:max-h-[70vh] md:rounded-2xl overflow-hidden">
                  <Image
                    src={artwork.imageUrl}
                    alt={artwork.title || artwork.imageAiHint}
                    fill
                    priority
                    className="object-contain md:object-cover"
                  />
                  {artwork.isForSale && artwork.price && (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1">
                        ${artwork.price.toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action buttons - desktop only */}
              <div className="hidden md:flex items-center justify-start gap-3 border-t border-border bg-background/90 px-4 py-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(artwork.id);
                  }}
                  disabled={likesLoading}
                  className={`h-12 w-12 rounded-xl border-2 transition ${
                    liked ? 'border-red-500 text-red-500' : ''
                  }`}
                >
                  <HeartIcon className={`h-6 w-6 ${liked ? 'fill-current' : 'fill-none'}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Mobile: Collapsible Artist Banner */}
              <Collapsible 
                open={isBannerExpanded} 
                onOpenChange={setIsBannerExpanded}
                className="md:hidden"
              >
                <div 
                  className="bg-background/95 backdrop-blur-sm border-t border-border"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 px-4 py-3 w-full cursor-pointer">
                      <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarImage
                          src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(40, 40)}
                          alt={artwork.artist.name}
                          className="object-cover"
                        />
                        <AvatarFallback>{artwork.artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate">{artwork.artist.name}</h3>
                          {artwork.artist.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-blue-500 fill-current flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{artwork.artist.handle}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(artwork.id);
                        }}
                        disabled={likesLoading}
                      >
                        <HeartIcon className={`h-5 w-5 ${liked ? 'fill-current text-red-500' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent 
                    className="px-4 pb-4 space-y-3"
                    onClick={(e) => {
                      // Allow clicks inside content but collapse on swipe
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={following ? 'outline' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle();
                        }}
                        className="flex items-center justify-center gap-2 w-full"
                      >
                        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {following ? 'Following' : 'Follow'}
                      </Button>
                      <Button 
                        variant="gradient" 
                        className="flex items-center justify-center gap-2 w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile();
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Profile
                      </Button>
                    </div>
                    
                    {artwork.artist.bio && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {artwork.artist.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="font-bold text-foreground">{artwork.artist.followerCount.toLocaleString()}</span>
                        <span className="ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-bold text-foreground">{artwork.artist.followingCount.toLocaleString()}</span>
                        <span className="ml-1">following</span>
                      </div>
                      {artwork.artist.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{artwork.artist.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Artwork Details
                      </h4>
                      {artwork.title && (
                        <p className="text-sm font-medium text-foreground">{artwork.title}</p>
                      )}
                      {artwork.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{artwork.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {artwork.medium && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {artwork.medium}
                          </Badge>
                        )}
                        {artwork.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs capitalize">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Details - Desktop only */}
            <div className="hidden md:flex w-full md:w-2/5 bg-card border-t md:border-t-0 md:border-l border-border overflow-y-auto">
              <div className="h-full flex flex-col">
                <div className="p-6 space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                        <AvatarImage
                          src={artwork.artist.avatarUrl || generateAvatarPlaceholderUrl(96, 96)}
                          alt={artwork.artist.name}
                          className="object-cover"
                        />
                        <AvatarFallback>{artwork.artist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-bold">{artwork.artist.name}</h2>
                          {artwork.artist.isVerified && (
                            <BadgeCheck className="h-5 w-5 text-blue-500 fill-current" />
                          )}
                        </div>
                        <p className="text-muted-foreground">@{artwork.artist.handle}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Button
                        variant={following ? 'outline' : 'secondary'}
                        onClick={handleFollowToggle}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {following ? 'Following' : 'Follow'}
                      </Button>
                      <Button variant="gradient" className="flex items-center gap-2 w-full sm:w-auto" onClick={handleViewProfile}>
                        <ExternalLink className="h-4 w-4" />
                        View Profile
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{artwork.artist.bio}</p>

                    <div className="flex items-center gap-5 flex-wrap text-sm">
                      <div>
                        <span className="font-bold">{artwork.artist.followerCount.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-bold">{artwork.artist.followingCount.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">following</span>
                      </div>
                      {artwork.artist.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {artwork.artist.location}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Artwork Details
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {artwork.title && <p className="text-base font-medium text-foreground">{artwork.title}</p>}
                      {artwork.description && <p>{artwork.description}</p>}
                      <div className="flex flex-wrap gap-3">
                        {artwork.medium && (
                          <Badge variant="outline" className="capitalize">
                            {artwork.medium}
                          </Badge>
                        )}
                        {artwork.tags?.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="capitalize">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portfolio Item Expanded View */}
      {selectedPortfolioItem && (
        <Dialog open={!!selectedPortfolioItem} onOpenChange={() => setSelectedPortfolioItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">Portfolio Item</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Image */}
              <div className="relative">
                <Image
                  src={selectedPortfolioItem.imageUrl}
                  alt={selectedPortfolioItem.title}
                  width={800}
                  height={600}
                  className="w-full h-auto rounded-lg"
                />
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedPortfolioItem.title}</h3>
                  {selectedPortfolioItem.description && (
                    <p className="text-muted-foreground mt-2">{selectedPortfolioItem.description}</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {selectedPortfolioItem.medium && (
                    <div>
                      <span className="font-medium">Medium:</span>
                      <p className="text-muted-foreground">{selectedPortfolioItem.medium}</p>
                    </div>
                  )}
                  {selectedPortfolioItem.year && (
                    <div>
                      <span className="font-medium">Year:</span>
                      <p className="text-muted-foreground">{selectedPortfolioItem.year}</p>
                    </div>
                  )}
                  {selectedPortfolioItem.tags && selectedPortfolioItem.tags.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPortfolioItem.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Discussion Section */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Discussion</h4>
                  <div className="space-y-3">
                    {/* Mock discussion comments */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={generateAvatarPlaceholderUrl(32, 32)} />
                          <AvatarFallback className="text-xs">JD</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">John Doe</span>
                            <span className="text-xs text-muted-foreground">2 hours ago</span>
                          </div>
                          <p className="text-sm">This piece really captures the emotion beautifully. The use of color is incredible!</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={generateAvatarPlaceholderUrl(32, 32)} />
                          <AvatarFallback className="text-xs">SM</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Sarah Miller</span>
                            <span className="text-xs text-muted-foreground">1 day ago</span>
                          </div>
                          <p className="text-sm">Amazing technique! What inspired this particular composition?</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      className="resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button size="sm">Post Comment</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}