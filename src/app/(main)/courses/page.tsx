'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Star, Users, Clock } from 'lucide-react';
import { useCourses } from '@/providers/course-provider';
import { ThemeLoading } from '@/components/theme-loading';
import Image from 'next/image';

export default function CoursesPage() {
  const router = useRouter();
  const { courses, isLoading } = useCourses();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ThemeLoading text="Loading courses..." size="lg" />
      </div>
    );
  }

  // Courses are already filtered by CourseProvider to only include published and approved courses
  const publishedCourses = courses;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Course Marketplace</h1>
          </div>
          <p className="text-muted-foreground">
            Discover and enroll in courses from expert instructors
          </p>
        </div>

        {publishedCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No courses available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Check back soon for new courses!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {publishedCourses.map((course) => (
              <Card
                key={course.id}
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => router.push(`/learn/${course.id}`)}
              >
                <div className="relative aspect-video overflow-hidden">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Brain className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{course.students}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {course.isOnSale && course.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: course.currency || 'USD',
                          }).format(course.originalPrice)}
                        </span>
                      )}
                      <span className="text-lg font-bold">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: course.currency || 'USD',
                        }).format(course.price)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {course.difficulty}
                    </Badge>
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
