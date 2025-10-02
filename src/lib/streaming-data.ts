import { Docuseries, Episode, Artist } from './types';

// Generate SOMA placeholder URLs
const generatePlaceholderUrl = (width: number = 400, height: number = 600) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f8f9fa'; // very light gray
  let textColor = '#6b7280'; // medium gray
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#1f2937'; // dark gray
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f8f9fa'; // very light gray
        textColor = '#6b7280'; // medium gray
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#1f2937'; // dark gray
          textColor = '#ffffff'; // white
        }
        // Otherwise keep light mode defaults
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

// Generate SOMA avatar placeholder URLs
const generateAvatarPlaceholderUrl = (width: number = 150, height: number = 150) => {
  // Default to light mode colors, will be overridden by theme detection
  let backgroundColor = '#f8f9fa'; // very light gray
  let textColor = '#6b7280'; // medium gray
  
  // Try to detect theme if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Check for explicit light/dark class
      if (document.documentElement.classList.contains('dark')) {
        backgroundColor = '#1f2937'; // dark gray
        textColor = '#ffffff'; // white
      } else if (document.documentElement.classList.contains('light')) {
        backgroundColor = '#f8f9fa'; // very light gray
        textColor = '#6b7280'; // medium gray
      } else {
        // No explicit theme class, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          backgroundColor = '#1f2937'; // dark gray
          textColor = '#ffffff'; // white
        }
        // Otherwise keep light mode defaults
      }
    } catch (error) {
      // If theme detection fails, keep light mode defaults
      console.warn('Theme detection failed, using light mode defaults:', error);
    }
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">SOMA</text>
    </svg>
  `)}`;
};

// Mock Artists
const mockArtists: Artist[] = [
  {
    id: 'elena-vance',
    name: 'Elena Vance',
    handle: 'elena_vance',
    avatarUrl: generateAvatarPlaceholderUrl(150, 150),
    followerCount: 1250,
    followingCount: 89,
    createdAt: new Date('2023-01-15'),
    isVerified: true,
    isProfessional: true,
    location: 'New York, NY',
    bio: 'Abstract expressionist painter exploring the intersection of color and emotion.',
    socialLinks: {
      instagram: '@elena_vance',
      website: 'elena-vance.com'
    }
  },
  {
    id: 'marcus-chen',
    name: 'Marcus Chen',
    handle: 'marcus_chen',
    avatarUrl: generateAvatarPlaceholderUrl(150, 150),
    followerCount: 2100,
    followingCount: 156,
    createdAt: new Date('2022-11-20'),
    isVerified: true,
    isProfessional: true,
    location: 'Los Angeles, CA',
    bio: 'Digital artist creating futuristic cityscapes and urban narratives.',
    socialLinks: {
      instagram: '@marcus_chen',
      website: 'marcuschen.art'
    }
  },
  {
    id: 'sophia-rodriguez',
    name: 'Sophia Rodriguez',
    handle: 'sophia_art',
    avatarUrl: generateAvatarPlaceholderUrl(150, 150),
    followerCount: 890,
    followingCount: 234,
    createdAt: new Date('2023-03-10'),
    isVerified: false,
    isProfessional: true,
    location: 'Miami, FL',
    bio: 'Ceramic sculptor exploring themes of femininity and nature.',
    socialLinks: {
      instagram: '@sophia_art',
      website: 'sophiarodriguez.art'
    }
  },
  {
    id: 'alex-kim',
    name: 'Alex Kim',
    handle: 'alex_kim',
    avatarUrl: generateAvatarPlaceholderUrl(150, 150),
    followerCount: 3200,
    followingCount: 180,
    createdAt: new Date('2022-08-15'),
    isVerified: true,
    isProfessional: true,
    location: 'Seattle, WA',
    bio: 'Mixed media artist bridging traditional and digital techniques.',
    socialLinks: {
      instagram: '@alex_kim',
      website: 'alexkim.studio'
    }
  }
];

