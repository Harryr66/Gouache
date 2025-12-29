
'use client';

import Image from 'next/image';
import { type Artist } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { artworkData } from '@/lib/data';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function ArtistCard({ artist }: { artist: Artist }) {
    // Only show professional artists
    if (!artist.isProfessional) {
        return null;
    }

    const artistWorks = artworkData.filter(art => art.artist.id === artist.id).slice(0, 3);
    const [isFollowing, setIsFollowing] = useState(false);

    const handleFollowToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFollowing(!isFollowing);
    };
  
    return (
    <Card className="overflow-hidden group flex flex-col h-full text-center">
        <CardContent className="p-6 flex flex-col items-center">
            <Avatar className="h-24 w-24 mb-4 border-4 border-transparent group-hover:border-primary transition-all">
                <AvatarImage src={artist.avatarUrl || 'https://placehold.co/96x96.png'} alt={artist.name} data-ai-hint="artist portrait" />
                <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="font-headline text-xl font-semibold truncate">{artist.name}</h3>
            <p className="text-muted-foreground text-sm">{artist.handle}</p>
            <div className="flex -space-x-2 overflow-hidden mt-4 mb-4 h-12 items-center">
                 {artistWorks.map((work, index) => (
                    <Image
                        key={work.id}
                        className="inline-block h-12 w-12 rounded-full ring-2 ring-background"
                        src={work.imageUrl}
                        alt={work.title}
                        width={48}
                        height={48}
                        data-ai-hint={work.imageAiHint}
                    />
                 ))}
                 {artistWorks.length === 0 && (
                     <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">No recent work</div>
                 )}
            </div>
            <Button 
              variant={isFollowing ? "gradient" : "outline"}
              className="w-full" 
              onClick={handleFollowToggle}
            >
                {isFollowing ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isFollowing ? 'Following' : 'Follow'}
            </Button>
        </CardContent>
    </Card>
  );
}
