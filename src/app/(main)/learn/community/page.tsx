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
  const [activeTab, setActiveTab] = useState('bubbles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const { generateAvatarPlaceholderUrl } = usePlaceholder();
  const placeholderUrl = generateAvatarPlaceholderUrl(60, 60);

  const categories = ['all', 'Painting', 'Drawing', 'Sculpture', 'Pottery & Ceramics', 'Books'];

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bubbles">Bubbles</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
                <TabsTrigger value="showcase">Showcase</TabsTrigger>
              </TabsList>

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