// Mock Episodes
const mockEpisodes: Episode[] = [
  {
    id: 'ep-1',
    docuseriesId: 'ds-1',
    title: 'The Color of Emotion',
    description: 'Elena explores how different colors evoke specific emotions in her abstract paintings.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    duration: 480, // 8 minutes
    episodeNumber: 1,
    seasonNumber: 1,
    releaseDate: new Date('2024-01-15'),
    viewCount: 12500,
    likes: 450,
    commentsCount: 89,
    isPublished: true,
    isFeatured: true,
    isMainEvent: true,
    tags: ['abstract', 'painting', 'emotion', 'color'],
    categories: ['Oil Painting', 'Acrylic'],
    displayLocation: 'new-releases',
    likedBy: ['user1', 'user2', 'user3'],
    artist: mockArtists[0],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'ep-2',
    docuseriesId: 'ds-1',
    title: 'Finding Inspiration in Chaos',
    description: 'A deep dive into Elena\'s creative process and how she finds beauty in unexpected places.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
    duration: 720, // 12 minutes
    episodeNumber: 2,
    seasonNumber: 1,
    releaseDate: new Date('2024-01-22'),
    viewCount: 8900,
    likes: 320,
    commentsCount: 67,
    isPublished: true,
    isFeatured: false,
    isMainEvent: false,
    tags: ['inspiration', 'process', 'creativity'],
    categories: ['Watercolor', 'Mixed Media'],
    displayLocation: 'new-releases',
    likedBy: ['user4', 'user5'],
    artist: mockArtists[0],
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: 'ep-3',
    docuseriesId: 'ds-2',
    title: 'Digital Dreams',
    description: 'Marcus takes us through his digital art creation process using cutting-edge technology.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    duration: 600, // 10 minutes
    episodeNumber: 1,
    seasonNumber: 1,
    releaseDate: new Date('2024-01-20'),
    viewCount: 15600,
    likes: 680,
    commentsCount: 124,
    isPublished: true,
    isFeatured: true,
    isMainEvent: false,
    tags: ['digital', 'technology', 'futuristic', 'cityscape'],
    categories: ['Digital', '3D Modeling'],
    displayLocation: 'new-releases',
    likedBy: ['user6', 'user7', 'user8', 'user9'],
    artist: mockArtists[1],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'ep-4',
    docuseriesId: 'ds-3',
    title: 'Clay and Soul',
    description: 'Sophia demonstrates her ceramic sculpting techniques and the meditative quality of working with clay.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
    duration: 900, // 15 minutes
    episodeNumber: 1,
    seasonNumber: 1,
    releaseDate: new Date('2024-01-25'),
    viewCount: 7800,
    likes: 290,
    commentsCount: 45,
    isPublished: true,
    isFeatured: false,
    isMainEvent: false,
    tags: ['ceramics', 'sculpture', 'meditation', 'process'],
    categories: ['Ceramics', 'Sculpture'],
    displayLocation: 'new-releases',
    likedBy: ['user10', 'user11'],
    artist: mockArtists[2],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: 'ep-5',
    docuseriesId: 'ds-4',
    title: 'Bridging Worlds',
    description: 'Alex shows how he combines traditional painting techniques with digital tools.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    duration: 660, // 11 minutes
    episodeNumber: 1,
    seasonNumber: 1,
    releaseDate: new Date('2024-01-28'),
    viewCount: 11200,
    likes: 420,
    commentsCount: 78,
    isPublished: true,
    isFeatured: true,
    isMainEvent: false,
    tags: ['mixed-media', 'traditional', 'digital', 'hybrid'],
    categories: ['Mixed Media', 'Digital'],
    displayLocation: 'new-releases',
    likedBy: ['user12', 'user13', 'user14'],
    artist: mockArtists[3],
    createdAt: new Date('2024-01-23'),
    updatedAt: new Date('2024-01-28')
  }
];

