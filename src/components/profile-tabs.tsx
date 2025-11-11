'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Users, BookOpen, Package, Play, Bookmark, UserPlus, Clock, Heart, ShoppingBag, Brain, Palette, Grid3x3 } from 'lucide-react';
import { ArtworkCard } from './artwork-card';
import { ProductCard } from './shop/product-card';
import { EpisodeCard } from './episode-card';
import { DocuseriesCard } from './docuseries-card';
import { PortfolioManager } from './portfolio-manager';
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
  const { watchlist, watchHistory, getContinueWatching, isInWatchlist, getWatchProgress } = useWatchlist();
  const { followedArtists, unfollowArtist } = useFollow();
  const { courses, isLoading: coursesLoading } = useCourses();
  
  // Get courses by this instructor
  const instructorCourses = courses.filter(course => course.instructor.userId === userId);

  if (isProfessional) {
    return (
      <Tabs defaultValue="portfolio" className="w-full" onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Shop
          </TabsTrigger>
          <TabsTrigger value="learn" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Learn
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          {isOwnProfile ? (
            <PortfolioManager />
          ) : (
            <div className="space-y-4">
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
        <TabsContent value="shop" className="space-y-4">
          <Tabs defaultValue="prints" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prints" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Prints
              </TabsTrigger>
              <TabsTrigger value="originals" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Originals
              </TabsTrigger>
              <TabsTrigger value="books" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Books
              </TabsTrigger>
            </TabsList>

            {/* Prints Sub-tab */}
            <TabsContent value="prints" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual prints data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No prints yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling prints of your artwork by listing your first print."
                      : "This artist doesn't have any prints for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List a Print
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Originals Sub-tab */}
            <TabsContent value="originals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual originals data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No originals yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling original artwork by listing your first piece."
                      : "This artist doesn't have any original artwork for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List an Original
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Books Sub-tab */}
            <TabsContent value="books" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* TODO: Replace with actual books data */}
              </div>

              <Card className="p-8 text-center">
                <CardContent>
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No books yet</CardTitle>
                  <CardDescription className="mb-4">
                    {isOwnProfile 
                      ? "Start selling books by listing your first book."
                      : "This artist doesn't have any books for sale yet."
                    }
                  </CardDescription>
                  {isOwnProfile && (
                    <Button 
                      variant="gradient"
                      onClick={() => window.location.href = '/marketplace/submit'}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      List a Book
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Learn Tab */}
        <TabsContent value="learn" className="space-y-4">
          {isOwnProfile && (
            <div className="flex justify-end">
              <Button variant="gradient" asChild>
                <a href="/learn/submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </a>
              </Button>
            </div>
          )}

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
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                <a href="/discover">Gouache Discover</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
