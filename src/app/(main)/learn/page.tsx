'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Users, Clock, Play, BookOpen, Filter } from 'lucide-react';
import Link from 'next/link';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from '@/components/theme-loading';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LearnPage() {
  const { courses, isLoading } = useCourses();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique categories from courses
  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach(course => {
      if (course.category) cats.add(course.category);
    });
    return Array.from(cats).sort();
  }, [courses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(term) ||
        course.description.toLowerCase().includes(term) ||
        course.instructor.name.toLowerCase().includes(term) ||
        course.category.toLowerCase().includes(term)
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

    return filtered;
  }, [courses, searchTerm, selectedCategory, selectedDifficulty]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
  };

  const activeFiltersCount = [
    searchTerm ? 1 : 0,
    selectedCategory !== 'all' ? 1 : 0,
    selectedDifficulty !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Learn</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover courses from artists around the world
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search courses, artists, or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle>Filter Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm text-muted-foreground">
                    {activeFiltersCount > 0 && (
                      <span>{activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearFilters} size="sm">
                      Clear All
                    </Button>
                    <Button variant="outline" onClick={() => setShowFilters(false)} size="sm">
                      Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <ThemeLoading text="Loading courses..." size="lg" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="p-12 text-center">
            <CardContent>
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No courses found</CardTitle>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                  ? 'Try adjusting your filters to see more courses.'
                  : 'Check back soon for new courses from artists.'}
              </p>
              {(searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="group hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => router.push(`/learn/${course.id}`)}
              >
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
                  {course.previewVideoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="rounded-full bg-white/90 p-3">
                        <Play className="h-6 w-6 text-foreground ml-1" />
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={course.instructor.avatar || undefined} />
                      <AvatarFallback>
                        {course.instructor.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        by {course.instructor.name}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant="secondary">{course.category}</Badge>
                    <Badge variant="outline">{course.difficulty}</Badge>
                    {course.format && (
                      <Badge variant="outline" className="text-xs">
                        {course.format}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium text-foreground">{course.rating.toFixed(1)}</span>
                        <span>({course.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{course.students.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <span className="text-2xl font-bold">{course.currency} {course.price.toFixed(2)}</span>
                      {course.originalPrice && course.originalPrice > course.price && (
                        <span className="text-sm text-muted-foreground line-through ml-2">
                          {course.currency} {course.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button variant="gradient" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/learn/${course.id}`}>
                        View Course
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

