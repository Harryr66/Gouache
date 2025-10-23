'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, Calendar, BookOpen, Package, Play, Bookmark, UserPlus, Clock, Heart, ShoppingBag, Brain, MapPin, MessageCircle, Circle, Image as ImageIcon, X } from 'lucide-react';
import { ArtworkCard } from './artwork-card';
import { ProductCard } from './shop/product-card';
import { EventCard } from './event-card';
import { CommunityCard } from './community/community-card';
import { CreateCommunityDialog } from './community/create-community-dialog';
import { EpisodeCard } from './episode-card';
import { DocuseriesCard } from './docuseries-card';
import { PortfolioManager } from './portfolio-manager';
import { SuppliesList } from './supplies-list';
import { useWatchlist } from '@/providers/watchlist-provider';
import { useFollow } from '@/providers/follow-provider';
import { useCourses } from '@/providers/course-provider';
import { mockDocuseries, mockEpisodes } from '@/lib/streaming-data';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ThemeLoading } from './theme-loading';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile: boolean;
  isProfessional: boolean;
  onTabChange?: (tab: string) => void;
}

export function ProfileTabs({ userId, isOwnProfile, isProfessional, onTabChange }: ProfileTabsProps) {
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [communityMessage, setCommunityMessage] = useState('');
  const [communityImages, setCommunityImages] = useState<File[]>([]);
  const [bubbleMessage, setBubbleMessage] = useState('');
  const [bubbleImages, setBubbleImages] = useState<File[]>([]);
  const { watchlist, watchHistory, getContinueWatching, isInWatchlist, getWatchProgress } = useWatchlist();
  const { followedArtists, unfollowArtist } = useFollow();
  const { courses, isLoading: coursesLoading } = useCourses();
  
  // Image handling functions
  const handleImageUpload = (files: FileList | null, setImages: (images: File[]) => void) => {
    if (!files) return;
    const newImages = Array.from(files).slice(0, 4); // Max 4 images
    setImages(prev => [...prev, ...newImages].slice(0, 4)); // Keep max 4 total
  };

  const removeImage = (index: number, setImages: (images: File[]) => void) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (message: string, images: File[], isBubble: boolean = false) => {
    if (!message.trim() && images.length === 0) return;
    
    // TODO: Implement actual message sending to Firestore
    console.log('Sending message:', { message, images, isBubble });
    
    // Clear inputs
    if (isBubble) {
      setBubbleMessage('');
      setBubbleImages([]);
    } else {
      setCommunityMessage('');
      setCommunityImages([]);
    }
  };
  
  // Get courses by this instructor
  const instructorCourses = courses.filter(course => course.instructor.userId === userId);

  if (isProfessional) {
    return (
      <Tabs defaultValue="portfolio" className="w-full" onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="marketplace">Shop</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          {isOwnProfile ? (
            <PortfolioManager />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Artwork Portfolio</h3>
              </div>
              
              {/* TODO: Display other user's portfolio */}
              <Card className="p-8 text-center">
                <CardContent>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No artwork yet</CardTitle>
                  <CardDescription className="mb-4">
                    This artist hasn't uploaded any artwork yet.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Shop Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Learn
              </TabsTrigger>
              <TabsTrigger value="supplies" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Supplies
              </TabsTrigger>
            </TabsList>

            {/* Products Sub-tab */}
            <TabsContent value="products" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Products for Sale</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual product data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No products yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling your artwork by listing your first product."
                      : "This artist doesn't have any products for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List an Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Learn/Courses Sub-tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Learn</h3>
                {isOwnProfile && (
                  <Button variant="gradient" asChild>
                    <a href="/learn/submit">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Course
                    </a>
                  </Button>
                )}
              </div>

              {coursesLoading ? (
                <div className="flex justify-center py-12">
                  <ThemeLoading text="Loading courses..." size="md" />
                </div>
              ) : instructorCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {instructorCourses.map((course) => (
                    <Card key={course.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="relative">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            ${course.price}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2 line-clamp-2">{course.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{course.lessons} lessons</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span>{course.rating.toFixed(1)}</span>
                            <span>({course.reviewCount})</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {course.difficulty}
                          </Badge>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/learn/${course.id}`}>
                              View Course
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <CardContent>
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">No courses yet</CardTitle>
                    <CardDescription className="mb-4">
                      {isOwnProfile 
                        ? "Share your knowledge by creating your first course."
                        : "This instructor hasn't created any courses yet."
                      }
                    </CardDescription>
                    {isOwnProfile && (
                      <Button variant="gradient" asChild>
                        <a href="/learn/submit">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Course
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Supplies Sub-tab */}
            <TabsContent value="supplies" className="space-y-4">
              <SuppliesList isOwnProfile={isOwnProfile} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community" className="space-y-4">
          <Tabs defaultValue="community-chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="community-chat" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Main Chat
              </TabsTrigger>
              <TabsTrigger value="bubbles" className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Chat Bubbles
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Events
              </TabsTrigger>
            </TabsList>

            {/* Community Chat Sub-tab */}
            <TabsContent value="community-chat" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TODO: Replace with actual community data */}
              </div>

              {/* Community Chat Interface */}
              <Card>
                <CardHeader>
                  <CardTitle>Community Chat</CardTitle>
                  <CardDescription>Share messages and images with the community</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Message Input */}
                  <div className="space-y-3">
                    <textarea
                      value={communityMessage}
                      onChange={(e) => setCommunityMessage(e.target.value)}
                      placeholder="Share something with the community..."
                      className="w-full p-3 border rounded-lg resize-none"
                      rows={3}
                    />
                    
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e.target.files, setCommunityImages)}
                          className="hidden"
                          id="community-image-upload"
                        />
                        <label htmlFor="community-image-upload">
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Add Images
                            </span>
                          </Button>
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {communityImages.length}/4 images
                        </span>
                      </div>
                      
                      {/* Preview Images */}
                      {communityImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {communityImages.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                onClick={() => removeImage(index, setCommunityImages)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleSendMessage(communityMessage, communityImages, false)}
                      disabled={!communityMessage.trim() && communityImages.length === 0}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>

            {/* Events Sub-tab */}
            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Upcoming Events</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TODO: Replace with actual event data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No events yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Host your first event to connect with your community."
                      : "This artist hasn't hosted any events yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button variant="gradient">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bubbles Sub-tab */}
            <TabsContent value="bubbles" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Active Bubbles</h3>
                {isOwnProfile && (
                  <Button variant="gradient">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Bubble
                  </Button>
                )}
              </div>

              {/* Bubble Chat Interface */}
              <Card>
                <CardHeader>
                  <CardTitle>Bubble Chat</CardTitle>
                  <CardDescription>Share messages and images in discussion bubbles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Message Input */}
                  <div className="space-y-3">
                    <textarea
                      value={bubbleMessage}
                      onChange={(e) => setBubbleMessage(e.target.value)}
                      placeholder="Share something in the bubble..."
                      className="w-full p-3 border rounded-lg resize-none"
                      rows={3}
                    />
                    
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e.target.files, setBubbleImages)}
                          className="hidden"
                          id="bubble-image-upload"
                        />
                        <label htmlFor="bubble-image-upload">
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Add Images
                            </span>
                          </Button>
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {bubbleImages.length}/4 images
                        </span>
                      </div>
                      
                      {/* Preview Images */}
                      {bubbleImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {bubbleImages.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                onClick={() => removeImage(index, setBubbleImages)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleSendMessage(bubbleMessage, bubbleImages, true)}
                      disabled={!bubbleMessage.trim() && bubbleImages.length === 0}
                      className="w-full"
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      Send to Bubble
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Empty State */}
              <Card className="p-8 text-center">
                <CardContent>
                  <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No bubbles yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Create discussion bubbles for your community."
                      : "This artist hasn't created any discussion bubbles yet."
                    }
                  </CardDescription>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    );
  }

  // Regular user tabs
  return (
    <Tabs defaultValue="watchlist" className="w-full" onValueChange={onTabChange}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        <TabsTrigger value="learn">Learn</TabsTrigger>
        <TabsTrigger value="following">Following</TabsTrigger>
      </TabsList>

      {/* Watchlist Tab - Continue Watching + Bookmarks */}
      <TabsContent value="watchlist" className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Continue Watching</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getContinueWatching().map((episode) => (
            episode && (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                docuseries={mockDocuseries.find(ds => ds.id === episode.docuseriesId)}
                variant="default"
                showProgress={true}
                progress={getWatchProgress(episode.id)}
                onPlay={() => console.log('Play episode:', episode.title)}
              />
            )
          ))}
        </div>

        {getContinueWatching().length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No watch history yet</CardTitle>
              <CardDescription className="mb-4">
                Start watching docuseries to see your continue watching list here.
              </CardDescription>
              <Button asChild variant="gradient">
                <a href="/feed">Start Watching</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bookmarks moved under Watchlist */}
        <div className="flex items-center gap-2 pt-4">
          <Bookmark className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Bookmarked Episodes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => (
            item.docuseries && (
              <DocuseriesCard
                key={item.id}
                docuseries={item.docuseries}
                variant="default"
                onPlay={() => console.log('Play docuseries:', item.docuseries.title)}
                onAddToWatchlist={() => console.log('Already in watchlist')}
              />
            )
          ))}
        </div>

        {watchlist.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No bookmarks yet</CardTitle>
              <CardDescription className="mb-4">
                Save docuseries you want to watch later by adding them to your watchlist.
              </CardDescription>
              <Button asChild variant="gradient">
                <a href="/feed">Browse Content</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Learn Tab - Purchased Courses & Subscribed Communities */}
      <TabsContent value="learn" className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Your Courses</h3>
          </div>
          <Card className="p-6 text-center">
            <CardContent>
              <CardTitle className="mb-2">No courses yet</CardTitle>
              <CardDescription className="mb-4">When you enroll in courses, they will appear here.</CardDescription>
              <Button asChild variant="gradient">
                <a href="/marketplace">Explore Courses</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Communities</h3>
          </div>
          <Card className="p-6 text-center">
            <CardContent>
              <CardTitle className="mb-2">No communities yet</CardTitle>
              <CardDescription className="mb-4">Subscribed communities (free or paid) will show here.</CardDescription>
              <Button asChild variant="outline">
                <a href="/learn/community">Browse Communities</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Following Tab - Followed Artists */}
      <TabsContent value="following" className="space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Following Artists</h3>
          <Badge variant="secondary">{followedArtists.length}</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {followedArtists.map((artist) => (
            <Card key={artist.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={artist.avatarUrl || undefined} alt={artist.name} />
                    <AvatarFallback>{artist.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{artist.name}</h4>
                      {artist.isVerified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{artist.handle}</p>
                    <p className="text-xs text-muted-foreground">
                      {artist.followerCount.toLocaleString()} followers
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unfollowArtist(artist.id)}
                  >
                    Unfollow
                  </Button>
                </div>
                {artist.bio && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {artist.bio}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {followedArtists.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Not following anyone yet</CardTitle>
              <CardDescription className="mb-4">
                Follow artists you love to see their latest content and updates.
              </CardDescription>
              <Button asChild variant="gradient">
                <a href="/discover">SOMA Discover</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Create Community Dialog */}
      {showCreateCommunity && (
        <CreateCommunityDialog 
          onClose={() => setShowCreateCommunity(false)} 
        />
      )}
    </Tabs>
  );
}
