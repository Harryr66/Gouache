'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Heart, 
  Share2, 
  Award, 
  Users, 
  TrendingUp, 
  Calendar,
  Filter,
  Search,
  Plus,
  Star,
  BookOpen,
  Play,
  Clock,
  CheckCircle,
  Zap
} from 'lucide-react';
import { usePlaceholder } from '@/hooks/use-placeholder';

// Mock community data
const mockCommunityData = {
  discussions: [
    {
      id: 1,
      user: {
        name: 'Alex Thompson',
        avatar: '',
        verified: true,
        level: 'Intermediate',
        courses: 5
      },
      title: 'Best brushes for oil painting beginners?',
      content: 'I\'m just starting out with oil painting and wondering what brushes you\'d recommend. I\'ve heard mixed things about synthetic vs natural bristles.',
      date: '2024-01-20',
      replies: 12,
      likes: 23,
      category: 'Painting',
      tags: ['oil-painting', 'brushes', 'beginner'],
      isPinned: false,
      isTrending: true
    },
    {
      id: 2,
      user: {
        name: 'Maria Rodriguez',
        avatar: '',
        verified: false,
        level: 'Advanced',
        courses: 12
      },
      title: 'Color theory tips for digital artists',
      content: 'Does anyone have tips for achieving more vibrant colors in digital art? I feel like my colors are coming out muddy and desaturated.',
      date: '2024-01-18',
      replies: 18,
      likes: 31,
      category: 'Digital Art',
      tags: ['color-theory', 'digital-art', 'techniques'],
      isPinned: true,
      isTrending: false
    },
    {
      id: 3,
      user: {
        name: 'David Chen',
        avatar: '',
        verified: true,
        level: 'Intermediate',
        courses: 8
      },
      title: 'Showcase: My latest watercolor landscape',
      content: 'Just finished this watercolor landscape inspired by the course. Would love feedback on the composition and color choices!',
      date: '2024-01-15',
      replies: 25,
      likes: 45,
      category: 'Painting',
      tags: ['watercolor', 'landscape', 'showcase'],
      isPinned: false,
      isTrending: true
    }
  ],
  studyGroups: [
    {
      id: 1,
      name: 'Oil Painting Study Group',
      description: 'Weekly meetups for oil painting enthusiasts to practice together and share techniques.',
      members: 45,
      nextMeeting: '2024-01-25',
      course: 'Master Oil Painting Techniques',
      level: 'Intermediate'
    },
    {
      id: 2,
      name: 'Digital Art Beginners',
      description: 'Support group for those new to digital art. Share progress, ask questions, and learn together.',
      members: 78,
      nextMeeting: '2024-01-23',
      course: 'Digital Art Fundamentals',
      level: 'Beginner'
    }
  ],
  challenges: [
    {
      id: 1,
      title: '30-Day Drawing Challenge',
      description: 'Draw something every day for 30 days and share your progress with the community.',
      participants: 156,
      daysLeft: 12,
      category: 'Drawing',
      difficulty: 'Beginner'
    },
    {
      id: 2,
      title: 'Color Theory Mastery',
      description: 'Complete 10 color theory exercises and create a final project showcasing your understanding.',
      participants: 89,
      daysLeft: 8,
      category: 'Theory',
      difficulty: 'Intermediate'
    }
  ],
  achievements: [
    {
      id: 1,
      title: 'First Course Completed',
      description: 'Congratulations on completing your first course!',
      icon: '🎓',
      earned: true,
      date: '2024-01-10'
    },
    {
      id: 2,
      title: 'Community Helper',
      description: 'Helped 10 fellow students with their questions.',
      icon: '🤝',
      earned: true,
      date: '2024-01-15'
    },
    {
      id: 3,
      title: 'Art Showcase',
      description: 'Shared your artwork with the community.',
      icon: '🎨',
      earned: false,
      date: null
    }
  ]
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('discussions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
  
  const placeholderUrl = usePlaceholder(60, 60);

  const categories = ['all', 'Painting', 'Drawing', 'Digital Art', 'Sculpture', 'Photography', 'Art History'];

  const filteredDiscussions = mockCommunityData.discussions.filter(discussion => {
    const matchesSearch = discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         discussion.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || discussion.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.title.trim() && newPost.content.trim()) {
      console.log('New post:', newPost);
      setNewPost({ title: '', content: '', category: 'General' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                SOMA Community
              </h1>
              <p className="text-muted-foreground mt-1">
                Connect with fellow artists, share your work, and learn together
              </p>
            </div>
            <Button className="gradient-button">
              <Plus className="h-4 w-4 mr-2" />
              Start Discussion
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search discussions, topics, or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-4"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="discussions">Discussions</TabsTrigger>
                <TabsTrigger value="study-groups">Study Groups</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
                <TabsTrigger value="showcase">Showcase</TabsTrigger>
              </TabsList>

              <TabsContent value="discussions" className="space-y-4">
                {/* New Post Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Start a Discussion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitPost} className="space-y-4">
                      <div>
                        <Input
                          placeholder="Discussion title"
                          value={newPost.title}
                          onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="What would you like to discuss?"
                          value={newPost.content}
                          onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                          className="min-h-[100px]"
                          required
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <select
                          value={newPost.category}
                          onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                          className="px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="General">General</option>
                          <option value="Painting">Painting</option>
                          <option value="Drawing">Drawing</option>
                          <option value="Digital Art">Digital Art</option>
                          <option value="Sculpture">Sculpture</option>
                          <option value="Photography">Photography</option>
                          <option value="Art History">Art History</option>
                        </select>
                        <Button type="submit" className="gradient-button">
                          Post Discussion
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Discussions List */}
                <div className="space-y-4">
                  {filteredDiscussions.map((discussion) => (
                    <Card key={discussion.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarImage src={placeholderUrl} alt={discussion.user.name} />
                            <AvatarFallback>{discussion.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{discussion.user.name}</span>
                              {discussion.user.verified && (
                                <Award className="h-4 w-4 text-primary" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {discussion.user.level}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {discussion.user.courses} courses
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {discussion.date}
                              </span>
                            </div>
                            
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                                {discussion.title}
                              </h3>
                              <div className="flex gap-2">
                                {discussion.isPinned && (
                                  <Badge variant="secondary">Pinned</Badge>
                                )}
                                {discussion.isTrending && (
                                  <Badge className="bg-orange-500">Trending</Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-muted-foreground mb-4">{discussion.content}</p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4">
                                <Button variant="ghost" size="sm">
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  {discussion.replies} replies
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Heart className="h-4 w-4 mr-2" />
                                  {discussion.likes}
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </Button>
                              </div>
                              <div className="flex gap-1">
                                {discussion.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="study-groups" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockCommunityData.studyGroups.map((group) => (
                    <Card key={group.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{group.description}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Members</span>
                            <span className="text-sm font-medium">{group.members}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Next Meeting</span>
                            <span className="text-sm font-medium">{group.nextMeeting}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Course</span>
                            <span className="text-sm font-medium">{group.course}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Level</span>
                            <Badge variant="outline" className="text-xs">
                              {group.level}
                            </Badge>
                          </div>
                        </div>
                        <Button className="w-full gradient-button">
                          Join Group
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="challenges" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockCommunityData.challenges.map((challenge) => (
                    <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          {challenge.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{challenge.description}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Participants</span>
                            <span className="text-sm font-medium">{challenge.participants}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Days Left</span>
                            <span className="text-sm font-medium text-orange-500">{challenge.daysLeft}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Category</span>
                            <Badge variant="outline" className="text-xs">
                              {challenge.category}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Difficulty</span>
                            <Badge variant="outline" className="text-xs">
                              {challenge.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <Button className="w-full gradient-button">
                          Join Challenge
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="showcase" className="space-y-4">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-semibold mb-2">Art Showcase</h3>
                  <p className="text-muted-foreground mb-6">
                    Share your artwork with the community and get feedback from fellow artists.
                  </p>
                  <Button className="gradient-button">
                    <Plus className="h-4 w-4 mr-2" />
                    Share Your Art
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockCommunityData.achievements.map((achievement) => (
                    <div key={achievement.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      achievement.earned ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/50'
                    }`}>
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        {achievement.earned && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Earned {achievement.date}
                          </p>
                        )}
                      </div>
                      {achievement.earned && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Courses Completed</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discussions Started</span>
                  <span className="font-medium">7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Artworks Shared</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Community Points</span>
                  <span className="font-medium">1,247</span>
                </div>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trending Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Oil Painting Techniques', 'Digital Art Tools', 'Color Theory', 'Figure Drawing', 'Watercolor Tips'].map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <span className="text-sm">{topic}</span>
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
