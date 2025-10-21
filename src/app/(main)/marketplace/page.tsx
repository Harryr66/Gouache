'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Users, Clock, Play, Award, BookOpen, Filter, ChevronRight, ChevronLeft, ChevronDown, GraduationCap, Palette, Camera, Brush, Scissors, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from '@/components/theme-loading';

// Course categories for art school
const courseCategories = [
  {
    id: 'painting',
    name: 'Painting',
    icon: Palette,
    subcategories: [
      { id: 'oil-painting', name: 'Oil Painting' },
      { id: 'watercolor', name: 'Watercolor' },
      { id: 'acrylic', name: 'Acrylic' },
      { id: 'gouache', name: 'Gouache' },
      { id: 'mixed-media', name: 'Mixed Media' }
    ]
  },
  {
    id: 'drawing',
    name: 'Drawing',
    icon: Brush,
    subcategories: [
      { id: 'pencil-drawing', name: 'Pencil Drawing' },
      { id: 'charcoal', name: 'Charcoal' },
      { id: 'ink', name: 'Ink & Pen' },
      { id: 'pastel', name: 'Pastel' },
      { id: 'figure-drawing', name: 'Figure Drawing' }
    ]
  },
  {
    id: 'sculpture',
    name: 'Sculpture',
    icon: Scissors,
    subcategories: [
      { id: 'stone-carving', name: 'Stone Carving' },
      { id: 'metalwork', name: 'Metalwork' },
      { id: 'wood-carving', name: 'Wood Carving' },
      { id: 'mixed-media-sculpture', name: 'Mixed Media Sculpture' },
      { id: 'installation-art', name: 'Installation Art' }
    ]
  },
  {
    id: 'pottery-ceramics',
    name: 'Pottery & Ceramics',
    icon: Scissors,
    subcategories: [
      { id: 'wheel-throwing', name: 'Wheel Throwing' },
      { id: 'hand-building', name: 'Hand Building' },
      { id: 'glazing-techniques', name: 'Glazing Techniques' },
      { id: 'kiln-firing', name: 'Kiln Firing' },
      { id: 'ceramic-sculpture', name: 'Ceramic Sculpture' },
      { id: 'functional-pottery', name: 'Functional Pottery' }
    ]
  },
  {
    id: 'styles',
    name: 'Styles',
    icon: Sparkles,
    subcategories: [
      { id: 'abstract', name: 'Abstract' },
      { id: 'realism', name: 'Realism' },
      { id: 'impressionism', name: 'Impressionism' },
      { id: 'expressionism', name: 'Expressionism' },
      { id: 'surrealism', name: 'Surrealism' },
      { id: 'minimalism', name: 'Minimalism' },
      { id: 'contemporary', name: 'Contemporary' },
      { id: 'pop-art', name: 'Pop Art' },
      { id: 'cubism', name: 'Cubism' },
      { id: 'street-art', name: 'Street Art' }
    ]
  },
  {
    id: 'books',
    name: 'Books',
    icon: BookOpen,
    subcategories: [
      { id: 'art-techniques', name: 'Art Techniques' },
      { id: 'art-history', name: 'Art History' },
      { id: 'artist-biographies', name: 'Artist Biographies' },
      { id: 'art-theory', name: 'Art Theory' },
      { id: 'coffee-table-books', name: 'Coffee Table Books' },
      { id: 'exhibition-catalogs', name: 'Exhibition Catalogs' }
    ]
  },
];

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest Courses' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' }
];

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all', label: 'All Levels' }
];

const courseFormats = [
  { value: 'self-paced', label: 'Self-Paced' },
  { value: 'live', label: 'Live Sessions' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'all', label: 'All Formats' }
];

