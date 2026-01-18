'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
  Copy,
  Check,
  Settings,
} from 'lucide-react';
import { useLiveStream } from '@/providers/live-stream-provider';
import { useAuth } from '@/providers/auth-provider';
import { StreamChat } from '@/components/live-stream/stream-chat';
import { MaterialsSidebar } from '@/components/live-stream/materials-sidebar';
import { ThemeLoading } from '@/components/theme-loading';
import { STREAM_TYPE_LABELS } from '@/lib/live-stream-types';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Hls from 'hls.js';

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
  const [streamCredentials, setStreamCredentials] = useState<{
    rtmpUrl?: string;
    streamKey?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showStreamSetup, setShowStreamSetup] = useState(false);
  
  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Join stream on mount
  useEffect(() => {
    if (streamId) {
      joinStream(streamId);
      setIsLoading(false);
    }
    
    return () => {
      leaveStream();
      // Cleanup HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [streamId, joinStream, leaveStream]);
  
  // Initialize HLS player when stream is live
  useEffect(() => {
    const video = videoRef.current;
    const playbackUrl = currentStream?.playbackUrl;
    
    if (!video || !playbackUrl || currentStream?.status !== 'live') {
      return;
    }
    
    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
      });
      
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(console.error);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Try to recover
            hls.startLoad();
          }
        }
      });
      
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = playbackUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(console.error);
      });
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentStream?.playbackUrl, currentStream?.status]);

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
      const result = await goLive(currentStream.id);
      if (result.success && result.rtmpUrl && result.streamKey) {
        setStreamCredentials({
          rtmpUrl: result.rtmpUrl,
          streamKey: result.streamKey,
        });
        setShowStreamSetup(true);
      }
    }
  };
  
  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
                  // HLS Video Player for Cloudflare Stream
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    muted={false}
                  >
                    Your browser does not support video playback.
                  </video>
                ) : isLive && isOwner && showStreamSetup ? (
                  // Streaming Setup for Artist (show RTMP credentials)
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/20 to-background">
                    <Settings className="h-12 w-12 text-primary mb-4" />
                    <h2 className="text-xl font-bold mb-4">Stream Setup</h2>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                      Use these credentials in your streaming software (OBS, Streamlabs, etc.)
                    </p>
                    
                    <div className="w-full max-w-md space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">RTMP URL</label>
                        <div className="flex gap-2">
                          <Input 
                            value={streamCredentials?.rtmpUrl || ''} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button 
                            size="icon" 
                            variant="outline"
                            onClick={() => copyToClipboard(streamCredentials?.rtmpUrl || '', 'rtmp')}
                          >
                            {copiedField === 'rtmp' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Stream Key</label>
                        <div className="flex gap-2">
                          <Input 
                            value={streamCredentials?.streamKey || ''} 
                            readOnly 
                            type="password"
                            className="font-mono text-xs"
                          />
                          <Button 
                            size="icon" 
                            variant="outline"
                            onClick={() => copyToClipboard(streamCredentials?.streamKey || '', 'key')}
                          >
                            {copiedField === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-6">
                      Once you start streaming, viewers will see your video here.
                    </p>
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
