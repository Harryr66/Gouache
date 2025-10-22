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
  Calendar,
  Filter,
  Search,
  Plus,
  Star,
  BookOpen,
  Play,
  Clock,
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
  bubbles: [
    {
      id: 1,
      name: 'Oil Painting Techniques',
      description: 'Discuss oil painting techniques, share tips, and get feedback on your work.',
      members: 45,
      topic: 'Painting',
      isActive: true,
      lastMessage: '2 hours ago',
      level: 'Intermediate'
    },
    {
      id: 2,
      name: 'Digital Art Tools',
      description: 'Share your favorite digital art tools, brushes, and software recommendations.',
      members: 32,
      topic: 'Digital Art',
      isActive: true,
      lastMessage: '5 minutes ago',
      level: 'All Levels'
    },
    {
      id: 3,
      name: 'Gallery Opening Discussion',
      description: 'Chat about the upcoming gallery opening event and coordinate attendance.',
      members: 18,
      topic: 'Events',
      isActive: true,
      lastMessage: '1 hour ago',
      level: 'All Levels'
    },
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
  ]
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('discussions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
  
  const { generateAvatarPlaceholderUrl } = usePlaceholder();
  const placeholderUrl = generateAvatarPlaceholderUrl(60, 60);

  const categories = ['all', 'Painting', 'Drawing', 'Sculpture', 'Pottery & Ceramics', 'Books'];

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
                <TabsTrigger value="bubbles">Bubbles</TabsTrigger>
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
                          <option value="Sculpture">Sculpture</option>
                          <option value="Pottery & Ceramics">Pottery & Ceramics</option>
                          <option value="Books">Books</option>
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

              <TabsContent value="bubbles" className="space-y-4">
                {/* Create New Bubble */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create New Bubble
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Bubble Name</label>
                        <Input placeholder="e.g., Watercolor Techniques Discussion" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <Textarea 
                          placeholder="Describe what this bubble will discuss..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="gradient" className="flex-1">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Bubble
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Bubbles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Active Bubbles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mockCommunityData.bubbles.map((bubble) => (
                      <Card key={bubble.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{bubble.name}</CardTitle>
                            <Badge variant={bubble.isActive ? "default" : "secondary"}>
                              {bubble.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground mb-4">{bubble.description}</p>
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Members</span>
                              <span className="text-sm font-medium">{bubble.members}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Topic</span>
                              <Badge variant="outline" className="text-xs">
                                {bubble.topic}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Last Message</span>
                              <span className="text-sm font-medium">{bubble.lastMessage}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Level</span>
                              <Badge variant="outline" className="text-xs">
                                {bubble.level}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button className="flex-1 gradient-button">
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Join Bubble
                            </Button>
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
            {/* Sidebar content removed - keeping it clean and focused */}
          </div>
        </div>
      </div>
    </div>
  );
}
