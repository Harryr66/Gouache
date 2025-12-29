'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import { extractVideoThumbnail } from '@/lib/video-thumbnail';

interface VideoThumbnailSelectorProps {
  videoFile: File;
  onThumbnailSelected: (thumbnailBlob: Blob) => void;
  initialTime?: number;
}

export function VideoThumbnailSelector({
  videoFile,
  onThumbnailSelected,
  initialTime = 1,
}: VideoThumbnailSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Set initial time
      video.currentTime = Math.min(initialTime, video.duration - 0.1);
      setCurrentTime(Math.min(initialTime, video.duration - 0.1));
      // Extract initial thumbnail
      extractFrameAtTime(Math.min(initialTime, video.duration - 0.1));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Create object URL
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      URL.revokeObjectURL(objectUrl);
    };
  }, [videoFile, initialTime]);

  // Update current time as video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // Extract frame at specific time
  const extractFrameAtTime = async (time: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    try {
      setIsExtracting(true);
      
      // Seek to the desired time
      const previousTime = video.currentTime;
      video.currentTime = Math.min(time, video.duration - 0.1);
      
      // Wait for seek to complete
      await new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(null);
        };
        video.addEventListener('seeked', onSeeked);
      });

      // Draw frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and create preview
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const previewUrl = URL.createObjectURL(blob);
            setThumbnailPreview(previewUrl);
            onThumbnailSelected(blob);
            setIsExtracting(false);
          }
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      console.error('Error extracting frame:', error);
      setIsExtracting(false);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
      extractFrameAtTime(newTime);
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Video player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-auto max-h-[400px]"
          muted
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Play/Pause overlay button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="pointer-events-auto opacity-80 hover:opacity-100"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Time scrubber */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground text-center">
          Drag to select the frame for your thumbnail
        </p>
      </div>

      {/* Thumbnail preview */}
      {thumbnailPreview && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Thumbnail Preview:</p>
          <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border-2 border-muted">
            {isExtracting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

