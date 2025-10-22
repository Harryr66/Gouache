import { Artist, Artwork, Post, Discussion, StoryItem } from './types';

export const artists: Artist[] = [
  {
    id: 'elena',
    name: 'Elena Vance',
    handle: 'elena_vance',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    followerCount: 1250,
    followingCount: 89,
    createdAt: new Date('2023-01-15'),
    isVerified: true,
    isProfessional: true,
    location: 'New York, NY',
    socialLinks: {
      instagram: '@elena_vance',
      x: '@elena_vance',
      website: 'https://elena-vance.com'
    }
  },
  {
    id: 'marcus',
    name: 'Marcus Chen',
    handle: 'marcus_chen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    followerCount: 2100,
    followingCount: 156,
    createdAt: new Date('2022-11-20'),
    isVerified: true,
    isProfessional: true,
    location: 'San Francisco, CA',
    socialLinks: {
      instagram: '@marcus_chen',
      x: '@marcus_chen',
      website: 'https://marcus-chen.com'
    }
  },
  {
    id: 'sophia',
    name: 'Sophia Rodriguez',
    handle: 'sophia_art',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    followerCount: 890,
    followingCount: 234,
    createdAt: new Date('2023-03-10'),
    isVerified: false,
    isProfessional: false,
    location: 'Los Angeles, CA',
    socialLinks: {
      instagram: '@sophia_art',
      x: '@sophia_art'
    }
  }
];

export const artworkData: Artwork[] = [
  {
    id: '1',
    artist: artists[0],
    title: 'Abstract Harmony',
    description: 'A vibrant abstract piece exploring the relationship between color and emotion.',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
    imageAiHint: 'Abstract painting with vibrant colors',
    discussionId: 'discussion-1',
    tags: ['abstract', 'color', 'emotion'],
    price: 250,
    currency: 'USD',
    isForSale: true,
    category: 'Abstract',
    medium: 'Oil on Canvas',
    dimensions: { width: 24, height: 30, unit: 'in' },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    views: 156,
    likes: 42,
    isAI: false,
    aiAssistance: 'none'
  },
  {
    id: '2',
    artist: artists[1],
    title: 'Digital Dreams',
    description: 'A futuristic cityscape rendered in digital art, exploring themes of urban isolation.',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop',
    imageAiHint: 'Digital artwork featuring futuristic cityscape',
    discussionId: 'discussion-2',
    tags: ['digital', 'cityscape', 'futuristic'],
    price: 150,
    currency: 'USD',
    isForSale: true,
    category: 'Digital Art',
    medium: 'Digital',
    dimensions: { width: 1920, height: 1080, unit: 'px' },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    views: 89,
    likes: 23,
    isAI: true,
    aiAssistance: 'assisted'
  },
  {
    id: '3',
    artist: artists[2],
    title: 'Ceramic Contemplation',
    description: 'A hand-crafted ceramic sculpture representing the beauty of human contemplation.',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
    imageAiHint: 'Ceramic sculpture of a woman in contemplation',
    discussionId: 'discussion-3',
    tags: ['ceramic', 'sculpture', 'contemplation'],
    price: 500,
    currency: 'USD',
    isForSale: true,
    category: 'Sculpture',
    medium: 'Ceramic',
    dimensions: { width: 12, height: 18, unit: 'in' },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    views: 67,
    likes: 15,
    isAI: false,
    aiAssistance: 'none'
  }
];

