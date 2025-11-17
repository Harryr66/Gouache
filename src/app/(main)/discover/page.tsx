'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArtworkTile } from '@/components/artwork-tile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { Search, Filter, Star, TrendingUp, Clock, UserPlus, UserCheck, Instagram, Globe, Calendar, ExternalLink, MapPin, BadgeCheck, Tag, Palette } from 'lucide-react';
import { Artwork, Artist } from '@/lib/types';
import { ThemeLoading } from '@/components/theme-loading';
import { useFollow } from '@/providers/follow-provider';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { useAuth } from '@/providers/auth-provider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Categories for filtering
const categories = [
  'All',
  'Oil Painting',
  'Acrylic Painting',
  'Watercolor',
  'Charcoal Drawing',
  'Pencil Drawing',
  'Ink Drawing',
  'Pastel Drawing',
  'Gouache',
  'Tempera',
  'Fresco',
  'Encaustic',
  'Sculpture',
  'Pottery & Ceramics',
  'Mixed Media',
  'Abstract',
  'Realism',
  'Impressionism',
  'Expressionism'
];

// Main western countries (most commonly used)
const MAIN_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany'
];

// Additional countries
const ADDITIONAL_COUNTRIES = [
  'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Japan', 'South Korea', 'China', 'India', 'Brazil', 'Mexico', 
  'Argentina', 'Colombia', 'South Africa', 'Egypt', 'Morocco',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal',
  'Greece', 'Turkey', 'Israel', 'United Arab Emirates', 'Singapore', 'Belarus',
  'New Zealand', 'Ireland', 'Austria', 'Czech Republic', 'Russia',
  'Nigeria', 'Kenya', 'Ghana', 'Chile', 'Peru', 'Venezuela',
  'Philippines', 'Thailand', 'Indonesia', 'Malaysia', 'Vietnam'
];

// Combined countries list
const COUNTRIES = [...MAIN_COUNTRIES, ...ADDITIONAL_COUNTRIES];

// Mediums for filtering
const MEDIUMS = [
  'All',
  'Oil Painting',
  'Acrylic',
  'Watercolor',
  'Charcoal',
  'Pencil',
  'Ink',
  'Pastel',
  'Gouache',
  'Tempera',
  'Fresco',
  'Encaustic',
  'Digital Art',
  'Mixed Media',
  'Sculpture',
  'Ceramic',
  'Wood',
  'Metal',
  'Stone',
  'Glass'
];

// Common tags for filtering
const COMMON_TAGS = [
  'abstract',
  'realism',
  'impressionism',
  'expressionism',
  'surrealism',
  'minimalism',
  'contemporary',
  'traditional',
  'modern',
  'classical',
  'nature',
  'portrait',
  'landscape',
  'still-life',
  'figurative',
  'geometric',
  'colorful',
  'monochrome',
  'textured',
  'smooth'
];

// Cities by country for filtering
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Leicester', 'Coventry', 'Cardiff', 'Belfast', 'Nottingham', 'Hull', 'Newcastle', 'Stoke-on-Trent', 'Southampton', 'Derby', 'Portsmouth'],
  'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', 'Sherbrooke', 'Barrie', 'Kelowna'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong', 'Hobart', 'Geelong', 'Townsville', 'Cairns', 'Darwin', 'Toowoomba', 'Ballarat', 'Bendigo', 'Albury', 'Launceston'],
  'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hannover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'],
  'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'],
  'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena'],
  'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet', 'Vitoria', 'A Coruña', 'Elche', 'Granada'],
  'Japan': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kawasaki', 'Kyoto', 'Saitama', 'Hiroshima', 'Sendai', 'Kitakyushu', 'Chiba', 'Sakai', 'Niigata', 'Hamamatsu', 'Okayama', 'Sagamihara', 'Shizuoka'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Goiânia', 'Belém', 'Porto Alegre', 'Guarulhos', 'Campinas', 'São Luís', 'São Gonçalo', 'Maceió', 'Duque de Caxias', 'Natal', 'Teresina']
};

