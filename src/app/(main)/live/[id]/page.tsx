'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  Radio, 
  Users, 
  Heart, 
  ArrowLeft, 
  Calendar,
  Clock,
  Share2,
  Bell,
  BellOff,
} from 'lucide-react';
import { useLiveStream } from '@/providers/live-stream-provider';
import { useAuth } from '@/providers/auth-provider';
import { StreamChat } from '@/components/live-stream/stream-chat';
import { MaterialsSidebar } from '@/components/live-stream/materials-sidebar';
import { ThemeLoading } from '@/components/theme-loading';
import { STREAM_TYPE_LABELS } from '@/lib/live-stream-types';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;
  
  const { 
    currentStream, 
    chatMessages, 
    joinStream, 
    leaveStream, 
    likeCurrentStream,
    goLive,
    endStream,
  } = useLiveStream();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  // Join stream on mount
  useEffect(() => {
    if (streamId) {
      joinStream(streamId);
      setIsLoading(false);
    }
    
    return () => {
      leaveStream();
    };
  }, [streamId, joinStream, leaveStream]);

  const handleLike = async () => {
    if (!hasLiked) {
      await likeCurrentStream();
      setHasLiked(true);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: currentStream?.title,
        text: `Watch ${currentStream?.artistName}'s live stream on Gouache`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      // Could show toast here
    }
  };

  const handleSetReminder = () => {
    // In a real implementation, this would register a push notification
    setReminderSet(!reminderSet);
  };

  const handleGoLive = async () => {
    if (currentStream) {
      await goLive(currentStream.id);
    }
  };

  const handleEndStream = async () => {
    if (currentStream) {
      await endStream(currentStream.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading />
      </div>
    );
  }

  if (!currentStream) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Video className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Stream Not Found</h1>
        <p className="text-muted-foreground">This stream may have ended or been removed.</p>
        <Button onClick={() => router.push('/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Learn
        </Button>
      </div>
    );
  }

  const isLive = currentStream.status === 'live';
  const isScheduled = currentStream.status === 'scheduled';
  const isEnded = currentStream.status === 'ended';
  const isOwner = user?.uid === currentStream.artistId;
  const canStartNow = isScheduled && 
    currentStream.scheduledStartTime <= new Date(Date.now() + 15 * 60 * 1000);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="container mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{currentStream.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isLive && (
                <Badge variant="destructive" className="animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
              {isScheduled && (
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(currentStream.scheduledStartTime, 'MMM d, h:mm a')}
                </Badge>
              )}
              {isEnded && (
                <Badge variant="outline">Ended</Badge>
              )}
              <span>{STREAM_TYPE_LABELS[currentStream.streamType]}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {currentStream.viewerCount.toLocaleString()}
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player / Stream Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-black relative">
                {isLive && currentStream.playbackUrl ? (
                  // In a real implementation, this would be a video player component
                  // using HLS.js or similar for the playback URL
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Video className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                      <p>Live Stream Player</p>
                      <p className="text-sm text-white/70">
                        Integration with streaming provider required
                      </p>
                    </div>
                  </div>
                ) : isScheduled ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    {currentStream.thumbnailUrl ? (
                      <img 
                        src={currentStream.thumbnailUrl} 
                        alt={currentStream.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                      />
                    ) : null}
                    <div className="relative z-10 text-center p-6">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h2 className="text-xl font-bold mb-2">Stream Starting Soon</h2>
                      <p className="text-muted-foreground mb-4">
                        {format(currentStream.scheduledStartTime, 'EEEE, MMMM d, yyyy')}
                        <br />
                        {format(currentStream.scheduledStartTime, 'h:mm a')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Starts {formatDistanceToNow(currentStream.scheduledStartTime, { addSuffix: true })}
                      </p>
                      
                      {!isOwner && (
                        <Button 
                          className="mt-4" 
                          variant={reminderSet ? 'outline' : 'default'}
                          onClick={handleSetReminder}
                        >
                          {reminderSet ? (
                            <>
                              <BellOff className="h-4 w-4 mr-2" />
                              Reminder Set
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 mr-2" />
                              Remind Me
                            </>
                          )}
                        </Button>
                      )}
                      
                      {isOwner && canStartNow && (
                        <Button className="mt-4" onClick={handleGoLive}>
                          <Radio className="h-4 w-4 mr-2" />
                          Go Live Now
                        </Button>
                      )}
                    </div>
                  </div>
                ) : isEnded ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {currentStream.recordingUrl ? (
                      <div className="text-center text-white">
                        <Video className="h-16 w-16 mx-auto mb-4" />
                        <p>Stream Replay</p>
                        <Button className="mt-4">Watch Recording</Button>
                      </div>
                    ) : (
                      <div className="text-center text-white">
                        <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-white/70">This stream has ended</p>
                        <p className="text-sm text-white/50 mt-2">No recording available</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Owner Controls Overlay */}
                {isOwner && isLive && (
                  <div className="absolute bottom-4 right-4">
                    <Button variant="destructive" onClick={handleEndStream}>
                      End Stream
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Stream Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Link href={`/profile/${currentStream.artistUsername || currentStream.artistId}`}>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={currentStream.artistAvatar} />
                        <AvatarFallback>{currentStream.artistName?.[0] || 'A'}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link 
                        href={`/profile/${currentStream.artistUsername || currentStream.artistId}`}
                        className="font-semibold hover:underline"
                      >
                        {currentStream.artistName}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {currentStream.totalViews.toLocaleString()} views
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={hasLiked ? 'default' : 'outline'} 
                      size="sm"
                      onClick={handleLike}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
                      {currentStream.likes.toLocaleString()}
                    </Button>
                  </div>
                </div>

                {currentStream.description && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {currentStream.description}
                  </p>
                )}

                {currentStream.tags && currentStream.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {currentStream.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Chat */}
            <div className="h-[400px]">
              <StreamChat
                streamId={currentStream.id}
                messages={chatMessages}
                chatEnabled={currentStream.chatEnabled}
                qaEnabled={currentStream.qaEnabled}
                isArtist={isOwner}
              />
            </div>

            {/* Materials */}
            {currentStream.materials.length > 0 && (
              <MaterialsSidebar
                materials={currentStream.materials}
                streamId={currentStream.id}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
