'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  Users, 
  Calendar, 
  Clock, 
  Radio,
  Play,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { LiveStream, STREAM_TYPE_LABELS, STREAM_STATUS_LABELS } from '@/lib/live-stream-types';
import { formatDistanceToNow, format } from 'date-fns';

interface StreamCardProps {
  stream: LiveStream;
  showArtist?: boolean;
  isOwner?: boolean;
  onGoLive?: () => void;
  onCancel?: () => void;
  onEnd?: () => void;
}

export function StreamCard({ 
  stream, 
  showArtist = true, 
  isOwner = false,
  onGoLive,
  onCancel,
  onEnd,
}: StreamCardProps) {
  const isLive = stream.status === 'live';
  const isScheduled = stream.status === 'scheduled';
  const isEnded = stream.status === 'ended';
  
  const scheduledTime = stream.scheduledStartTime;
  const isUpcoming = isScheduled && scheduledTime > new Date();
  const canStartNow = isScheduled && scheduledTime <= new Date(Date.now() + 15 * 60 * 1000); // Can start 15 mins early

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail / Preview */}
      <div className="relative aspect-video bg-muted">
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Video className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          {isLive && (
            <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
              <Radio className="h-3 w-3" />
              LIVE
            </Badge>
          )}
          {isScheduled && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(scheduledTime, 'MMM d, h:mm a')}
            </Badge>
          )}
          {isEnded && stream.recordingUrl && (
            <Badge variant="outline" className="flex items-center gap-1 bg-background/80">
              <Play className="h-3 w-3" />
              Replay
            </Badge>
          )}
        </div>

        {/* Viewer Count (for live streams) */}
        {isLive && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="flex items-center gap-1 bg-background/80">
              <Users className="h-3 w-3" />
              {stream.viewerCount.toLocaleString()}
            </Badge>
          </div>
        )}

        {/* Stream Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="bg-background/80 text-xs">
            {STREAM_TYPE_LABELS[stream.streamType]}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <Link href={`/live/${stream.id}`} className="hover:underline">
          <h3 className="font-semibold line-clamp-2">{stream.title}</h3>
        </Link>

        {/* Artist Info */}
        {showArtist && (
          <Link 
            href={`/profile/${stream.artistUsername || stream.artistId}`}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={stream.artistAvatar} />
              <AvatarFallback>{stream.artistName?.[0] || 'A'}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{stream.artistName}</span>
          </Link>
        )}

        {/* Stream Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {isUpcoming && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(scheduledTime, { addSuffix: true })}
            </span>
          )}
          {stream.chatEnabled && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              Chat
            </span>
          )}
          {stream.qaEnabled && (
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Q&A
            </span>
          )}
          {!stream.isFree && stream.price && (
            <Badge variant="outline" className="text-xs">
              ${stream.price}
            </Badge>
          )}
        </div>

        {/* Materials Count */}
        {stream.materials.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {stream.materials.length} material{stream.materials.length > 1 ? 's' : ''} listed
          </p>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <div className="flex gap-2 pt-2 border-t">
            {isScheduled && canStartNow && (
              <Button size="sm" onClick={onGoLive} className="flex-1">
                <Radio className="h-3 w-3 mr-1" />
                Go Live
              </Button>
            )}
            {isScheduled && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {isLive && (
              <Button size="sm" variant="destructive" onClick={onEnd} className="flex-1">
                End Stream
              </Button>
            )}
          </div>
        )}

        {/* Join Button (for viewers) */}
        {!isOwner && isLive && (
          <Link href={`/live/${stream.id}`} className="block">
            <Button className="w-full" size="sm">
              <Play className="h-3 w-3 mr-1" />
              Watch Now
            </Button>
          </Link>
        )}

        {!isOwner && isScheduled && (
          <Link href={`/live/${stream.id}`} className="block">
            <Button variant="outline" className="w-full" size="sm">
              <Calendar className="h-3 w-3 mr-1" />
              Set Reminder
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
