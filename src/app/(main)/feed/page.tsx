'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FeaturedHero } from '@/components/featured-hero';
import { ContentRow } from '@/components/content-row';
import { DocuseriesCard } from '@/components/docuseries-card';
import { EpisodeCard } from '@/components/episode-card';
import { LoadingTransition } from '@/components/loading-transition';
import { ExpandableContentTile } from '@/components/expandable-content-tile';
import { useWatchlist } from '@/providers/watchlist-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  mockFeaturedContent, 
  mockContinueWatching, 
  mockTrendingNow, 
  mockNewReleases, 
  mockByCategory,
  mockDocuseries 
} from '@/lib/streaming-data';

// Generate SOMA placeholder URLs
const generatePlaceholderUrl = (width: number = 400, height: number = 600) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f5f5f5'; // slightly more off-white for better contrast
  let textColor = '#000000'; // black
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#374151'; // lighter gray for dark mode contrast
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f5f5f5'; // slightly more off-white for better contrast
        textColor = '#000000'; // black
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#374151'; // lighter gray for dark mode contrast
          textColor = '#ffffff'; // white
        }
        // Otherwise keep light mode defaults (off-white with black text)
      }
    } catch (error) {
      // If theme detection fails, keep light mode defaults
      console.warn('Theme detection failed, using light mode defaults:', error);
    }
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};
import { Docuseries, Episode } from '@/lib/types';
import { Filter, X, Play } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CATEGORIES = [
  { id: 'all', name: 'All Styles', count: mockDocuseries.length },
  // Artistic Styles
  { id: 'Abstract', name: 'Abstract', count: 0 },
  { id: 'Realism', name: 'Realism', count: 0 },
  { id: 'Impressionism', name: 'Impressionism', count: 0 },
  { id: 'Expressionism', name: 'Expressionism', count: 0 },
  { id: 'Surrealism', name: 'Surrealism', count: 0 },
  { id: 'Minimalism', name: 'Minimalism', count: 0 },
  { id: 'Pop Art', name: 'Pop Art', count: 0 },
  { id: 'Street Art', name: 'Street Art', count: 0 },
  // Traditional Art Forms
  { id: 'Traditional Art', name: 'Traditional Art', count: mockByCategory['Traditional Art'].length },
  { id: 'Digital Art', name: 'Digital Art', count: mockByCategory['Digital Art'].length },
  { id: 'Sculpture', name: 'Sculpture', count: mockByCategory['Sculpture'].length },
  { id: 'Mixed Media', name: 'Mixed Media', count: mockByCategory['Mixed Media'].length },
  // Mediums
  { id: 'Oil Painting', name: 'Oil Painting', count: 0 },
  { id: 'Acrylic', name: 'Acrylic', count: 0 },
  { id: 'Watercolor', name: 'Watercolor', count: 0 },
  { id: 'Charcoal', name: 'Charcoal', count: 0 },
  { id: 'Pencil', name: 'Pencil', count: 0 },
  { id: 'Ink', name: 'Ink', count: 0 },
  { id: 'Pastel', name: 'Pastel', count: 0 },
  { id: 'Gouache', name: 'Gouache', count: 0 },
  { id: 'Collage', name: 'Collage', count: 0 },
  { id: 'Photography', name: 'Photography', count: 0 },
  { id: 'Printmaking', name: 'Printmaking', count: 0 },
  { id: 'Ceramics', name: 'Ceramics', count: 0 },
  { id: 'Textiles', name: 'Textiles', count: 0 },
  { id: 'Wood', name: 'Wood', count: 0 },
  { id: 'Metal', name: 'Metal', count: 0 },
  { id: 'Stone', name: 'Stone', count: 0 },
  { id: 'Glass', name: 'Glass', count: 0 },
  { id: 'Digital', name: 'Digital', count: 0 },
  { id: '3D Modeling', name: '3D Modeling', count: 0 },
  { id: 'Animation', name: 'Animation', count: 0 },
];