// Mock Docuseries
export const mockDocuseries: Docuseries[] = [
  {
    id: 'ds-1',
    title: 'Abstract Expressions',
    description: 'Follow Elena Vance as she explores the depths of abstract painting, revealing the emotional journey behind each brushstroke and the stories that colors tell.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[0],
    category: 'Traditional Art',
    genre: 'Documentary',
    totalEpisodes: 2,
    totalDuration: 120, // 2 hours
    releaseDate: new Date('2024-01-15'),
    lastUpdated: new Date('2024-01-22'),
    rating: 4.8,
    viewCount: 45000,
    isFeatured: true,
    isNew: true,
    tags: ['abstract', 'painting', 'emotion', 'color', 'oil painting', 'expressionism'],
    status: 'ongoing',
    episodes: mockEpisodes.filter(ep => ep.docuseriesId === 'ds-1'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: 'ds-2',
    title: 'Digital Visions',
    description: 'Marcus Chen takes us on a journey through the digital art landscape, showcasing how technology is reshaping the boundaries of artistic expression.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[1],
    category: 'Digital Art',
    genre: 'Behind the Scenes',
    totalEpisodes: 1,
    totalDuration: 60, // 1 hour
    releaseDate: new Date('2024-01-20'),
    lastUpdated: new Date('2024-01-20'),
    rating: 4.6,
    viewCount: 32000,
    isFeatured: true,
    isNew: true,
    tags: ['digital', 'technology', 'futuristic', 'cityscape', '3d modeling', 'animation'],
    status: 'ongoing',
    episodes: mockEpisodes.filter(ep => ep.docuseriesId === 'ds-2'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'ds-3',
    title: 'Sculpting Stories',
    description: 'Sophia Rodriguez shares her intimate relationship with clay, exploring how sculpture becomes a form of storytelling and emotional expression.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[2],
    category: 'Sculpture',
    genre: 'Process',
    totalEpisodes: 1,
    totalDuration: 90, // 1.5 hours
    releaseDate: new Date('2024-01-25'),
    lastUpdated: new Date('2024-01-25'),
    rating: 4.4,
    viewCount: 18000,
    isFeatured: false,
    isNew: true,
    tags: ['ceramics', 'sculpture', 'meditation', 'process', 'clay', 'realism'],
    status: 'ongoing',
    episodes: mockEpisodes.filter(ep => ep.docuseriesId === 'ds-3'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25')
  },
  {
    id: 'ds-4',
    title: 'Hybrid Horizons',
    description: 'Alex Kim demonstrates the fusion of traditional and digital art, creating a new language of visual expression that bridges past and future.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[3],
    category: 'Mixed Media',
    genre: 'Tutorial',
    totalEpisodes: 1,
    totalDuration: 75, // 1.25 hours
    releaseDate: new Date('2024-01-28'),
    lastUpdated: new Date('2024-01-28'),
    rating: 4.7,
    viewCount: 25000,
    isFeatured: false,
    isNew: true,
    tags: ['mixed-media', 'traditional', 'digital', 'hybrid', 'acrylic', 'collage'],
    status: 'ongoing',
    episodes: mockEpisodes.filter(ep => ep.docuseriesId === 'ds-4'),
    createdAt: new Date('2024-01-23'),
    updatedAt: new Date('2024-01-28')
  },
  {
    id: 'ds-5',
    title: 'Watercolor Dreams',
    description: 'A serene journey through watercolor techniques and the meditative process of painting with this delicate medium.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[0],
    category: 'Traditional Art',
    genre: 'Tutorial',
    totalEpisodes: 1,
    totalDuration: 60,
    releaseDate: new Date('2024-02-01'),
    lastUpdated: new Date('2024-02-01'),
    rating: 4.5,
    viewCount: 15000,
    isFeatured: false,
    isNew: true,
    tags: ['watercolor', 'painting', 'impressionism', 'serene', 'tutorial'],
    status: 'ongoing',
    episodes: [],
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: 'ds-6',
    title: 'Street Art Revolution',
    description: 'Exploring the vibrant world of street art and its impact on urban culture and social movements.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[1],
    category: 'Street Art',
    genre: 'Documentary',
    totalEpisodes: 1,
    totalDuration: 90,
    releaseDate: new Date('2024-02-05'),
    lastUpdated: new Date('2024-02-05'),
    rating: 4.3,
    viewCount: 22000,
    isFeatured: false,
    isNew: true,
    tags: ['street art', 'urban', 'spray paint', 'graffiti', 'pop art'],
    status: 'ongoing',
    episodes: [],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-05')
  },
  {
    id: 'ds-7',
    title: 'Charcoal Portraits',
    description: 'Master the art of charcoal drawing with detailed techniques for creating stunning portraits and figures.',
    thumbnailUrl: generatePlaceholderUrl(400, 600),
    bannerUrl: generatePlaceholderUrl(1200, 675),
    featuredArtist: mockArtists[2],
    category: 'Traditional Art',
    genre: 'Tutorial',
    totalEpisodes: 1,
    totalDuration: 75,
    releaseDate: new Date('2024-02-10'),
    lastUpdated: new Date('2024-02-10'),
    rating: 4.6,
    viewCount: 18000,
    isFeatured: false,
    isNew: true,
    tags: ['charcoal', 'drawing', 'portraits', 'realism', 'pencil'],
    status: 'ongoing',
    episodes: [],
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-10')
  }
];

export { mockEpisodes };
export const mockFeaturedContent = mockDocuseries[0]; // Abstract Expressions as featured
export const mockContinueWatching = mockEpisodes.slice(0, 3);
export const mockTrendingNow = mockDocuseries.slice(0, 3);
export const mockNewReleases = mockDocuseries.filter(ds => ds.isNew);
export const mockByCategory = {
  'Traditional Art': mockDocuseries.filter(ds => ds.category === 'Traditional Art'),
  'Digital Art': mockDocuseries.filter(ds => ds.category === 'Digital Art'),
  'Sculpture': mockDocuseries.filter(ds => ds.category === 'Sculpture'),
  'Mixed Media': mockDocuseries.filter(ds => ds.category === 'Mixed Media')
};