export const postData: Post[] = [
  {
    id: '1',
    artworkId: '1',
    artist: artists[0],
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
    imageAiHint: 'Abstract painting with vibrant colors',
    caption: 'Just finished this piece! The colors really came together beautifully. What do you think? #abstract #art #painting',
    likes: 42,
    commentsCount: 8,
    timestamp: '2 hours ago',
    createdAt: Date.now() - 7200000,
    tags: ['abstract', 'art', 'painting']
  },
  {
    id: '2',
    artworkId: '2',
    artist: artists[1],
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop',
    imageAiHint: 'Digital artwork featuring futuristic cityscape',
    caption: 'Working on a new digital series. This is the first piece - exploring themes of urban isolation and connection. #digitalart #cityscape #futuristic',
    likes: 67,
    commentsCount: 12,
    timestamp: '4 hours ago',
    createdAt: Date.now() - 14400000,
    tags: ['digitalart', 'cityscape', 'futuristic']
  },
  {
    id: '3',
    artworkId: '3',
    artist: artists[2],
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
    imageAiHint: 'Ceramic sculpture of a woman in contemplation',
    caption: 'My latest ceramic piece is finally fired and glazed! The process took weeks but I\'m so happy with how it turned out. #ceramics #sculpture #art',
    likes: 34,
    commentsCount: 5,
    timestamp: '6 hours ago',
    createdAt: Date.now() - 21600000,
    tags: ['ceramics', 'sculpture', 'art']
  }
];

export const discussionsData: Discussion[] = [
  {
    id: 'discussion-1',
    title: 'The Future of Digital Art',
    author: artists[1],
    timestamp: '3 hours ago',
    content: 'I\'ve been thinking a lot about how digital art is evolving and what it means for traditional artists. What are your thoughts on the intersection of technology and creativity?',
    upvotes: 15,
    downvotes: 2,
    isPinned: false,
    replyCount: 8,
    tags: ['digital-art', 'technology', 'creativity'],
    category: 'General'
  },
  {
    id: 'discussion-2',
    title: 'Best Practices for Art Pricing',
    author: artists[0],
    timestamp: '1 day ago',
    content: 'I\'m struggling with pricing my artwork. How do you determine the right price for your pieces? Any tips for new artists?',
    upvotes: 23,
    downvotes: 1,
    isPinned: true,
    replyCount: 15,
    tags: ['pricing', 'business', 'advice'],
    category: 'Business'
  },
  {
    id: 'discussion-3',
    title: 'Ceramic Techniques Workshop',
    author: artists[2],
    timestamp: '2 days ago',
    content: 'I\'m hosting a ceramic techniques workshop next month. Would anyone be interested in joining? I\'ll cover basic throwing, glazing, and firing techniques.',
    upvotes: 12,
    downvotes: 0,
    isPinned: false,
    replyCount: 6,
    tags: ['workshop', 'ceramics', 'learning'],
    category: 'Events'
  }
];

export const storyData: StoryItem[] = [
  {
    id: 'story-1',
    artistId: 'elena',
    mediaUrl: '/stories/story-1.jpg',
    mediaType: 'image',
    createdAt: Date.now() - 3600000,
    captionConfigs: [
      {
        id: 'caption-1',
        text: 'Working on something new!',
        color: '#ffffff',
        backgroundColor: '#000000',
        hasBackground: true,
        x: 50,
        y: 80,
        fontSize: 16
      }
    ],
    mediaConfig: {
      scale: 1,
      x: 0,
      y: 0,
      bgColor: '#000000'
    },
    views: 45,
    expiresAt: Date.now() + 86400000
  },
  {
    id: 'story-2',
    artistId: 'marcus',
    mediaUrl: '/stories/story-2.jpg',
    mediaType: 'image',
    createdAt: Date.now() - 7200000,
    captionConfigs: [
      {
        id: 'caption-2',
        text: 'Behind the scenes',
        color: '#ff0000',
        backgroundColor: 'transparent',
        hasBackground: false,
        x: 30,
        y: 20,
        fontSize: 18
      }
    ],
    mediaConfig: {
      scale: 1.2,
      x: 0,
      y: 0,
      bgColor: '#000000'
    },
    views: 78,
    expiresAt: Date.now() + 86400000
  }
];

// Export with the names expected by the components
export const initialPosts = postData;
export const initialArtworks = artworkData;
export const initialDiscussions = discussionsData;
export const initialStoryItems = storyData;
