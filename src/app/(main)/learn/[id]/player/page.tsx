'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  BookOpen,
  ArrowLeft,
  Video,
  FileText,
  ClipboardList
} from 'lucide-react';
import { useCourses } from '@/providers/course-provider';
import { useAuth } from '@/providers/auth-provider';
import { VideoPlayer } from '@/components/video-player';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ThemeLoading } from '@/components/theme-loading';

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { getCourse, courseEnrollments, markLessonComplete } = useCourses();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const courseData = await getCourse(courseId);
        if (!courseData) {
          toast({
            title: "Course not found",
            description: "This course does not exist.",
            variant: "destructive",
          });
          router.push('/learn');
          return;
        }

        // Check if course is hosted
        if (courseData.courseType !== 'hosted') {
          toast({
            title: "Invalid course type",
            description: "This page is only for hosted courses.",
            variant: "destructive",
          });
          router.push(`/learn/${courseId}`);
          return;
        }

        setCourse(courseData);

        // Find enrollment
        const userEnrollment = courseEnrollments.find(
          e => e.courseId === courseId && e.userId === user?.id
        );

        if (!userEnrollment) {
          toast({
            title: "Not enrolled",
            description: "You must be enrolled in this course to access the player.",
            variant: "destructive",
          });
          router.push(`/learn/${courseId}`);
          return;
        }

        setEnrollment(userEnrollment);
        setSelectedWeek(userEnrollment.currentWeek || 1);
        
        // Set initial lesson
        const week = courseData.curriculum?.find((w: any) => w.week === userEnrollment.currentWeek);
        if (week && week.lessons && week.lessons.length > 0) {
          const lesson = week.lessons.find((l: any) => l.order === userEnrollment.currentLesson) || week.lessons[0];
          setSelectedLesson(lesson.id);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading course:', error);
        toast({
          title: "Error",
          description: "Failed to load course.",
          variant: "destructive",
        });
        router.push('/learn');
      }
    };

    if (courseId && user) {
      loadCourse();
    }
  }, [courseId, user, courseEnrollments, getCourse, router]);

  const handleLessonComplete = async (lessonId: string) => {
    if (!enrollment) return;

    try {
      await markLessonComplete(courseId, lessonId);
      
      // Update local state
      const updatedCompletedLessons = [...enrollment.completedLessons, lessonId];
      const totalLessons = course?.curriculum?.reduce((total: number, week: any) => 
        total + (week.lessons?.length || 0), 0) || 1;
      const newProgress = Math.round((updatedCompletedLessons.length / totalLessons) * 100);

      setEnrollment({
        ...enrollment,
        completedLessons: updatedCompletedLessons,
        progress: newProgress,
      });

      toast({
        title: "Lesson completed!",
        description: "Great progress! Keep going.",
      });
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark lesson as complete.",
        variant: "destructive",
      });
    }
  };

  const handleLessonSelect = (weekNumber: number, lessonId: string) => {
    setSelectedWeek(weekNumber);
    setSelectedLesson(lessonId);
    
    // Update enrollment progress
    if (enrollment && course) {
      const week = course.curriculum?.find((w: any) => w.week === weekNumber);
      const lesson = week?.lessons?.find((l: any) => l.id === lessonId);
      if (lesson) {
        // Update current week and lesson in enrollment (async, non-blocking)
        // This would typically be done via the course provider
      }
    }
  };

  if (isLoading || !course || !enrollment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ThemeLoading size="lg" text="" />
      </div>
    );
  }

  const currentWeek = course.curriculum?.find((w: any) => w.week === selectedWeek);
  const currentLesson = currentWeek?.lessons?.find((l: any) => l.id === selectedLesson);

  const totalLessons = course.curriculum?.reduce((total: number, week: any) => 
    total + (week.lessons?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/learn/${courseId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{course.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {enrollment.progress}% Complete • {enrollment.completedLessons.length} of {totalLessons} lessons
                </p>
              </div>
            </div>
            <Progress value={enrollment.progress} className="w-48" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Curriculum */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course Content</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {course.curriculum?.map((week: any) => (
                    <div key={week.week} className="border-b last:border-b-0">
                      <div className="p-3 bg-muted/30">
                        <h3 className="font-medium text-sm">{week.title}</h3>
                      </div>
                      <div className="space-y-1">
                        {week.lessons
                          ?.sort((a: any, b: any) => a.order - b.order)
                          .map((lesson: any) => {
                            const isCompleted = enrollment.completedLessons.includes(lesson.id);
                            const isSelected = selectedLesson === lesson.id;
                            
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => handleLessonSelect(week.week, lesson.id)}
                                className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                                  isSelected ? 'bg-muted border-l-2 border-primary' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Video className="h-4 w-4 text-muted-foreground" />
                                  <span className={`text-sm flex-1 ${isSelected ? 'font-medium' : ''}`}>
                                    {lesson.title}
                                  </span>
                                  {isCompleted && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                  {lesson.isPreview && (
                                    <Badge variant="secondary" className="text-xs">Preview</Badge>
                                  )}
                                </div>
                                {lesson.duration && (
                                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {lesson.duration}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Video/Content Player */}
          <div className="lg:col-span-3">
            {currentLesson ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{currentLesson.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentWeek?.title || 'Lessons'}
                      </p>
                    </div>
                    {!enrollment.completedLessons.includes(currentLesson.id) && (
                      <Button
                        onClick={() => handleLessonComplete(currentLesson.id)}
                        variant="outline"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentLesson.videoUrl ? (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <VideoPlayer
                        videoUrl={currentLesson.videoUrl}
                        title={currentLesson.title}
                        artist={course.instructor}
                        autoplay={false}
                      />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No video available for this lesson.</p>
                    </div>
                  )}

                  {(currentLesson.description || currentLesson.content) && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">Notes</h3>
                      <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                        {currentLesson.description ? (
                          <p className="whitespace-pre-wrap">{currentLesson.description}</p>
                        ) : currentLesson.content ? (
                          <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Find previous lesson
                        const allLessons: any[] = [];
                        course.curriculum?.forEach((w: any) => {
                          w.lessons?.forEach((l: any) => {
                            allLessons.push({ ...l, week: w.week });
                          });
                        });
                        const currentIndex = allLessons.findIndex((l: any) => l.id === currentLesson.id);
                        if (currentIndex > 0) {
                          const prevLesson = allLessons[currentIndex - 1];
                          handleLessonSelect(prevLesson.week, prevLesson.id);
                        }
                      }}
                      disabled={!currentLesson || course.curriculum?.[0]?.lessons?.[0]?.id === currentLesson.id}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      onClick={() => {
                        // Find next lesson
                        const allLessons: any[] = [];
                        course.curriculum?.forEach((w: any) => {
                          w.lessons?.forEach((l: any) => {
                            allLessons.push({ ...l, week: w.week });
                          });
                        });
                        const currentIndex = allLessons.findIndex((l: any) => l.id === currentLesson.id);
                        if (currentIndex < allLessons.length - 1) {
                          const nextLesson = allLessons[currentIndex + 1];
                          handleLessonSelect(nextLesson.week, nextLesson.id);
                        }
                      }}
                      disabled={!currentLesson || course.curriculum?.[course.curriculum.length - 1]?.lessons?.[course.curriculum[course.curriculum.length - 1].lessons.length - 1]?.id === currentLesson.id}
                    >
                      Next
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a lesson to begin</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
