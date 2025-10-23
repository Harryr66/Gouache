'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, Calendar, BookOpen, Package, Play, Bookmark, UserPlus, Clock, Heart, ShoppingBag, Brain, MapPin, MessageCircle, Circle } from 'lucide-react';
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
  const { watchlist, watchHistory, getContinueWatching, isInWatchlist, getWatchProgress } = useWatchlist();
  const { followedArtists, unfollowArtist } = useFollow();
  const { courses, isLoading: coursesLoading } = useCourses();
  
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

              <Card className="p-8 text-center">
                <CardContent>
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No community yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Create a community to connect with your followers and fans."
                      : "This artist hasn't created a community yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => setShowCreateCommunity(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Start Community
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TODO: Replace with actual bubble data */}
              </div>

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
                  {isOwnProfile && (
                    <Button variant="gradient">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Bubble
                    </Button>
                  )}
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