export default function DiscoverPage() {
  const router = useRouter();
  const { followArtist, unfollowArtist, isFollowing } = useFollow();
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const { user } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  // Add loading state to ensure theme is properly loaded
  const [isThemeLoading, setIsThemeLoading] = useState(true);
  
  // Load user's permanent discover preferences from Firestore
  useEffect(() => {
    if (user?.preferences?.discover) {
      const discoverPrefs = user.preferences.discover;
      if (discoverPrefs.hideDigitalArt !== undefined) setHideDigitalArt(discoverPrefs.hideDigitalArt);
      if (discoverPrefs.hideAIAssistedArt !== undefined) setHideAIAssistedArt(discoverPrefs.hideAIAssistedArt);
      if (discoverPrefs.hideNFTs !== undefined) setHideNFTs(discoverPrefs.hideNFTs);
      if (discoverPrefs.hidePhotography !== undefined) setHidePhotography(discoverPrefs.hidePhotography);
      if (discoverPrefs.hideVideoArt !== undefined) setHideVideoArt(discoverPrefs.hideVideoArt);
      if (discoverPrefs.hidePerformanceArt !== undefined) setHidePerformanceArt(discoverPrefs.hidePerformanceArt);
      if (discoverPrefs.hideInstallationArt !== undefined) setHideInstallationArt(discoverPrefs.hideInstallationArt);
      if (discoverPrefs.hidePrintmaking !== undefined) setHidePrintmaking(discoverPrefs.hidePrintmaking);
      if (discoverPrefs.hideTextileArt !== undefined) setHideTextileArt(discoverPrefs.hideTextileArt);
    }
  }, [user?.preferences?.discover]);
  
  useEffect(() => {
    // Give theme time to load and be detected
    const timer = setTimeout(() => {
      setIsThemeLoading(false);
    }, 2000); // 2 second delay to ensure theme is fully loaded and established
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const resolved = resolvedTheme ?? theme ?? 'light';
    setThemeMode(resolved === 'dark' ? 'dark' : 'light');
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const updateFromDom = () => {
      if (root.classList.contains('dark')) {
        setThemeMode('dark');
      } else if (root.classList.contains('light')) {
        setThemeMode('light');
      }
    };
    updateFromDom();
    const observer = new MutationObserver(updateFromDom);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isDarkTheme = themeMode === 'dark';
  const loadingDotColors = useMemo(
    () =>
      isDarkTheme
        ? ['#51C4D3', '#77ACF1', '#EF88AD']
        : ['#1e3a8a', '#3b82f6', '#60a5fa'],
    [isDarkTheme]
  );
  
  // Generate placeholder URL with robust theme detection - ONLY after theme is loaded
  const getDiscoverPlaceholder = () => {
    // Don't generate placeholders until theme is fully loaded
    if (isThemeLoading) {
      return ''; // Return empty string during loading
    }
    
    if (typeof document === 'undefined') {
      return generatePlaceholderUrl(400, 300);
    }
    
    // Multiple theme detection methods
    const hasDarkClass = document.documentElement.classList.contains('dark');
    const hasLightClass = document.documentElement.classList.contains('light');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Determine theme with fallback logic
    let isDark = false;
    if (hasDarkClass) {
      isDark = true;
    } else if (hasLightClass) {
      isDark = false;
    } else {
      // Fallback to system preference
      isDark = prefersDark;
    }
    
    if (isDark) {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0a0f1a" stroke="#1e293b" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="bold">Gouache</text>
        </svg>
      `)}`;
    } else {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fafafa" stroke="#e5e5e5" stroke-width="1"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#000000" font-family="Arial, sans-serif" font-size="20" font-weight="bold">Gouache</text>
        </svg>
      `)}`;
    }
  };
  
  const placeholderUrl = getDiscoverPlaceholder();
  
  
  // Always show artworks - users find artists by clicking on artwork tiles
  const view: 'artworks' = 'artworks';
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('random');
  const [activeArtFilter, setActiveArtFilter] = useState('all');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedCountryOfOrigin, setSelectedCountryOfOrigin] = useState<string>('all');
  const [selectedCountryOfResidence, setSelectedCountryOfResidence] = useState<string>('all');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCoursesAvailable, setShowCoursesAvailable] = useState(false);
  const [showUpcomingEvents, setShowUpcomingEvents] = useState(false);
  
  // Advanced search filter states
  const [hideDigitalArt, setHideDigitalArt] = useState(false);
  const [hideAIAssistedArt, setHideAIAssistedArt] = useState(false);
  const [hideNFTs, setHideNFTs] = useState(false);
  const [hidePhotography, setHidePhotography] = useState(false);
  const [hideVideoArt, setHideVideoArt] = useState(false);
  const [hidePerformanceArt, setHidePerformanceArt] = useState(false);
  const [hideInstallationArt, setHideInstallationArt] = useState(false);
  const [hidePrintmaking, setHidePrintmaking] = useState(false);
  const [hideTextileArt, setHideTextileArt] = useState(false);
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Country and city filter states
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  // Mock artists data for fallback
  const mockArtists: Artist[] = [
    {
      id: 'artist-1',
      name: 'Elena Vance',
      handle: 'elena_vance',
      bio: 'Abstract expressionist painter exploring the intersection of color and emotion. My work delves into the subconscious, bringing forth vivid emotional landscapes that challenge perception.',
      followerCount: 12500,
      followingCount: 89,
      createdAt: new Date('2023-01-15'),
      isVerified: true,
      isProfessional: true,
      location: 'New York, NY',
      countryOfOrigin: 'United States',
      countryOfResidence: 'United States',
      socialLinks: {
        instagram: 'https://instagram.com/elena_vance',
        x: 'https://x.com/elena_vance',
        website: 'https://elena-vance.com'
      },
      portfolioImages: [
        { id: '1', imageUrl: placeholderUrl, title: 'Abstract Harmony', description: 'A vibrant exploration of color', medium: 'Oil on Canvas', year: '2023', tags: ['abstract', 'color'], createdAt: new Date() },
        { id: '2', imageUrl: placeholderUrl, title: 'Emotional Landscapes', description: 'Deep emotional expression', medium: 'Acrylic', year: '2023', tags: ['abstract', 'emotion'], createdAt: new Date() },
        { id: '3', imageUrl: placeholderUrl, title: 'Color Symphony', description: 'Harmonious color composition', medium: 'Mixed Media', year: '2023', tags: ['abstract', 'color'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-2',
      name: 'Marcus Chen',
      handle: 'marcus_chen',
      bio: 'Digital and traditional artist creating futuristic cityscapes and urban narratives. Specializing in mixed media that bridges the gap between physical and digital art.',
      followerCount: 21000,
      followingCount: 156,
      createdAt: new Date('2022-11-20'),
      isVerified: true,
      isProfessional: true,
      location: 'Los Angeles, CA',
      countryOfOrigin: 'China',
      countryOfResidence: 'United States',
      socialLinks: {
        instagram: 'https://instagram.com/marcus_chen',
        x: 'https://x.com/marcuschen',
        website: 'https://marcuschen.art'
      },
      portfolioImages: [
        { id: '4', imageUrl: placeholderUrl, title: 'Digital Dreams', description: 'Futuristic cityscape', medium: 'Digital Art', year: '2023', tags: ['digital', 'urban'], createdAt: new Date() },
        { id: '5', imageUrl: placeholderUrl, title: 'Urban Reflections', description: 'City life exploration', medium: 'Mixed Media', year: '2023', tags: ['urban', 'reflection'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-3',
      name: 'Sophia Rodriguez',
      handle: 'sophia_rodriguez',
      bio: 'Contemporary sculptor working with bronze, stone, and mixed materials. My sculptures explore themes of identity, culture, and human connection.',
      followerCount: 8900,
      followingCount: 234,
      createdAt: new Date('2021-06-10'),
      isVerified: true,
      isProfessional: true,
      location: 'Barcelona, Spain',
      countryOfOrigin: 'Spain',
      countryOfResidence: 'Spain',
      socialLinks: {
        instagram: 'https://instagram.com/sophia_rodriguez_art',
        website: 'https://sophiarodriguez.com'
      },
      portfolioImages: [
        { id: '6', imageUrl: placeholderUrl, title: 'Ceramic Contemplation', description: 'Thoughtful ceramic work', medium: 'Ceramic', year: '2023', tags: ['sculpture', 'ceramic'], createdAt: new Date() },
        { id: '7', imageUrl: placeholderUrl, title: 'Bronze Identity', description: 'Identity exploration in bronze', medium: 'Bronze', year: '2023', tags: ['sculpture', 'bronze'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-4',
      name: 'Akira Tanaka',
      handle: 'akira_tanaka',
      bio: 'Japanese watercolor artist specializing in traditional techniques with modern interpretations. My work captures the essence of nature and urban life in Tokyo.',
      followerCount: 15600,
      followingCount: 78,
      createdAt: new Date('2022-08-15'),
      isVerified: true,
      isProfessional: true,
      location: 'Tokyo, Japan',
      countryOfOrigin: 'Japan',
      countryOfResidence: 'Japan',
      socialLinks: {
        instagram: 'https://instagram.com/akira_tanaka_art',
        x: 'https://x.com/akira_tanaka',
        website: 'https://akira-tanaka.com'
      },
      portfolioImages: [
        { id: '8', imageUrl: placeholderUrl, title: 'Cherry Blossom Dreams', description: 'Traditional watercolor of spring', medium: 'Watercolor', year: '2023', tags: ['watercolor', 'nature'], createdAt: new Date() },
        { id: '9', imageUrl: placeholderUrl, title: 'Tokyo Nights', description: 'Urban watercolor scene', medium: 'Watercolor', year: '2023', tags: ['watercolor', 'urban'], createdAt: new Date() },
        { id: '10', imageUrl: placeholderUrl, title: 'Mountain Serenity', description: 'Peaceful mountain landscape', medium: 'Watercolor', year: '2023', tags: ['watercolor', 'landscape'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-5',
      name: 'Isabella Martinez',
      handle: 'isabella_martinez',
      bio: 'Contemporary oil painter exploring themes of femininity, identity, and cultural heritage. My work combines classical techniques with modern storytelling.',
      followerCount: 18900,
      followingCount: 145,
      createdAt: new Date('2021-12-03'),
      isVerified: true,
      isProfessional: true,
      location: 'Mexico City, Mexico',
      countryOfOrigin: 'Mexico',
      countryOfResidence: 'Mexico',
      socialLinks: {
        instagram: 'https://instagram.com/isabella_martinez_art',
        x: 'https://x.com/isabella_martinez',
        website: 'https://isabella-martinez.art'
      },
      portfolioImages: [
        { id: '11', imageUrl: placeholderUrl, title: 'Cultural Heritage', description: 'Celebrating Mexican traditions', medium: 'Oil on Canvas', year: '2023', tags: ['oil', 'culture'], createdAt: new Date() },
        { id: '12', imageUrl: placeholderUrl, title: 'Feminine Strength', description: 'Portrait of empowerment', medium: 'Oil on Canvas', year: '2023', tags: ['oil', 'portrait'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-6',
      name: 'David Kim',
      handle: 'david_kim',
      bio: 'Mixed media artist working with found objects, textiles, and digital elements. My installations explore themes of memory, displacement, and cultural identity.',
      followerCount: 11200,
      followingCount: 98,
      createdAt: new Date('2022-03-22'),
      isVerified: true,
      isProfessional: true,
      location: 'Seoul, South Korea',
      countryOfOrigin: 'South Korea',
      countryOfResidence: 'South Korea',
      socialLinks: {
        instagram: 'https://instagram.com/david_kim_art',
        x: 'https://x.com/david_kim',
        website: 'https://david-kim.art'
      },
      portfolioImages: [
        { id: '13', imageUrl: placeholderUrl, title: 'Memory Fragments', description: 'Mixed media installation', medium: 'Mixed Media', year: '2023', tags: ['mixed-media', 'memory'], createdAt: new Date() },
        { id: '14', imageUrl: placeholderUrl, title: 'Cultural Tapestry', description: 'Textile and digital fusion', medium: 'Mixed Media', year: '2023', tags: ['mixed-media', 'textile'], createdAt: new Date() },
        { id: '15', imageUrl: placeholderUrl, title: 'Digital Memories', description: 'Technology meets tradition', medium: 'Mixed Media', year: '2023', tags: ['mixed-media', 'digital'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-7',
      name: 'Emma Thompson',
      handle: 'emma_thompson',
      bio: 'Contemporary ceramic artist creating functional and sculptural pieces. My work explores the relationship between form, function, and emotional expression.',
      followerCount: 8700,
      followingCount: 67,
      createdAt: new Date('2022-07-18'),
      isVerified: true,
      isProfessional: true,
      location: 'London, UK',
      countryOfOrigin: 'United Kingdom',
      countryOfResidence: 'United Kingdom',
      socialLinks: {
        instagram: 'https://instagram.com/emma_thompson_ceramics',
        x: 'https://x.com/emma_thompson',
        website: 'https://emma-thompson-ceramics.com'
      },
      portfolioImages: [
        { id: '16', imageUrl: placeholderUrl, title: 'Organic Forms', description: 'Natural ceramic shapes', medium: 'Ceramic', year: '2023', tags: ['ceramic', 'organic'], createdAt: new Date() },
        { id: '17', imageUrl: placeholderUrl, title: 'Functional Art', description: 'Beautiful and useful ceramics', medium: 'Ceramic', year: '2023', tags: ['ceramic', 'functional'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-8',
      name: 'Raj Patel',
      handle: 'raj_patel',
      bio: 'Photographer and digital artist capturing the essence of urban life and cultural diversity. My work documents contemporary society through a lens of empathy and understanding.',
      followerCount: 14300,
      followingCount: 112,
      createdAt: new Date('2021-09-12'),
      isVerified: true,
      isProfessional: true,
      location: 'Mumbai, India',
      countryOfOrigin: 'India',
      countryOfResidence: 'India',
      socialLinks: {
        instagram: 'https://instagram.com/raj_patel_photography',
        x: 'https://x.com/raj_patel',
        website: 'https://raj-patel-photography.com'
      },
      portfolioImages: [
        { id: '18', imageUrl: placeholderUrl, title: 'Street Stories', description: 'Urban life documentation', medium: 'Photography', year: '2023', tags: ['photography', 'street'], createdAt: new Date() },
        { id: '19', imageUrl: placeholderUrl, title: 'Cultural Mosaic', description: 'Diverse community portraits', medium: 'Photography', year: '2023', tags: ['photography', 'culture'], createdAt: new Date() },
        { id: '20', imageUrl: placeholderUrl, title: 'Digital Dreams', description: 'Surreal digital manipulation', medium: 'Digital Art', year: '2023', tags: ['digital', 'surreal'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-9',
      name: 'Luna Andersson',
      handle: 'luna_andersson',
      bio: 'Swedish textile artist creating large-scale installations and wearable art. My work explores themes of nature, sustainability, and Nordic mythology.',
      followerCount: 9600,
      followingCount: 89,
      createdAt: new Date('2022-01-25'),
      isVerified: true,
      isProfessional: true,
      location: 'Stockholm, Sweden',
      countryOfOrigin: 'Sweden',
      countryOfResidence: 'Sweden',
      socialLinks: {
        instagram: 'https://instagram.com/luna_andersson_textiles',
        x: 'https://x.com/luna_andersson',
        website: 'https://luna-andersson.com'
      },
      portfolioImages: [
        { id: '21', imageUrl: placeholderUrl, title: 'Nordic Textiles', description: 'Traditional patterns reimagined', medium: 'Textile', year: '2023', tags: ['textile', 'nordic'], createdAt: new Date() },
        { id: '22', imageUrl: placeholderUrl, title: 'Nature Weavings', description: 'Organic textile forms', medium: 'Textile', year: '2023', tags: ['textile', 'nature'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-10',
      name: 'Ahmed Hassan',
      handle: 'ahmed_hassan',
      bio: 'Calligraphy artist and painter blending traditional Arabic script with contemporary visual art. My work bridges cultural heritage with modern expression.',
      followerCount: 17800,
      followingCount: 134,
      createdAt: new Date('2021-11-08'),
      isVerified: true,
      isProfessional: true,
      location: 'Cairo, Egypt',
      countryOfOrigin: 'Egypt',
      countryOfResidence: 'Egypt',
      socialLinks: {
        instagram: 'https://instagram.com/ahmed_hassan_calligraphy',
        x: 'https://x.com/ahmed_hassan',
        website: 'https://ahmed-hassan-calligraphy.com'
      },
      portfolioImages: [
        { id: '23', imageUrl: placeholderUrl, title: 'Sacred Script', description: 'Traditional Arabic calligraphy', medium: 'Ink on Paper', year: '2023', tags: ['calligraphy', 'traditional'], createdAt: new Date() },
        { id: '24', imageUrl: placeholderUrl, title: 'Modern Verses', description: 'Contemporary calligraphic art', medium: 'Mixed Media', year: '2023', tags: ['calligraphy', 'contemporary'], createdAt: new Date() },
        { id: '25', imageUrl: placeholderUrl, title: 'Cultural Bridge', description: 'East meets West in script', medium: 'Mixed Media', year: '2023', tags: ['calligraphy', 'cultural'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-11',
      name: 'Maria Santos',
      handle: 'maria_santos',
      bio: 'Brazilian street artist creating vibrant murals that celebrate community and social justice. My work transforms urban spaces into canvases of hope.',
      followerCount: 14200,
      followingCount: 98,
      createdAt: new Date('2022-05-14'),
      isVerified: true,
      isProfessional: true,
      location: 'São Paulo, Brazil',
      countryOfOrigin: 'Brazil',
      countryOfResidence: 'Brazil',
      socialLinks: {
        instagram: 'https://instagram.com/maria_santos_street',
        x: 'https://x.com/maria_santos',
        website: 'https://maria-santos-art.com'
      },
      portfolioImages: [
        { id: '26', imageUrl: placeholderUrl, title: 'Community Mural', description: 'Vibrant street art celebrating unity', medium: 'Spray Paint', year: '2023', tags: ['street-art', 'community'], createdAt: new Date() },
        { id: '27', imageUrl: placeholderUrl, title: 'Social Justice', description: 'Art for change and awareness', medium: 'Mixed Media', year: '2023', tags: ['street-art', 'social'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-12',
      name: 'Oliver Wright',
      handle: 'oliver_wright',
      bio: 'Australian landscape painter capturing the raw beauty of the outback and coastal regions. My work explores the relationship between nature and human experience.',
      followerCount: 10800,
      followingCount: 76,
      createdAt: new Date('2021-08-30'),
      isVerified: true,
      isProfessional: true,
      location: 'Melbourne, Australia',
      countryOfOrigin: 'Australia',
      countryOfResidence: 'Australia',
      socialLinks: {
        instagram: 'https://instagram.com/oliver_wright_landscapes',
        x: 'https://x.com/oliver_wright',
        website: 'https://oliver-wright-art.com'
      },
      portfolioImages: [
        { id: '28', imageUrl: placeholderUrl, title: 'Outback Dreams', description: 'Vast Australian landscapes', medium: 'Oil on Canvas', year: '2023', tags: ['landscape', 'australia'], createdAt: new Date() },
        { id: '29', imageUrl: placeholderUrl, title: 'Coastal Serenity', description: 'Peaceful beach scenes', medium: 'Oil on Canvas', year: '2023', tags: ['landscape', 'coastal'], createdAt: new Date() },
        { id: '30', imageUrl: placeholderUrl, title: 'Desert Sunsets', description: 'Golden hour in the outback', medium: 'Oil on Canvas', year: '2023', tags: ['landscape', 'desert'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-13',
      name: 'Zara Khan',
      handle: 'zara_khan',
      bio: 'Pakistani miniature painter preserving traditional techniques while exploring contemporary themes. My work bridges centuries-old artistry with modern narratives.',
      followerCount: 16500,
      followingCount: 112,
      createdAt: new Date('2022-02-18'),
      isVerified: true,
      isProfessional: true,
      location: 'Lahore, Pakistan',
      countryOfOrigin: 'Pakistan',
      countryOfResidence: 'Pakistan',
      socialLinks: {
        instagram: 'https://instagram.com/zara_khan_miniatures',
        x: 'https://x.com/zara_khan',
        website: 'https://zara-khan-miniatures.com'
      },
      portfolioImages: [
        { id: '31', imageUrl: placeholderUrl, title: 'Traditional Tales', description: 'Classic miniature storytelling', medium: 'Miniature Painting', year: '2023', tags: ['miniature', 'traditional'], createdAt: new Date() },
        { id: '32', imageUrl: placeholderUrl, title: 'Modern Narratives', description: 'Contemporary themes in miniature', medium: 'Miniature Painting', year: '2023', tags: ['miniature', 'contemporary'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-14',
      name: 'James Mitchell',
      handle: 'james_mitchell',
      bio: 'Canadian wood sculptor creating intricate pieces from reclaimed materials. My work explores themes of sustainability and the beauty found in natural forms.',
      followerCount: 9200,
      followingCount: 84,
      createdAt: new Date('2022-09-12'),
      isVerified: true,
      isProfessional: true,
      location: 'Vancouver, Canada',
      countryOfOrigin: 'Canada',
      countryOfResidence: 'Canada',
      socialLinks: {
        instagram: 'https://instagram.com/james_mitchell_sculpture',
        x: 'https://x.com/james_mitchell',
        website: 'https://james-mitchell-sculpture.com'
      },
      portfolioImages: [
        { id: '33', imageUrl: placeholderUrl, title: 'Reclaimed Beauty', description: 'Sculpture from salvaged wood', medium: 'Wood Sculpture', year: '2023', tags: ['sculpture', 'wood'], createdAt: new Date() },
        { id: '34', imageUrl: placeholderUrl, title: 'Natural Forms', description: 'Organic shapes in wood', medium: 'Wood Sculpture', year: '2023', tags: ['sculpture', 'organic'], createdAt: new Date() },
        { id: '35', imageUrl: placeholderUrl, title: 'Sustainable Art', description: 'Eco-conscious sculptural work', medium: 'Wood Sculpture', year: '2023', tags: ['sculpture', 'sustainable'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    },
    {
      id: 'artist-15',
      name: 'Yuki Nakamura',
      handle: 'yuki_nakamura',
      bio: 'Japanese contemporary artist working with traditional paper-making techniques and modern installations. My work explores the intersection of craft and conceptual art.',
      followerCount: 13400,
      followingCount: 95,
      createdAt: new Date('2021-12-07'),
      isVerified: true,
      isProfessional: true,
      location: 'Kyoto, Japan',
      countryOfOrigin: 'Japan',
      countryOfResidence: 'Japan',
      socialLinks: {
        instagram: 'https://instagram.com/yuki_nakamura_paper',
        x: 'https://x.com/yuki_nakamura',
        website: 'https://yuki-nakamura-art.com'
      },
      portfolioImages: [
        { id: '36', imageUrl: placeholderUrl, title: 'Paper Installations', description: 'Large-scale paper artworks', medium: 'Paper Installation', year: '2023', tags: ['paper', 'installation'], createdAt: new Date() },
        { id: '37', imageUrl: placeholderUrl, title: 'Traditional Craft', description: 'Handmade paper techniques', medium: 'Handmade Paper', year: '2023', tags: ['paper', 'traditional'], createdAt: new Date() }
      ],
      events: [],
      courses: [],
      discoverThumbnail: placeholderUrl
    }
  ];

  // Fetch real artists from Firestore
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setIsDataLoading(true);
        // Try query with orderBy first, fall back to simple query if index missing
        let snapshot;
        try {
          const artistsQuery = query(
            collection(db, 'userProfiles'),
            where('isProfessional', '==', true),
            orderBy('createdAt', 'desc')
          );
          snapshot = await getDocs(artistsQuery);
        } catch (indexError: any) {
          // If index error, try without orderBy
          if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('index')) {
            console.warn('⚠️ Composite index missing, querying without orderBy');
            const simpleQuery = query(
              collection(db, 'userProfiles'),
              where('isProfessional', '==', true)
            );
            snapshot = await getDocs(simpleQuery);
          } else {
            throw indexError;
          }
        }
        
        const artistsData: Artist[] = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Convert portfolio items from Firestore format (with Timestamps) to proper format
          const rawPortfolio = data.portfolio || [];
          const artistName = data.name || data.handle || doc.id;
          console.log(`🔍 Processing portfolio for ${artistName}:`, {
            rawCount: rawPortfolio.length,
            rawType: Array.isArray(rawPortfolio) ? 'array' : typeof rawPortfolio,
            rawItems: rawPortfolio.map((item: any) => ({
              id: item?.id,
              title: item?.title,
              hasImage: !!item?.imageUrl,
              imageUrl: item?.imageUrl ? 'has image' : 'no image'
            }))
          });
          // Also log the full raw portfolio for debugging
          console.log(`📦 Full raw portfolio for ${artistName}:`, JSON.stringify(rawPortfolio, null, 2));
          
          const portfolio = rawPortfolio.map((item: any, index: number) => {
            // Skip invalid items
            if (!item || typeof item !== 'object') {
              console.warn(`⚠️ [${artistName}] Skipping invalid portfolio item at index ${index}:`, item);
              return null;
            }
            
            // Log each item being processed
            console.log(`🔎 [${artistName}] Processing item ${index}:`, {
              id: item.id,
              title: item.title,
              imageUrl: item.imageUrl || 'MISSING',
              hasImageUrl: !!item.imageUrl,
              itemKeys: Object.keys(item)
            });
            
            // Handle createdAt - could be Date, Firestore Timestamp, or undefined
            let createdAt: Date;
            if (item.createdAt instanceof Date) {
              createdAt = item.createdAt;
            } else if (item.createdAt && typeof item.createdAt.toDate === 'function') {
              createdAt = item.createdAt.toDate();
            } else {
              createdAt = new Date();
            }
            
            // Ensure imageUrl exists
            if (!item.imageUrl) {
              console.warn(`⚠️ [${artistName}] Portfolio item missing imageUrl at index ${index}:`, {
                id: item.id,
                title: item.title,
                allKeys: Object.keys(item)
              });
              return null; // Skip items without images
            }
            
            const processedItem = {
              ...item,
              id: item.id || `portfolio-${Date.now()}`,
              title: item.title || 'Untitled Artwork',
              description: item.description || '',
              medium: item.medium || '',
              dimensions: item.dimensions || '',
              year: item.year || '',
              tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
              createdAt: createdAt,
              imageUrl: item.imageUrl
            };
            
            console.log(`✅ [${artistName}] Processed item ${index} successfully:`, {
              id: processedItem.id,
              title: processedItem.title,
              hasImageUrl: !!processedItem.imageUrl
            });
            
            return processedItem;
          }).filter((item: any) => item !== null); // Remove null items
          
          console.log(`📊 [${artistName}] Final portfolio after processing:`, {
            rawCount: rawPortfolio.length,
            processedCount: portfolio.length,
            processedItems: portfolio.map((p: any) => ({
              id: p.id,
              title: p.title,
              imageUrl: p.imageUrl ? 'has image' : 'MISSING'
            }))
          });
          
          return {
            id: doc.id,
            name: data.name || data.displayName || data.handle || 'User',
            handle: data.handle || data.username || `user_${doc.id}`,
            avatarUrl: data.avatarUrl || null,
            bio: data.bio || '',
            website: data.website || '',
            followerCount: data.followerCount || 0,
            followingCount: data.followingCount || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            isVerified: data.isVerified || false,
            isProfessional: data.isProfessional || false,
            location: data.location || '',
            countryOfOrigin: data.countryOfOrigin || '',
            countryOfResidence: data.countryOfResidence || '',
            socialLinks: {
              instagram: data.socialLinks?.instagram || '',
              x: data.socialLinks?.x || '',
              website: data.socialLinks?.website || ''
            },
            portfolioImages: portfolio,
            events: data.events || [],
            courses: data.courses || [],
            discoverThumbnail: data.discoverThumbnail || null
          };
        });
        
        // Use real data if available, otherwise fall back to mock data
        const finalArtists = artistsData.length > 0 ? artistsData : mockArtists;
        setArtists(finalArtists);
        
        // Generate artworks from artists' portfolios
        const artworksData: Artwork[] = [];
        finalArtists.forEach(artist => {
          if (artist.portfolioImages && artist.portfolioImages.length > 0) {
            artist.portfolioImages.forEach((portfolioItem, index) => {
              // Skip items without imageUrl
              if (!portfolioItem.imageUrl) {
                console.warn(`⚠️ Skipping portfolio item without imageUrl: ${portfolioItem.title || 'Untitled'}`);
                return;
              }
              
              // Ensure createdAt is a Date object (already converted in portfolio mapping above)
              const createdAt = portfolioItem.createdAt instanceof Date 
                ? portfolioItem.createdAt 
                : new Date();
              
              artworksData.push({
                id: `artwork-${artist.id}-${portfolioItem.id || index}`,
                artist,
                title: portfolioItem.title || 'Untitled Artwork',
                description: portfolioItem.description || '',
                imageUrl: portfolioItem.imageUrl,
                imageAiHint: portfolioItem.title || 'Untitled Artwork',
                discussionId: `discussion-${artist.id}-${portfolioItem.id || index}`,
                tags: portfolioItem.tags || [],
                // Don't add price or isForSale - portfolio items are for display, not sale
                price: undefined,
                currency: undefined,
                isForSale: false,
                category: portfolioItem.medium || 'Mixed Media',
                medium: portfolioItem.medium || 'Mixed Media',
                dimensions: (portfolioItem as any).dimensions ? { 
                  width: parseFloat((portfolioItem as any).dimensions.split('x')[0]?.trim() || '24'),
                  height: parseFloat((portfolioItem as any).dimensions.split('x')[1]?.trim() || '30'),
                  unit: 'in' as const
                } : { width: 24, height: 30, unit: 'in' as const },
                createdAt: createdAt,
                updatedAt: createdAt,
                views: 0,
                likes: 0,
              });
            });
          } else {
            console.log(`ℹ️ Artist ${artist.name} has no portfolio images`);
          }
        });
        
        setArtworks(artworksData);
        console.log('🎨 Discover: Loaded', finalArtists.length, 'artists and', artworksData.length, 'artworks');
        console.log('📊 Artwork breakdown:', finalArtists.map(a => `${a.name}: ${a.portfolioImages?.length || 0} pieces`));
        console.log('📋 Portfolio details:', finalArtists.map(a => ({
          name: a.name,
          portfolioCount: a.portfolioImages?.length || 0,
          portfolioItems: a.portfolioImages?.map((p: any) => ({ title: p.title, imageUrl: p.imageUrl ? 'has image' : 'no image' })) || []
        })));
      } catch (error) {
        console.error('❌ Error fetching artists:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
          stack: error instanceof Error ? error.stack : undefined
        });
        // Fall back to mock data on error
        setArtists(mockArtists);
        const mockArtworks: Artwork[] = [];
        mockArtists.forEach(artist => {
          if (artist.portfolioImages && artist.portfolioImages.length > 0) {
            artist.portfolioImages.forEach((portfolioItem, index) => {
              mockArtworks.push({
                id: `artwork-${artist.id}-${index}`,
                artist,
                title: portfolioItem.title,
                description: portfolioItem.description || '',
                imageUrl: portfolioItem.imageUrl,
                imageAiHint: portfolioItem.title,
                discussionId: `discussion-${artist.id}-${index}`,
                tags: portfolioItem.tags || [],
                // Don't add price or isForSale - portfolio items are for display, not sale
                price: undefined,
                currency: undefined,
                isForSale: false,
                category: portfolioItem.medium || 'Mixed Media',
                medium: portfolioItem.medium || 'Mixed Media',
                dimensions: (portfolioItem as any).dimensions ? { 
                  width: parseFloat((portfolioItem as any).dimensions.split('x')[0]?.trim() || '24'),
                  height: parseFloat((portfolioItem as any).dimensions.split('x')[1]?.trim() || '30'),
                  unit: 'in' as const
                } : { width: 24, height: 30, unit: 'in' as const },
                createdAt: portfolioItem.createdAt,
                updatedAt: portfolioItem.createdAt,
                views: 0,
                likes: 0,
              });
            });
          }
        });
        setArtworks(mockArtworks);
        console.log('🎨 Discover: Using mock data -', mockArtists.length, 'artists and', mockArtworks.length, 'artworks');
        console.log('📊 Mock artwork breakdown:', mockArtists.map(a => `${a.name}: ${a.portfolioImages?.length || 0} pieces`));
      } finally {
    setIsDataLoading(false);
      }
    };

    fetchArtists();
  }, []);

  const handleFollowToggle = (artist: Artist) => {
    if (isFollowing(artist.id)) {
      unfollowArtist(artist.id);
    } else {
      followArtist(artist.id);
    }
  };

  // Tag management functions
  const addTag = (tag: string) => {
    if (tag.trim() && !selectedTags.includes(tag.trim())) {
      setSelectedTags([...selectedTags, tag.trim()]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  // Medium management functions
  const addMedium = (medium: string) => {
    if (medium && !selectedMediums.includes(medium)) {
      setSelectedMediums([...selectedMediums, medium]);
    }
  };

  const removeMedium = (mediumToRemove: string) => {
    setSelectedMediums(selectedMediums.filter(medium => medium !== mediumToRemove));
  };

  // Country and city management functions
  const addCountry = (country: string) => {
    if (country && !selectedCountries.includes(country)) {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  const removeCountry = (countryToRemove: string) => {
    setSelectedCountries(selectedCountries.filter(country => country !== countryToRemove));
    // Also remove cities from the removed country
    const citiesToRemove = CITIES_BY_COUNTRY[countryToRemove] || [];
    setSelectedCities(selectedCities.filter(city => !citiesToRemove.includes(city)));
  };

  const addCity = (city: string) => {
    if (city && !selectedCities.includes(city)) {
      setSelectedCities([...selectedCities, city]);
    }
  };

  const removeCity = (cityToRemove: string) => {
    setSelectedCities(selectedCities.filter(city => city !== cityToRemove));
  };

  // Filter artworks based on search and filters
  const filteredArtworks = useMemo(() => {
    return artworks.filter((artwork) => {
    // Search filter
    if (searchTerm) {
      const matchesSearch = artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           artwork.imageAiHint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artwork.artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           artwork.artist.handle.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== 'All') {
      if (artwork.category !== selectedCategory) return false;
    }
    
    // Verified professional artists filter
    if (showVerifiedOnly) {
      if (!artwork.artist.isVerified || !artwork.artist.isProfessional) return false;
    }
    
    // Medium filter
    if (selectedMediums.length > 0) {
      if (!artwork.medium || !selectedMediums.includes(artwork.medium)) return false;
    }
    
    // Country filter
    if (selectedCountries.length > 0) {
      const artistCountry = artwork.artist.countryOfResidence || artwork.artist.countryOfOrigin;
      if (!artistCountry || !selectedCountries.includes(artistCountry)) return false;
    }
    
    // City filter
    if (selectedCities.length > 0) {
      const artistLocation = artwork.artist.location;
      if (!artistLocation) return false;
      
      // Check if any selected city is in the artist's location
      const hasMatchingCity = selectedCities.some(city => 
        artistLocation.toLowerCase().includes(city.toLowerCase())
      );
      if (!hasMatchingCity) return false;
    }
    
    // Tags filter
    if (selectedTags.length > 0) {
      const hasMatchingTag = selectedTags.some(tag => 
        artwork.tags?.some(artworkTag => 
          artworkTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) return false;
    }
    
    // Hide Digital Art filter
    if (hideDigitalArt) {
      if (artwork.category === 'Digital Art' || artwork.category === 'Digital Painting' || 
          artwork.medium?.toLowerCase().includes('digital')) return false;
    }
    
    // Hide AI Assisted Art filter
    if (hideAIAssistedArt) {
      if (artwork.tags?.some(tag => tag.toLowerCase().includes('ai') || tag.toLowerCase().includes('artificial')) || 
          artwork.imageAiHint?.toLowerCase().includes('ai') || artwork.imageAiHint?.toLowerCase().includes('artificial intelligence') ||
          artwork.isAI || artwork.aiAssistance) return false;
    }
    
    // Hide NFTs filter
    if (hideNFTs) {
      if (artwork.category === 'NFT' || artwork.tags?.some(tag => 
          tag.toLowerCase().includes('nft') || tag.toLowerCase().includes('blockchain') || tag.toLowerCase().includes('crypto'))) return false;
    }
    
    // Hide Photography filter
    if (hidePhotography) {
      if (artwork.category === 'Photography' || artwork.medium?.toLowerCase().includes('photography') ||
          artwork.tags?.some(tag => tag.toLowerCase().includes('photo'))) return false;
    }
    
    // Hide Video Art filter
    if (hideVideoArt) {
      if (artwork.category === 'Video Art' || artwork.medium?.toLowerCase().includes('video') ||
          artwork.tags?.some(tag => tag.toLowerCase().includes('video'))) return false;
    }
    
    // Hide Performance Art filter
    if (hidePerformanceArt) {
      if (artwork.category === 'Performance Art' || artwork.medium?.toLowerCase().includes('performance') ||
          artwork.tags?.some(tag => tag.toLowerCase().includes('performance'))) return false;
    }
    
    // Hide Installation Art filter
    if (hideInstallationArt) {
      if (artwork.category === 'Installation' || artwork.medium?.toLowerCase().includes('installation') ||
          artwork.tags?.some(tag => tag.toLowerCase().includes('installation'))) return false;
    }
    
    // Hide Printmaking filter
    if (hidePrintmaking) {
      if (artwork.category === 'Printmaking' || artwork.medium?.toLowerCase().includes('print') ||
          artwork.tags?.some(tag => tag.toLowerCase().includes('print'))) return false;
    }
    
    // Hide Textile Art filter
    if (hideTextileArt) {
      if (artwork.category === 'Textile' || artwork.medium?.toLowerCase().includes('textile') ||
          artwork.tags?.some(tag => tag.toLowerCase().includes('textile'))) return false;
    }
    
    return true;
    });
  }, [artworks, searchTerm, selectedCategory, showVerifiedOnly, selectedMediums, selectedCountries, selectedCities, selectedTags, hideDigitalArt, hideAIAssistedArt, hideNFTs, hidePhotography, hideVideoArt, hidePerformanceArt, hideInstallationArt, hidePrintmaking, hideTextileArt]);

    // Shuffle function for randomizing array
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Sort artworks based on user selection, or randomize by default
    const sortedArtworks = useMemo(() => {
      if (sortBy === 'newest') {
        return [...filteredArtworks].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else if (sortBy === 'popular') {
        return [...filteredArtworks].sort((a, b) => {
          return (b.likes || 0) - (a.likes || 0);
        });
      } else if (sortBy === 'price-low') {
        return [...filteredArtworks].sort((a, b) => {
          return (a.price || 0) - (b.price || 0);
        });
      } else if (sortBy === 'price-high') {
        return [...filteredArtworks].sort((a, b) => {
          return (b.price || 0) - (a.price || 0);
        });
      } else {
        // Default: randomize the order to avoid chronological clustering
        // This will re-randomize whenever filteredArtworks changes (e.g., when filters change)
        return shuffleArray(filteredArtworks);
      }
    }, [filteredArtworks, sortBy]);

  const filteredArtists = artists.filter(artist => {
    // Search term filter
    if (searchTerm) {
      const matchesSearch = artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           artist.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           artist.handle.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    // Country of origin filter
    if (selectedCountryOfOrigin !== 'all') {
      if (artist.countryOfOrigin !== selectedCountryOfOrigin) return false;
    }
    
    // Country of residence filter
    if (selectedCountryOfResidence !== 'all') {
      if (artist.countryOfResidence !== selectedCountryOfResidence) return false;
    }
    
    // Filter by verified professional artists
    if (showVerifiedOnly) {
      if (!artist.isVerified || !artist.isProfessional) return false;
    }
    
    // Filter by artists with courses available
    if (showCoursesAvailable) {
      // Check if artist has any courses
      if (!artist.courses || artist.courses.length === 0) return false;
    }
    
    // Filter by artists with upcoming events
    if (showUpcomingEvents) {
      // Check if artist has any events
      if (!artist.events || artist.events.length === 0) return false;
    }
    
    return true;
  });
  
  // Get unique countries from artists for filter options
  const availableOriginCountries = Array.from(new Set(artists.map(a => a.countryOfOrigin).filter(Boolean))) as string[];
  const availableResidenceCountries = Array.from(new Set(artists.map(a => a.countryOfResidence).filter(Boolean))) as string[];
  
  // Clear filters function
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedCountryOfOrigin('all');
    setSelectedCountryOfResidence('all');
    setShowVerifiedOnly(false);
    setSelectedMediums([]);
    setSelectedTags([]);
    setTagInput('');
    setSelectedCountries([]);
    setSelectedCities([]);
    setShowAllCountries(false);
    setHideDigitalArt(false);
    setHideAIAssistedArt(false);
    setHideNFTs(false);
  };
  
  // Count active filters
  const activeFiltersCount = [
    selectedCountryOfOrigin !== 'all',
    selectedCountryOfResidence !== 'all',
    selectedCategory !== 'All',
    showVerifiedOnly,
    selectedMediums.length > 0,
    selectedTags.length > 0,
    selectedCountries.length > 0,
    selectedCities.length > 0,
    hideDigitalArt,
    hideAIAssistedArt,
    hideNFTs,
    hidePhotography,
    hideVideoArt,
    hidePerformanceArt,
    hideInstallationArt,
    hidePrintmaking,
    hideTextileArt
  ].filter(Boolean).length;

  if (selectedArtist) {
    const artistArtworks = artworks.filter(artwork => artwork.artist.id === selectedArtist.id);
    const artistEvents = selectedArtist.events || [];
    const following = isFollowing(selectedArtist.id);

  return (
      <div className="min-h-screen bg-background">
        {/* Back Button */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <Button variant="ghost" onClick={() => setSelectedArtist(null)} className="mb-2">
              ← Back to Discover
            </Button>
          </div>
        </div>

        {/* Artist Profile Header - Compact Layout */}
        <div className="border-b border-border bg-card">
    <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Avatar */}
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={selectedArtist.avatarUrl || generateAvatarPlaceholderUrl(128, 128)} alt={selectedArtist.name} />
                  <AvatarFallback>{selectedArtist.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

              {/* Right: Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
        <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-3xl font-bold">{selectedArtist.name}</h1>
                      {selectedArtist.isVerified && (
                        <BadgeCheck className="h-6 w-6 text-blue-500 fill-current" />
                      )}
                    </div>
                    <p className="text-muted-foreground">@{selectedArtist.handle}</p>
                  </div>
                  <Button
                    variant={following ? "outline" : "default"}
                    onClick={() => handleFollowToggle(selectedArtist)}
                    className="flex items-center gap-2"
                  >
                    {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {following ? 'Following' : 'Follow'}
                  </Button>
        </div>

                {/* Bio */}
                <p className="text-sm leading-relaxed">{selectedArtist.bio}</p>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div>
                    <span className="font-bold">{selectedArtist.followerCount.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">followers</span>
                  </div>
                  <div>
                    <span className="font-bold">{selectedArtist.followingCount.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">following</span>
                  </div>
                  {selectedArtist.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {selectedArtist.location}
                    </div>
                  )}
                </div>

                {/* Social Links - Only show if provided */}
                {selectedArtist.socialLinks && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedArtist.socialLinks.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedArtist.socialLinks.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                    {selectedArtist.socialLinks.instagram && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedArtist.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </a>
                      </Button>
                    )}
                    {selectedArtist.socialLinks.x && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedArtist.socialLinks.x} target="_blank" rel="noopener noreferrer">
                          <span className="h-4 w-4 mr-2 font-bold">𝕏</span>
                          X
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="portfolio" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="portfolio">Portfolio ({artistArtworks.length})</TabsTrigger>
              <TabsTrigger value="events">Events ({artistEvents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="mt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {artistArtworks.map((artwork) => (
                  <ArtworkTile key={artwork.id} artwork={artwork} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artistEvents.map((event) => (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="secondary" className="mr-2">{event.type}</Badge>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {event.date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {artistEvents.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No upcoming events scheduled
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Show loading screen while theme loads
  if (isThemeLoading) {
    return (
      <div
        className={cn(
          'fixed inset-0 flex items-center justify-center z-50',
          isDarkTheme ? 'bg-black' : 'bg-white'
        )}
      >
        <div className="text-center">
          <div className="mb-8" aria-hidden="true" />

          {/* Loading Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center space-x-2"
          >
            <div className="flex space-x-1">
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: loadingDotColors[0] }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: loadingDotColors[1] }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: loadingDotColors[2] }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
    <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Discover</h1>
        </div>
        </div>

      {/* Search & Filters */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
                placeholder="Search artists and artworks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-3 pb-2 min-w-0">
            <Button
              variant={showVerifiedOnly ? "default" : "outline"}
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className="whitespace-nowrap shrink-0"
            >
              <BadgeCheck className="h-4 w-4 mr-2 text-blue-500 fill-current" />
              Verified Only
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters} className="whitespace-nowrap shrink-0">
                Clear Filters ({activeFiltersCount})
              </Button>
            )}
            <Button
              variant="outline" 
              className="whitespace-nowrap shrink-0"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced Search
          </Button>
          </div>
        </div>
        </div>

      {/* Advanced Search Panel */}
      {showAdvancedSearch && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Advanced Search Filters</h3>
          <p className="text-sm text-muted-foreground">
                Use these filters to refine your search results
          </p>
        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Category
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort/Shuffle Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Shuffle</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Medium Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Medium
                </label>
                <div className="space-y-2">
                  {selectedMediums.length > 0 && (
        <div className="flex flex-wrap gap-2">
                      {selectedMediums.map((medium) => (
                        <Badge key={medium} variant="secondary" className="flex items-center gap-1">
                          {medium}
                          <button
                            onClick={() => removeMedium(medium)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
          </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {MEDIUMS.filter(medium => medium !== 'All').map((medium) => (
          <Button
                        key={medium}
                        variant="outline"
            size="sm"
                        onClick={() => addMedium(medium)}
                        className="text-xs"
                        disabled={selectedMediums.includes(medium)}
          >
                        {medium}
          </Button>
                    ))}
                  </div>
          </div>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <div className="space-y-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                  />
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
            ))}
          </div>
        )}
                  <div className="flex flex-wrap gap-1">
                    {COMMON_TAGS.slice(0, 8).map((tag) => (
          <Button
                        key={tag}
                        variant="outline"
            size="sm"
                        onClick={() => addTag(tag)}
                        className="text-xs"
                        disabled={selectedTags.includes(tag)}
          >
                        {tag}
          </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Country Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Country
                </label>
                <div className="space-y-2">
                  {selectedCountries.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCountries.map((country) => (
                        <Badge key={country} variant="secondary" className="flex items-center gap-1">
                          {country}
                          <button
                            onClick={() => removeCountry(country)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(showAllCountries ? COUNTRIES : MAIN_COUNTRIES).filter(country => country !== 'All').map((country) => (
          <Button
                        key={country}
                        variant="outline"
            size="sm"
                        onClick={() => addCountry(country)}
                        className="text-xs"
                        disabled={selectedCountries.includes(country)}
          >
                        {country}
          </Button>
                    ))}
                    {!showAllCountries && (
          <Button
                        variant="outline"
            size="sm"
                        onClick={() => setShowAllCountries(true)}
                        className="text-xs bg-muted hover:bg-muted/80"
          >
                        Show More...
          </Button>
                    )}
                    {showAllCountries && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllCountries(false)}
                        className="text-xs bg-muted hover:bg-muted/80"
                      >
                        Show Less
                      </Button>
                    )}
        </div>
          </div>
        </div>

              {/* City Filter - Only show if countries are selected */}
              {selectedCountries.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    City
                  </label>
                  <div className="space-y-2">
                    {selectedCities.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCities.map((city) => (
                          <Badge key={city} variant="secondary" className="flex items-center gap-1">
                            {city}
                            <button
                              onClick={() => removeCity(city)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
            ))}
          </div>
                    )}
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {selectedCountries.flatMap(country => 
                        (CITIES_BY_COUNTRY[country] || []).map(city => (
          <Button
                            key={`${country}-${city}`}
                            variant="outline"
            size="sm"
                            onClick={() => addCity(city)}
                            className="text-xs"
                            disabled={selectedCities.includes(city)}
          >
                            {city}
          </Button>
                        ))
                      )}
        </div>
          </div>
          </div>
        )}

              {/* Additional Filters - Hide Art Types */}
              <div className="space-y-4">
                <label className="text-sm font-medium block">Hide Art Types</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select art types to exclude from your discover feed. These filters help you focus on the types of art you&apos;re most interested in.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={hideDigitalArt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHideDigitalArt(!hideDigitalArt)}
                    className="text-xs"
                  >
                    Digital Art
                  </Button>
                  
                  <Button
                    variant={hideAIAssistedArt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHideAIAssistedArt(!hideAIAssistedArt)}
                    className="text-xs"
                  >
                    AI-Assisted
                  </Button>
                  
                  <Button
                    variant={hideNFTs ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHideNFTs(!hideNFTs)}
                    className="text-xs"
                  >
                    NFTs
                  </Button>
                  
                  <Button
                    variant={hidePhotography ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHidePhotography(!hidePhotography)}
                    className="text-xs"
                  >
                    Photography
                  </Button>
                  
                  <Button
                    variant={hideVideoArt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHideVideoArt(!hideVideoArt)}
                    className="text-xs"
                  >
                    Video Art
                  </Button>
                  
                  <Button
                    variant={hidePerformanceArt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHidePerformanceArt(!hidePerformanceArt)}
                    className="text-xs"
                  >
                    Performance
                  </Button>
                  
                  <Button
                    variant={hideInstallationArt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHideInstallationArt(!hideInstallationArt)}
                    className="text-xs"
                  >
                    Installation
                  </Button>
                  
                  <Button
                    variant={hidePrintmaking ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHidePrintmaking(!hidePrintmaking)}
                    className="text-xs"
                  >
                    Printmaking
                  </Button>
                  
                  <Button
                    variant={hideTextileArt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHideTextileArt(!hideTextileArt)}
                    className="text-xs"
                  >
                    Textile
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-muted-foreground">
                {activeFiltersCount > 0 && (
                  <span>{activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
                <Button variant="outline" onClick={() => setShowAdvancedSearch(false)}>
                  Close
                </Button>
              </div>
            </div>
            </div>
          </div>
        )}

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isDataLoading ? (
          <div className="flex justify-center py-12">
            <ThemeLoading text="Loading artworks..." size="lg" />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
              {sortedArtworks.map((artwork) => (
                <ArtworkTile key={artwork.id} artwork={artwork} />
              ))}
            </div>

            {isDataLoading && (
              <div className="flex justify-center py-12">
                <ThemeLoading text="Loading more artworks..." size="md" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}