export default function FeedPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [realEpisodes, setRealEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Episode | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Episode | Docuseries | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addToWatchlist, getContinueWatching, isInWatchlist, getWatchProgress } = useWatchlist();

  // Get the main event episode (most recent one marked as main event)
  const mainEventEpisode = useMemo(() => {
    const mainEvents = realEpisodes.filter(episode => episode.isMainEvent);
    console.log('Main event episodes:', mainEvents);
    console.log('Selected main event:', mainEvents.length > 0 ? mainEvents[0] : null);
    return mainEvents.length > 0 ? mainEvents[0] : null;
  }, [realEpisodes]);

  // Fetch real episodes from database
  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const q = query(
          collection(db, 'episodes'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const episodes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Episode[];
        
        console.log('Fetched episodes from Firestore:', episodes);
        console.log('Number of episodes:', episodes.length);
        setRealEpisodes(episodes);
        
        // Set minimum loading time to 1.5 seconds for smooth transition
        setTimeout(() => {
          setMinLoadingComplete(true);
        }, 1500);
        
      } catch (error) {
        console.error('Error fetching episodes:', error);
        setTimeout(() => {
          setMinLoadingComplete(true);
        }, 1500);
      }
    };

    fetchEpisodes();
  }, []);

  // Update loading state when both data is loaded and minimum time has passed
  useEffect(() => {
    if (minLoadingComplete) {
      setLoading(false);
    }
  }, [minLoadingComplete]);

  const convertGoogleDriveUrl = (url: string) => {
    // Google Drive URLs don't work for video playback due to CORS restrictions
    // We need to use Firebase Storage URLs instead
    if (url.includes('drive.google.com')) {
      console.warn('Google Drive URL detected - this will not work for video playback:', url);
      return url; // Return as-is, but it won't work
    }
    return url;
  };

  const handlePlay = (item: Docuseries | Episode) => {
    console.log('Playing:', item.title);
    
    // If it's an Episode, play the video
    if ('videoUrl' in item) {
      const episode = item as Episode;
      console.log('Original video URL:', episode.videoUrl);
      
      // Convert Google Drive URL if needed
      const convertedUrl = convertGoogleDriveUrl(episode.videoUrl);
      console.log('Converted video URL:', convertedUrl);
      
      // Create episode with converted URL
      const episodeWithConvertedUrl = {
        ...episode,
        videoUrl: convertedUrl
      };
      
      setCurrentVideo(episodeWithConvertedUrl);
      setShowVideoPlayer(true);
      setVideoError(null);
      setIsPlaying(true);
    } else {
      // For Docuseries, just log for now
      console.log('Docuseries play not implemented yet');
      setIsPlaying(true);
    }
  };

  const handleExpand = (content: Episode | Docuseries) => {
    console.log('Expanding content:', content.title);
    setExpandedContent(content);
  };

  const handleCloseExpanded = () => {
    setExpandedContent(null);
  };

  const handleManualPlay = async () => {
    if (videoRef.current) {
      try {
        console.log('Manually starting video playback');
        await videoRef.current.play();
        console.log('Video play started successfully');
      } catch (error) {
        console.error('Failed to play video:', error);
        setVideoError('Failed to play video. Please try clicking the play button in the video controls.');
      }
    }
  };

  const handleAddToWatchlist = (docuseriesId: string) => {
    addToWatchlist(docuseriesId);
  };

  const handleShowInfo = () => {
    console.log('Show more info');
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const filteredContent = useMemo(() => {
    // Get most loved episodes from real episodes, ranked by likes
    const mostLovedEpisodes = realEpisodes
      .filter(episode => 
        selectedCategory === 'all' || 
        episode.categories?.includes(selectedCategory) ||
        episode.tags.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase()))
      )
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 6);

    if (selectedCategory === 'all') {
      return {
        trending: mockTrendingNow,
        newReleases: mockNewReleases,
        mostLoved: mostLovedEpisodes
      };
    }
    
    // Check if it's one of the original categories
    const originalCategoryContent = mockByCategory[selectedCategory as keyof typeof mockByCategory];
    if (originalCategoryContent) {
      return {
        trending: originalCategoryContent,
        newReleases: originalCategoryContent,
        mostLoved: mostLovedEpisodes
      };
    }
    
    // For new styles and mediums, filter by tags or category field
    const filteredDocuseries = mockDocuseries.filter(docuseries => {
      const tags = docuseries.tags.map(tag => tag.toLowerCase());
      const categoryLower = docuseries.category.toLowerCase();
      const selectedLower = selectedCategory.toLowerCase();
      
      return tags.includes(selectedLower) || 
             categoryLower.includes(selectedLower) ||
             docuseries.title.toLowerCase().includes(selectedLower);
    });
    
    return {
      trending: filteredDocuseries,
      newReleases: filteredDocuseries,
      mostLoved: mostLovedEpisodes
    };
  }, [selectedCategory, realEpisodes]);

  const activeFiltersCount = selectedCategory !== 'all' ? 1 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Loading Transition */}
      {loading && <LoadingTransition />}
      
      {/* Main Content */}
      {!loading && (
        <>
          {/* Featured Hero Section */}
          {mainEventEpisode ? (
        <div className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[400px] sm:min-h-[500px] md:min-h-[600px] overflow-hidden">
          <video
            src={mainEventEpisode.videoUrl}
            poster={mainEventEpisode.thumbnailUrl || generatePlaceholderUrl(1920, 1080)}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-2 sm:mb-4">{mainEventEpisode.title}</h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 opacity-90 max-w-2xl">{mainEventEpisode.description}</p>
              <div className="flex gap-2 sm:gap-4">
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => handlePlay(mainEventEpisode)}
                  className="sm:size-lg"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="text-sm sm:text-base">Play Now</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <FeaturedHero
          docuseries={mockFeaturedContent}
          isPlaying={isPlaying}
          onPlay={() => handlePlay(mockFeaturedContent)}
          onShowInfo={handleShowInfo}
        />
      )}

      {/* Category Filters */}
    <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter by Style</span>
              <span className="sm:hidden">Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory('all')} className="text-sm">
                <X className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            )}
          </div>
          {selectedCategory !== 'all' && (
            <div className="text-sm text-muted-foreground">
              Showing content from: <span className="font-medium text-foreground">{selectedCategory}</span>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="mb-6 p-4 border rounded-lg bg-card">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.name}
                  <Badge variant="secondary" className="ml-1">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}
        </div>

      {/* Content Rows */}
      <div className="space-y-8 pb-16">
        {/* Continue Watching */}
        <ContentRow
          title="Continue Watching"
          subtitle="Pick up where you left off"
          items={getContinueWatching()}
          type="episodes"
          variant="compact"
          onItemClick={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          getWatchProgress={getWatchProgress}
          onExpand={handleExpand}
        />

        {/* Recently Added Episodes */}
        {(() => {
          const recentEpisodes = realEpisodes.filter(episode => !episode.isMainEvent);
          console.log('Recent episodes for display:', recentEpisodes);
          return recentEpisodes.length > 0 && (
            <ContentRow
              title="Recently Added"
              subtitle="Latest videos from SOMA"
              items={recentEpisodes}
              type="episodes"
              variant="default"
              onItemClick={handlePlay}
              onAddToWatchlist={handleAddToWatchlist}
              isInWatchlist={isInWatchlist}
              getWatchProgress={getWatchProgress}
              onExpand={handleExpand}
            />
          );
        })()}

        {/* New Releases */}
        {filteredContent.newReleases.length > 0 && (
          <ContentRow
            title="New Releases"
            subtitle="Fresh content just added"
            items={filteredContent.newReleases}
            type="docuseries"
            variant="default"
            onItemClick={handlePlay}
            onAddToWatchlist={handleAddToWatchlist}
            isInWatchlist={isInWatchlist}
            onExpand={handleExpand}
          />
        )}

        {/* Most Loved */}
        {filteredContent.mostLoved.length > 0 && (
          <ContentRow
            title="Most Loved"
            subtitle="Most liked videos"
            items={filteredContent.mostLoved}
            type="episodes"
            variant="default"
            onItemClick={handlePlay}
            onAddToWatchlist={handleAddToWatchlist}
            isInWatchlist={isInWatchlist}
            getWatchProgress={getWatchProgress}
            onExpand={handleExpand}
          />
        )}
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && currentVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden">
            <button
              onClick={() => {
                setShowVideoPlayer(false);
                setCurrentVideo(null);
                setIsPlaying(false);
              }}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="aspect-video relative">
              <video
                ref={videoRef}
                src={currentVideo.videoUrl}
                poster={currentVideo.thumbnailUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                muted={false}
                playsInline
                onLoadStart={() => {
                  console.log('Video loading started');
                  console.log('Video URL:', currentVideo.videoUrl);
                }}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded');
                  console.log('Video duration:', videoRef.current?.duration);
                  console.log('Video ready state:', videoRef.current?.readyState);
                }}
                onCanPlay={() => {
                  console.log('Video can play');
                  console.log('Video network state:', videoRef.current?.networkState);
                  // Try to play automatically
                  setTimeout(() => {
                    if (videoRef.current && videoRef.current.paused) {
                      handleManualPlay();
                    }
                  }, 1000);
                }}
                onPlay={() => console.log('Video started playing')}
                onPause={() => console.log('Video paused')}
                onError={(e) => {
                  console.error('Video error:', e);
                  console.error('Video src:', currentVideo.videoUrl);
                  console.error('Video error code:', videoRef.current?.error?.code);
                  console.error('Video error message:', videoRef.current?.error?.message);
                  setVideoError(`Failed to load video. Error: ${videoRef.current?.error?.message || 'Unknown error'}`);
                }}
                onEnded={() => {
                  setShowVideoPlayer(false);
                  setCurrentVideo(null);
                  setIsPlaying(false);
                }}
              />
              
              {videoError && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <p className="text-lg font-semibold mb-2">Video Error</p>
                    <p className="text-sm mb-4">{videoError}</p>
                    <button
                      onClick={handleManualPlay}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">{currentVideo.title}</h2>
              <p className="text-gray-300 mb-4">{currentVideo.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{currentVideo.artist.name}</span>
                <span>•</span>
                <span>{Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}</span>
                <span>•</span>
                <span>{currentVideo.viewCount} views</span>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Expandable Content Tile */}
      {expandedContent && (
        <ExpandableContentTile
          content={expandedContent}
          onClose={handleCloseExpanded}
        />
      )}
    </div>
  );
}
