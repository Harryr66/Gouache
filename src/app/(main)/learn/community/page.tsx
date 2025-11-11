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

// Type definitions
interface Message {
  id: number;
  user: string;
  content: string;
  timestamp: string;
  avatar: string;
}

interface Bubble {
  id: number;
  name: string;
  description: string;
  members: number;
  topic: string;
  isActive: boolean;
  lastMessage: string;
  level: string;
  messages: Message[];
  host: string;
  membersList: string[];
}

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
      level: 'Intermediate',
      messages: [],
      host: 'Community Host',
      membersList: ['Community Host', 'Alex Thompson', 'Sarah Chen']
    },
    {
      id: 2,
      name: 'Digital Art Tools',
      description: 'Share your favorite digital art tools, brushes, and software recommendations.',
      members: 32,
      topic: 'Digital Art',
      isActive: true,
      lastMessage: '5 minutes ago',
      level: 'All Levels',
      messages: [],
      host: 'Community Host',
      membersList: ['Community Host', 'Mike Rodriguez', 'Emma Wilson']
    },
    {
      id: 3,
      name: 'Gallery Opening Discussion',
      description: 'Chat about the upcoming gallery opening event and coordinate attendance.',
      members: 18,
      topic: 'Events',
      isActive: true,
      lastMessage: '1 hour ago',
      level: 'All Levels',
      messages: [],
      host: 'Community Host',
      membersList: ['Community Host', 'David Kim', 'Lisa Park']
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
      difficulty: 'Beginner',
      createdBy: 'Community Host',
      createdAt: '2024-01-10'
    },
    {
      id: 2,
      title: 'Color Theory Mastery',
      description: 'Complete 10 color theory exercises and create a final project showcasing your understanding.',
      participants: 89,
      daysLeft: 8,
      category: 'Theory',
      difficulty: 'Intermediate',
      createdBy: 'Community Host',
      createdAt: '2024-01-15'
    }
  ]
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('community-chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Bubble management states
  const [bubbles, setBubbles] = useState<Bubble[]>(mockCommunityData.bubbles);
  const [selectedBubble, setSelectedBubble] = useState<Bubble | null>(null);
  const [newBubbleName, setNewBubbleName] = useState('');
  const [newBubbleDescription, setNewBubbleDescription] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isHost, setIsHost] = useState(true); // Mock: user is community host
  
  // Challenge management states
  const [challenges, setChallenges] = useState(mockCommunityData.challenges);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'Beginner',
    duration: 30
  });
  
  const { generateAvatarPlaceholderUrl } = usePlaceholder();
  const placeholderUrl = generateAvatarPlaceholderUrl(60, 60);

  const categories = ['all', 'Painting', 'Drawing', 'Sculpture', 'Pottery & Ceramics', 'Books'];

  // Bubble management functions
  const handleCreateBubble = () => {
    if (newBubbleName.trim() && newBubbleDescription.trim()) {
      const newBubble = {
        id: bubbles.length + 1,
        name: newBubbleName,
        description: newBubbleDescription,
        members: 1,
        topic: 'General',
        isActive: true,
        lastMessage: 'Just now',
        level: 'All Levels',
        messages: [],
        host: 'You',
        membersList: ['You']
      };
      setBubbles([...bubbles, newBubble]);
      setNewBubbleName('');
      setNewBubbleDescription('');
    }
  };

  const handleJoinBubble = (bubbleId: number) => {
    setBubbles(bubbles.map(bubble => 
      bubble.id === bubbleId 
        ? { ...bubble, members: bubble.members + 1, membersList: [...(bubble.membersList || []), 'You'] }
        : bubble
    ));
  };

  const handleLeaveBubble = (bubbleId: number) => {
    setBubbles(bubbles.map(bubble => 
      bubble.id === bubbleId 
        ? { ...bubble, members: Math.max(0, bubble.members - 1), membersList: (bubble.membersList || []).filter(member => member !== 'You') }
        : bubble
    ));
  };

  const handleSendMessage = (bubbleId: number) => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        user: 'You',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString(),
        avatar: ''
      };
      
      setBubbles(bubbles.map(bubble => 
        bubble.id === bubbleId 
          ? { 
              ...bubble, 
              messages: [...(bubble.messages || []), message],
              lastMessage: 'Just now'
            }
          : bubble
      ));
      setNewMessage('');
    }
  };

  const handleRemoveUser = (bubbleId: number, username: string) => {
    setBubbles(bubbles.map(bubble => 
      bubble.id === bubbleId 
        ? { 
            ...bubble, 
            members: Math.max(0, bubble.members - 1),
            membersList: (bubble.membersList || []).filter(member => member !== username)
          }
        : bubble
    ));
  };

  // Challenge management functions
  const handleCreateChallenge = () => {
    if (newChallenge.title.trim() && newChallenge.description.trim()) {
      const challenge = {
        id: challenges.length + 1,
        title: newChallenge.title,
        description: newChallenge.description,
        participants: 0,
        daysLeft: newChallenge.duration,
        category: newChallenge.category,
        difficulty: newChallenge.difficulty,
        createdBy: 'You',
        createdAt: new Date().toLocaleDateString()
      };
      setChallenges([...challenges, challenge]);
      setNewChallenge({ title: '', description: '', category: 'General', difficulty: 'Beginner', duration: 30 });
      setShowCreateChallenge(false);
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
                Gouache Community
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
                <TabsTrigger value="community-chat">Community Chat</TabsTrigger>
                <TabsTrigger value="bubbles">Bubbles</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
              </TabsList>

              <TabsContent value="community-chat" className="space-y-4">
                {/* Main Community Chat */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Community Chat
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Join the main community discussion and connect with fellow artists
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Chat Messages */}
                      <div className="h-96 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/20">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={placeholderUrl} alt="Alex Thompson" />
                            <AvatarFallback>AT</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">Alex Thompson</span>
                              <span className="text-xs text-muted-foreground">2 hours ago</span>
                            </div>
                            <p className="text-sm">Welcome everyone! Excited to see all the amazing artwork being shared here. 🎨</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={placeholderUrl} alt="Sarah Chen" />
                            <AvatarFallback>SC</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">Sarah Chen</span>
                              <span className="text-xs text-muted-foreground">1 hour ago</span>
                            </div>
                            <p className="text-sm">Just finished my first watercolor painting! Any tips for beginners?</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={placeholderUrl} alt="Mike Rodriguez" />
                            <AvatarFallback>MR</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">Mike Rodriguez</span>
                              <span className="text-xs text-muted-foreground">30 minutes ago</span>
                            </div>
                            <p className="text-sm">@Sarah Chen Great work! Try using less water initially and build up layers gradually. Practice makes perfect! 💪</p>
                          </div>
                        </div>

                        <div className="text-center text-muted-foreground py-4">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">More messages will appear here as the community grows...</p>
                        </div>
                      </div>
                      
                      {/* Message Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Share your thoughts with the community..."
                          className="flex-1"
                        />
                        <Button>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Community Guidelines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Community Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Be respectful and supportive of fellow artists</p>
                      <p>• Share constructive feedback and encouragement</p>
                      <p>• Keep discussions relevant to art and creativity</p>
                      <p>• Report any inappropriate behavior to community hosts</p>
                    </div>
                  </CardContent>
                </Card>
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
                        <Input 
                          placeholder="e.g., Watercolor Techniques Discussion" 
                          value={newBubbleName}
                          onChange={(e) => setNewBubbleName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <Textarea 
                          placeholder="Describe what this bubble will discuss..."
                          rows={3}
                          value={newBubbleDescription}
                          onChange={(e) => setNewBubbleDescription(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="gradient" 
                          className="flex-1"
                          onClick={handleCreateBubble}
                        >
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
                    {bubbles.map((bubble) => {
                      const isJoined = bubble.membersList?.includes('You') || false;
                      const isHost = bubble.host === 'You';
                      
                      return (
                        <Card key={bubble.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{bubble.name}</CardTitle>
                              <div className="flex gap-2">
                                <Badge variant={bubble.isActive ? "default" : "secondary"}>
                                  {bubble.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {isHost && (
                                  <Badge variant="outline" className="text-xs">
                                    Host
                                  </Badge>
                                )}
                              </div>
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
                              {isJoined ? (
                                <>
                                  <Button 
                                    className="flex-1 gradient-button"
                                    onClick={() => setSelectedBubble(bubble)}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Open Chat
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleLeaveBubble(bubble.id)}
                                  >
                                    Leave
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  className="flex-1 gradient-button"
                                  onClick={() => handleJoinBubble(bubble.id)}
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Join Bubble
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <Users className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="challenges" className="space-y-4">
                {/* Host Controls */}
                {isHost && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Host Controls
                        </CardTitle>
                        <Button 
                          variant="gradient"
                          onClick={() => setShowCreateChallenge(!showCreateChallenge)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Challenge
                        </Button>
                      </div>
                    </CardHeader>
                    {showCreateChallenge && (
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Challenge Title</label>
                            <Input 
                              placeholder="e.g., 30-Day Drawing Challenge"
                              value={newChallenge.title}
                              onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Textarea 
                              placeholder="Describe the challenge..."
                              rows={3}
                              value={newChallenge.description}
                              onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Category</label>
                              <select 
                                value={newChallenge.category}
                                onChange={(e) => setNewChallenge({...newChallenge, category: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md bg-background"
                              >
                                <option value="General">General</option>
                                <option value="Painting">Painting</option>
                                <option value="Drawing">Drawing</option>
                                <option value="Sculpture">Sculpture</option>
                                <option value="Digital Art">Digital Art</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Difficulty</label>
                              <select 
                                value={newChallenge.difficulty}
                                onChange={(e) => setNewChallenge({...newChallenge, difficulty: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md bg-background"
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Duration (days)</label>
                            <Input 
                              type="number"
                              placeholder="30"
                              value={newChallenge.duration}
                              onChange={(e) => setNewChallenge({...newChallenge, duration: parseInt(e.target.value) || 30})}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="gradient" 
                              className="flex-1"
                              onClick={handleCreateChallenge}
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Create Challenge
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => setShowCreateChallenge(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Challenges List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {challenges.map((challenge) => (
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
                          {challenge.createdBy && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Created by</span>
                              <span className="text-sm font-medium">{challenge.createdBy}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button className="flex-1 gradient-button">
                            <Star className="h-4 w-4 mr-2" />
                            Join Challenge
                          </Button>
                          {isHost && challenge.createdBy === 'You' && (
                            <Button variant="outline" size="sm">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

            </Tabs>
          </div>

          {/* Bubble Chat Modal */}
          {selectedBubble && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedBubble.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedBubble.members} members</p>
                    </div>
                    <div className="flex gap-2">
                      {isHost && (
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Members
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedBubble(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg bg-muted/20">
                    {selectedBubble.messages?.length > 0 ? (
                      selectedBubble.messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={placeholderUrl} alt={message.user} />
                            <AvatarFallback>{message.user[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{message.user}</span>
                              <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(selectedBubble.id)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleSendMessage(selectedBubble.id)}
                      disabled={!newMessage.trim()}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sidebar content removed - keeping it clean and focused */}
          </div>
        </div>
      </div>
    </div>
  );
}