export default function LearnPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('painting');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [difficulty, setDifficulty] = useState('all');
  const [format, setFormat] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Use the placeholder hook for dynamic theme-aware placeholders
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const placeholderUrl = generatePlaceholderUrl(400, 300);
  const avatarPlaceholder = generateAvatarPlaceholderUrl(60, 60);
  const itemsPerPage = 12;
  
  // Get real courses from provider
  const { courses: realCourses, isLoading } = useCourses();

  // Mock course data for art school
  const mockCourses = useMemo(() => [
    {
      id: '1',
      title: 'Master Oil Painting Techniques',
      instructor: {
        name: 'Elena Petrova',
        avatar: avatarPlaceholder,
        rating: 4.9,
        students: 2847,
        verified: true
      },
      description: 'Learn advanced oil painting techniques from a professional artist with 15+ years of experience.',
      thumbnail: placeholderUrl,
      price: 89.99,
      originalPrice: 120.00,
      currency: 'USD',
      rating: 4.8,
      reviewCount: 324,
      category: 'Painting',
      subcategory: 'Oil Painting',
      difficulty: 'Intermediate',
      duration: '8 weeks',
      format: 'Self-Paced',
      students: 1247,
      lessons: 24,
      isOnSale: true,
      isNew: false,
      isFeatured: true,
      tags: ['oil-painting', 'techniques', 'masterclass'],
      skills: ['Color Theory', 'Brush Techniques', 'Composition', 'Lighting']
    },
    {
      id: '3',
      title: 'Watercolor Landscapes',
      instructor: {
        name: 'Sarah Williams',
        avatar: avatarPlaceholder,
        rating: 4.9,
        students: 1567,
        verified: true
      },
      description: 'Create stunning watercolor landscapes with professional techniques and composition tips.',
      thumbnail: placeholderUrl,
      price: 69.99,
      originalPrice: 89.99,
      currency: 'USD',
      rating: 4.7,
      reviewCount: 267,
      category: 'Painting',
      subcategory: 'Watercolor',
      difficulty: 'Intermediate',
      duration: '5 weeks',
      format: 'Hybrid',
      students: 634,
      lessons: 15,
      isOnSale: true,
      isNew: false,
      isFeatured: true,
      tags: ['watercolor', 'landscapes', 'composition'],
      skills: ['Watercolor Techniques', 'Landscape Composition', 'Color Mixing', 'Atmospheric Perspective']
    },
    {
      id: '4',
      title: 'Figure Drawing Masterclass',
      instructor: {
        name: 'David Rodriguez',
        avatar: avatarPlaceholder,
        rating: 4.8,
        students: 2134,
        verified: true
      },
      description: 'Master human anatomy and figure drawing with live model sessions and detailed instruction.',
      thumbnail: placeholderUrl,
      price: 129.99,
      originalPrice: null,
      currency: 'USD',
      rating: 4.9,
      reviewCount: 445,
      category: 'Drawing',
      subcategory: 'Figure Drawing',
      difficulty: 'Advanced',
      duration: '10 weeks',
      format: 'Live Sessions',
      students: 1567,
      lessons: 30,
      isOnSale: false,
      isNew: false,
      isFeatured: true,
      tags: ['figure-drawing', 'anatomy', 'masterclass'],
      skills: ['Human Anatomy', 'Proportions', 'Gesture Drawing', 'Shading Techniques']
    },
    {
      id: '4',
      title: 'The Complete Guide to Oil Painting',
      instructor: {
        name: 'Robert Johnson',
        avatar: avatarPlaceholder,
        rating: 4.8,
        students: 892,
        verified: true
      },
      description: 'Comprehensive guide covering all aspects of oil painting from materials to advanced techniques.',
      thumbnail: placeholderUrl,
      price: 24.99,
      originalPrice: 34.99,
      currency: 'USD',
      rating: 4.7,
      reviewCount: 156,
      category: 'Books',
      subcategory: 'Art Techniques',
      difficulty: 'Beginner',
      duration: 'Self-Paced',
      format: 'E-Book',
      students: 423,
      lessons: 1,
      isOnSale: true,
      isNew: false,
      isFeatured: false,
      tags: ['oil-painting', 'techniques', 'guide'],
      skills: ['Oil Painting Basics', 'Color Theory', 'Brush Techniques', 'Composition']
    },
    {
      id: '5',
      title: 'Van Gogh: The Life and Art',
      instructor: {
        name: 'Dr. Sarah Mitchell',
        avatar: avatarPlaceholder,
        rating: 4.9,
        students: 567,
        verified: true
      },
      description: 'In-depth biography exploring Van Gogh\'s life, artistic development, and lasting influence on modern art.',
      thumbnail: placeholderUrl,
      price: 19.99,
      originalPrice: null,
      currency: 'USD',
      rating: 4.8,
      reviewCount: 89,
      category: 'Books',
      subcategory: 'Artist Biographies',
      difficulty: 'Beginner',
      duration: 'Self-Paced',
      format: 'E-Book',
      students: 234,
      lessons: 1,
      isOnSale: false,
      isNew: true,
      isFeatured: false,
      tags: ['van-gogh', 'biography', 'art-history'],
      skills: ['Art History', 'Biography Analysis', 'Artistic Influence', 'Cultural Context']
    },
    {
      id: '6',
      title: 'Color Theory for Artists',
      instructor: {
        name: 'Michael Chen',
        avatar: avatarPlaceholder,
        rating: 4.6,
        students: 1234,
        verified: true
      },
      description: 'Master the principles of color theory and learn how to apply them effectively in your artwork.',
      thumbnail: placeholderUrl,
      price: 29.99,
      originalPrice: 39.99,
      currency: 'USD',
      rating: 4.5,
      reviewCount: 203,
      category: 'Books',
      subcategory: 'Art Theory',
      difficulty: 'Intermediate',
      duration: 'Self-Paced',
      format: 'E-Book',
      students: 678,
      lessons: 1,
      isOnSale: true,
      isNew: false,
      isFeatured: true,
      tags: ['color-theory', 'art-theory', 'techniques'],
      skills: ['Color Harmony', 'Color Psychology', 'Color Mixing', 'Visual Impact']
    },
    {
      id: '7',
      title: 'Wheel Throwing Mastery',
      instructor: {
        name: 'Emma Rodriguez',
        avatar: avatarPlaceholder,
        rating: 4.9,
        students: 756,
        verified: true
      },
      description: 'Learn the fundamentals of wheel throwing and create beautiful functional pottery pieces.',
      thumbnail: placeholderUrl,
      price: 79.99,
      originalPrice: 99.99,
      currency: 'USD',
      rating: 4.8,
      reviewCount: 134,
      category: 'Pottery & Ceramics',
      subcategory: 'Wheel Throwing',
      difficulty: 'Beginner',
      duration: '6 weeks',
      format: 'Live Sessions',
      students: 345,
      lessons: 18,
      isOnSale: true,
      isNew: false,
      isFeatured: true,
      tags: ['wheel-throwing', 'pottery', 'ceramics'],
      skills: ['Centering Clay', 'Pulling Walls', 'Shaping Techniques', 'Trimming']
    },
    {
      id: '8',
      title: 'Hand Building Techniques',
      instructor: {
        name: 'James Wilson',
        avatar: avatarPlaceholder,
        rating: 4.7,
        students: 623,
        verified: true
      },
      description: 'Master hand building methods including pinch, coil, and slab construction techniques.',
      thumbnail: placeholderUrl,
      price: 69.99,
      originalPrice: null,
      currency: 'USD',
      rating: 4.6,
      reviewCount: 98,
      category: 'Pottery & Ceramics',
      subcategory: 'Hand Building',
      difficulty: 'Beginner',
      duration: '5 weeks',
      format: 'Self-Paced',
      students: 267,
      lessons: 15,
      isOnSale: false,
      isNew: true,
      isFeatured: false,
      tags: ['hand-building', 'pottery', 'techniques'],
      skills: ['Pinch Pottery', 'Coil Building', 'Slab Construction', 'Surface Decoration']
    },
    {
      id: '9',
      title: 'Stone Carving Fundamentals',
      instructor: {
        name: 'Antonio Silva',
        avatar: avatarPlaceholder,
        rating: 4.8,
        students: 445,
        verified: true
      },
      description: 'Learn traditional stone carving techniques and create your own sculptural works.',
      thumbnail: placeholderUrl,
      price: 89.99,
      originalPrice: 119.99,
      currency: 'USD',
      rating: 4.7,
      reviewCount: 76,
      category: 'Sculpture',
      subcategory: 'Stone Carving',
      difficulty: 'Intermediate',
      duration: '8 weeks',
      format: 'Hybrid',
      students: 189,
      lessons: 24,
      isOnSale: true,
      isNew: false,
      isFeatured: false,
      tags: ['stone-carving', 'sculpture', 'traditional'],
      skills: ['Tool Selection', 'Stone Preparation', 'Carving Techniques', 'Finishing Methods']
    }
  ], [placeholderUrl, avatarPlaceholder]);

  const filteredCourses = useMemo(() => {
    // Use real courses if available, otherwise fall back to mock courses
    console.log('🎓 Marketplace: Real courses count:', realCourses.length);
    console.log('🎓 Marketplace: Real courses:', realCourses);
    console.log('🎓 Marketplace: isLoading:', isLoading);
    
    const coursesToUse: any[] = realCourses.length > 0 ? realCourses : mockCourses;
    console.log('🎓 Marketplace: Using', coursesToUse.length, 'courses (real or mock)');
    
    let filtered = coursesToUse;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((course: any) => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((course: any) => course.category.toLowerCase() === selectedCategory);
    }

    // Subcategory filter
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((course: any) => course.subcategory.toLowerCase().replace(/\s+/g, '-') === selectedSubcategory);
    }

    // Difficulty filter
    if (difficulty !== 'all') {
      filtered = filtered.filter((course: any) => course.difficulty.toLowerCase() === difficulty);
    }

    // Format filter
    if (format !== 'all') {
      filtered = filtered.filter((course: any) => course.format.toLowerCase().replace(/\s+/g, '-') === format);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => b.isNew ? 1 : -1);
        break;
      case 'popular':
        filtered.sort((a, b) => b.students - a.students);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      default:
        // Relevance - featured first, then by rating
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return b.rating - a.rating;
        });
    }

    return filtered;
  }, [realCourses, mockCourses, searchQuery, selectedCategory, selectedSubcategory, difficulty, format, sortBy]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const coursesPerPage = 12;
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + coursesPerPage);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ThemeLoading text="Loading courses..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="h-8 w-8 text-primary" />
                SOMA Learn
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Learn directly from the best artists</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
            <div className="flex-1 relative">
              <Input
                placeholder="Search courses, instructors, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-r-none pl-4 pr-12"
              />
              <Button className="absolute right-0 top-0 h-12 px-4 rounded-l-none">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-4 flex-shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                      </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Format</label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courseFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
          <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                      <SelectValue />
            </SelectTrigger>
            <SelectContent>
                      {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
              </div>
              <div className="flex items-end">
                  <Button
                    variant="outline"
                  onClick={() => {
                    setDifficulty('all');
                    setFormat('all');
                    setSortBy('relevance');
                  }}
                  className="w-full"
                >
                  Clear Filters
                  </Button>
        </div>
          </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {courseCategories.map((category) => {
                  const isExpanded = expandedCategories.has(category.id);
                  const IconComponent = category.icon;
                  
                  return (
                    <div key={category.id}>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm font-medium">{category.name}</span>
                    </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isExpanded && (
                        <div className="ml-6 space-y-1 mt-2">
                          {category.subcategories.map((subcategory) => (
                            <button
                              key={subcategory.id}
                              onClick={() => {
                                setSelectedCategory(category.id);
                                setSelectedSubcategory(subcategory.id);
                              }}
                              className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                selectedSubcategory === subcategory.id
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              {subcategory.name}
                            </button>
                          ))}
                              </div>
                                )}
                              </div>
                  );
                })}
                          </CardContent>
                        </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {filteredCourses.length} Course{filteredCourses.length !== 1 ? 's' : ''} Found
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory !== 'all' && `in ${courseCategories.find(c => c.id === selectedCategory)?.name}`}
                  {selectedSubcategory !== 'all' && ` • ${courseCategories
                    .find(c => c.id === selectedCategory)
                    ?.subcategories.find(s => s.id === selectedSubcategory)?.name}`}
                </p>
              </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {paginatedCourses.map((course) => (
                <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                          <div className="relative">
                            <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {course.isFeatured && (
                        <Badge className="bg-primary text-primary-foreground">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {course.isNew && (
                        <Badge variant="secondary">New</Badge>
                      )}
                      {course.isOnSale && (
                        <Badge variant="destructive">Sale</Badge>
                              )}
                            </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-background/80">
                        {course.difficulty}
                      </Badge>
                          </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
          </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={course.instructor.avatar}
                        alt={course.instructor.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-muted-foreground">{course.instructor.name}</span>
                      {course.instructor.verified && (
                        <Award className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {course.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {course.lessons} lessons
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course.students.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{course.rating}</span>
                        <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {course.format}
                      </Badge>
                      </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          ${course.price}
                        </span>
                        {course.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${course.originalPrice}
                          </span>
                        )}
                      </div>
                      <Link href={`/learn/${course.id}`}>
                        <Button size="sm" className="gradient-button">
                          View Course
                      </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                <ChevronLeft className="h-4 w-4" />
              </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                <ChevronRight className="h-4 w-4" />
            </Button>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}