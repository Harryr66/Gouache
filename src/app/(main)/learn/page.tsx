'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, Plus, Clock, DollarSign, Star, Users } from 'lucide-react';
import { useCourses } from '@/providers/course-provider';
import { useAuth } from '@/providers/auth-provider';
import { ThemeLoading } from '@/components/theme-loading';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Course } from '@/lib/types';

const COURSE_CATEGORIES = {
  'all': 'All Categories',
  'painting': 'Painting',
  'drawing': 'Drawing',
  'sculpture': 'Sculpture',
  'pottery-ceramics': 'Pottery & Ceramics',
  'styles': 'Styles'
};

const DIFFICULTY_LEVELS = {
  'all': 'All Levels',
  'Beginner': 'Beginner',
  'Intermediate': 'Intermediate',
  'Advanced': 'Advanced'
};

const PRICE_RANGES = {
  'all': 'All Prices',
  'free': 'Free',
  'under-25': 'Under $25',
  '25-50': '$25 - $50',
  '50-100': '$50 - $100',
  'over-100': 'Over $100'
};

const SORT_OPTIONS = {
  'newest': 'Newest First',
  'oldest': 'Oldest First',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  'rating': 'Highest Rated'
};

export default function LearnMarketplacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, isLoading } = useCourses();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Get only published courses
  const publishedCourses = useMemo(() => {
    return courses.filter(course => course.isPublished === true);
  }, [courses]);

  // Apply filters and sorting
  const filteredCourses = useMemo(() => {
    let filtered = [...publishedCourses];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.instructor?.name.toLowerCase().includes(query) ||
        course.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(course => course.difficulty === selectedDifficulty);
    }

    // Price range filter
    if (selectedPriceRange !== 'all') {
      filtered = filtered.filter(course => {
        const price = course.price || 0;
        switch (selectedPriceRange) {
          case 'free':
            return price === 0;
          case 'under-25':
            return price > 0 && price < 25;
          case '25-50':
            return price >= 25 && price < 50;
          case '50-100':
            return price >= 50 && price < 100;
          case 'over-100':
            return price >= 100;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
        case 'oldest':
          return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [publishedCourses, searchQuery, selectedCategory, selectedDifficulty, selectedPriceRange, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading courses..." size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Learn from Artists</h1>
            <p className="text-muted-foreground">
              Discover courses taught by professional artists on Gouache
            </p>
          </div>
          {user && (
            <Button 
              onClick={() => router.push('/learn/submit')}
              className="gradient-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses, instructors, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COURSE_CATEGORIES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty Filter */}
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIFFICULTY_LEVELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price Range Filter */}
          <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
            <SelectTrigger>
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRICE_RANGES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort and Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} found
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No courses found</CardTitle>
            <CardDescription className="mb-4">
              {publishedCourses.length === 0 
                ? "No courses have been published yet. Be the first to create one!"
                : "Try adjusting your filters or search query to find more courses."}
            </CardDescription>
            {user && publishedCourses.length === 0 && (
              <Button onClick={() => router.push('/learn/submit')} variant="gradient">
                Create First Course
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

// Course Card Component
function CourseCard({ course }: { course: Course }) {
  const router = useRouter();

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => router.push(`/learn/${course.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-background/90 backdrop-blur-sm">
            {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
          </Badge>
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            {course.difficulty}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {course.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Instructor */}
        <div className="flex items-center gap-2 mb-3">
          {course.instructor?.avatarUrl ? (
            <div className="relative h-6 w-6 rounded-full overflow-hidden">
              <Image
                src={course.instructor.avatarUrl}
                alt={course.instructor.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-medium">
                {course.instructor?.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <span className="text-sm text-muted-foreground line-clamp-1">
            {course.instructor?.name || 'Unknown Instructor'}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{course.duration || 'Self-paced'}</span>
          </div>
          {course.rating && course.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{course.rating.toFixed(1)}</span>
            </div>
          )}
          {course.students && course.students > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{course.students}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {course.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
