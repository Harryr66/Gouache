'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star, 
  Users, 
  Clock, 
  Play, 
  Award, 
  BookOpen, 
  MessageCircle, 
  Heart, 
  Download,
  CheckCircle,
  ArrowLeft,
  Calendar,
  MapPin,
  Globe,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { usePlaceholder } from '@/hooks/use-placeholder';
import { useCourses } from '@/providers/course-provider';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';

// Mock course data - in real app, this would come from API
const mockCourse = {
  id: '1',
  title: 'Master Oil Painting Techniques',
  instructor: {
    id: 'instructor-1',
    name: 'Elena Petrova',
    avatar: '',
    bio: 'Professional oil painter with 15+ years of experience. Elena has exhibited in galleries across Europe and North America, with her work featured in prestigious art publications.',
    rating: 4.9,
    students: 2847,
    courses: 12,
    verified: true,
    location: 'Paris, France',
    website: 'https://elenapetrova.com',
    socialLinks: {
      instagram: '@elenapetrova_art',
      twitter: '@elenapetrova',
      youtube: 'Elena Petrova Art',
      facebook: 'Elena Petrova Artist'
    }
  },
  description: 'Learn advanced oil painting techniques from a professional artist with 15+ years of experience. This comprehensive course covers everything from color theory to brush techniques, composition, and lighting.',
  longDescription: `This comprehensive oil painting masterclass is designed for intermediate to advanced artists who want to refine their techniques and develop their own artistic voice. 

You'll learn:
• Advanced color theory and mixing techniques
• Professional brush handling and stroke techniques
• Composition principles for compelling artworks
• Lighting and shadow techniques
• Texture creation and surface effects
• Varnishing and finishing techniques
• Building a cohesive body of work

The course includes live demonstrations, step-by-step tutorials, and personalized feedback on your work.`,
  thumbnail: '',
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
  courseType: 'affiliate' as 'hosted' | 'affiliate',
  externalUrl: 'https://example.com/course',
  linkType: 'enrollment' as 'direct' | 'enrollment' | 'affiliate',
  hostingPlatform: 'teachable',
  tags: ['oil-painting', 'techniques', 'masterclass'],
  skills: ['Color Theory', 'Brush Techniques', 'Composition', 'Lighting'],
  supplyList: [
    { id: '1', item: 'Oil Paint Set', brand: 'Winsor & Newton', affiliateLink: 'https://example.com/winsor-newton' },
    { id: '2', item: 'Canvas Boards', brand: 'Arteza', affiliateLink: 'https://example.com/arteza-canvas' },
    { id: '3', item: 'Paint Brushes', brand: 'Princeton', affiliateLink: 'https://example.com/princeton-brushes' },
  ],
  curriculum: [
    {
      week: 1,
      title: 'Introduction to Oil Painting',
      lessons: [
        { id: 1, title: 'Materials and Setup', duration: '15 min', type: 'video' },
        { id: 2, title: 'Color Theory Basics', duration: '25 min', type: 'video' },
        { id: 3, title: 'First Brush Strokes', duration: '30 min', type: 'video' },
        { id: 4, title: 'Assignment: Color Wheel', duration: '45 min', type: 'assignment' }
      ]
    },
    {
      week: 2,
      title: 'Brush Techniques',
      lessons: [
        { id: 5, title: 'Brush Types and Uses', duration: '20 min', type: 'video' },
        { id: 6, title: 'Stroke Techniques', duration: '35 min', type: 'video' },
        { id: 7, title: 'Texture Creation', duration: '40 min', type: 'video' },
        { id: 8, title: 'Assignment: Texture Study', duration: '60 min', type: 'assignment' }
      ]
    },
    {
      week: 3,
      title: 'Composition and Design',
      lessons: [
        { id: 9, title: 'Rule of Thirds', duration: '20 min', type: 'video' },
        { id: 10, title: 'Leading Lines', duration: '25 min', type: 'video' },
        { id: 11, title: 'Balance and Harmony', duration: '30 min', type: 'video' },
        { id: 12, title: 'Assignment: Composition Study', duration: '90 min', type: 'assignment' }
      ]
    }
  ],
  reviews: [
    {
      id: 1,
      user: {
        name: 'Sarah Johnson',
        avatar: '',
        verified: true
      },
      rating: 5,
      comment: 'Absolutely fantastic course! Elena\'s teaching style is clear and engaging. I\'ve improved dramatically in just a few weeks.',
      date: '2024-01-15',
      helpful: 23
    },
    {
      id: 2,
      user: {
        name: 'Michael Chen',
        avatar: '',
        verified: false
      },
      rating: 4,
      comment: 'Great content and well-structured lessons. The assignments really help reinforce the concepts.',
      date: '2024-01-10',
      helpful: 15
    }
  ],
  discussions: [
    {
      id: 1,
      user: {
        name: 'Alex Thompson',
        avatar: '',
        verified: true
      },
      title: 'Best brushes for beginners?',
      content: 'I\'m just starting out and wondering what brushes you\'d recommend for someone new to oil painting.',
      date: '2024-01-20',
      replies: 8,
      likes: 12
    },
    {
      id: 2,
      user: {
        name: 'Maria Rodriguez',
        avatar: '',
        verified: false
      },
      title: 'Color mixing tips',
      content: 'Does anyone have tips for achieving more vibrant colors? I feel like my mixes are coming out muddy.',
      date: '2024-01-18',
      replies: 15,
      likes: 22
    }
  ]
};

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const courseId = params.id as string;
  const { getCourse, enrollInCourse, courseEnrollments } = useCourses();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  
  const { generatePlaceholderUrl, generateAvatarPlaceholderUrl } = usePlaceholder();
  const placeholderUrl = generatePlaceholderUrl(800, 450);
  const avatarPlaceholder = generateAvatarPlaceholderUrl(60, 60);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const courseData = await getCourse(courseId);
        if (courseData) {
          setCourse(courseData);
          
          // Check enrollment status
          if (user) {
            const enrollment = courseEnrollments.find(
              e => e.courseId === courseId && e.userId === user.id
            );
            setIsEnrolled(!!enrollment);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading course:', error);
        setIsLoading(false);
      }
    };

    if (courseId) {
      loadCourse();
    }
  }, [courseId, user, courseEnrollments, getCourse]);

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to enroll in this course.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    try {
      // For course links, redirect to external URL after payment
      if (course?.courseType === 'affiliate' && course.externalUrl) {
        const platformName = course.hostingPlatform 
          ? course.hostingPlatform.charAt(0).toUpperCase() + course.hostingPlatform.slice(1)
          : 'external platform';
        
        let message = `You will be redirected to ${platformName} to access this course.`;
        
        if (course.linkType === 'enrollment') {
          message += ' You will be automatically enrolled.';
        } else if (course.linkType === 'affiliate') {
          message += ' You may need to complete enrollment on the platform.';
        } else {
          message += ' You may need to sign in or enroll manually.';
        }
        
        message += '\n\nContinue?';
        
        if (confirm(message)) {
          window.open(course.externalUrl, '_blank', 'noopener,noreferrer');
        }
      } else if (course?.courseType === 'hosted') {
        // For hosted courses, enroll and redirect to player
        await enrollInCourse(courseId);
        setIsEnrolled(true);
        router.push(`/learn/${courseId}/player`);
      } else {
        // Fallback: try to enroll anyway
        await enrollInCourse(courseId);
        setIsEnrolled(true);
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      // Error toast is handled by enrollInCourse
    }
  };

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      // In real app, this would submit to API
      console.log('New comment:', newComment);
      setNewComment('');
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
            <Badge variant="outline">{course.category}</Badge>
            <Badge variant="outline">{course.difficulty}</Badge>
            {course.courseType === 'affiliate' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                External Course
              </Badge>
            )}
            {course.courseType === 'hosted' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Hosted on Platform
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{course.rating}</span>
                      <span>({course.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.students.toLocaleString()} students</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Thumbnail */}
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Button size="lg" className="bg-background hover:bg-background/90 text-foreground border-2 border-foreground/20 shadow-lg">
                    <Play className="h-5 w-5 mr-2" />
                    Preview Course
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${isEnrolled && course.supplyList && course.supplyList.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                {isEnrolled && course.supplyList && course.supplyList.length > 0 && (
                  <TabsTrigger value="supplies">Supplies</TabsTrigger>
                )}
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About This Course</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{course.longDescription}</p>
                    
                    <div>
                      <h4 className="font-semibold mb-2">What You'll Learn</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {course.skills.map((skill: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{skill}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Course Requirements</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Basic understanding of drawing fundamentals</li>
                        <li>Oil painting materials (list provided)</li>
                        <li>Dedication to practice and complete assignments</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Instructor */}
                <Card>
                  <CardHeader>
                    <CardTitle>About the Instructor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={course.instructor.avatar} alt={course.instructor.name} />
                        <AvatarFallback>{course.instructor.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{course.instructor.name}</h3>
                          {course.instructor.verified && (
                            <Award className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{course.instructor.bio}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{course.instructor.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{course.instructor.students.toLocaleString()} students</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{course.instructor.courses} courses</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{course.instructor.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            <a href={course.instructor.website} className="hover:text-primary">Website</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {course.curriculum.map((week: any, weekIndex: number) => (
                        <div key={weekIndex} className="border rounded-lg p-4">
                          {week.title !== 'Lessons' && <h4 className="font-semibold mb-3">{week.title}</h4>}
                          <div className="space-y-2">
                            {week.lessons.map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <div className="flex items-center gap-3">
                                  {lesson.type === 'video' ? (
                                    <Play className="h-4 w-4 text-primary" />
                                  ) : (
                                    <BookOpen className="h-4 w-4 text-blue-500" />
                                  )}
                                  <span className="text-sm">{lesson.title}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {isEnrolled && course.supplyList && course.supplyList.length > 0 && (
                <TabsContent value="supplies" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Supplies List
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-6">
                        Here are the supplies you&apos;ll need for this course. Click on any item to purchase through our affiliate links.
                      </p>
                      <div className="space-y-3">
                        {course.supplyList.map((supply: any) => (
                          <div
                            key={supply.id}
                            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-base mb-1">{supply.item}</div>
                              <div className="text-sm text-muted-foreground mb-2">{supply.brand}</div>
                              {supply.affiliateLink && (
                                <a
                                  href={supply.affiliateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Product
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="reviews" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {course.reviews.map((review: any) => (
                        <div key={review.id} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <Avatar>
                              <AvatarImage src={review.user.avatar} alt={review.user.name} />
                              <AvatarFallback>{review.user.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{review.user.name}</span>
                                {review.user.verified && (
                                  <Award className="h-3 w-3 text-primary" />
                                )}
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_: any, i: number) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">{review.date}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-6 px-2">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Helpful ({review.helpful})
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: course.currency || 'USD'
                      }).format(course.price)}
                    </span>
                    {course.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: course.currency || 'USD'
                        }).format(course.originalPrice)}
                      </span>
                    )}
                  </div>
                  
                  {isEnrolled ? (
                    <div className="space-y-3">
                      {course.courseType === 'hosted' ? (
                        <Button 
                          className="w-full gradient-button" 
                          size="lg"
                          onClick={() => router.push(`/learn/${courseId}/player`)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Continue Learning
                        </Button>
                      ) : (
                        <Button 
                          className="w-full gradient-button" 
                          size="lg"
                          onClick={() => course.externalUrl && window.open(course.externalUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Access Course
                        </Button>
                      )}
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download Materials
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        className="w-full gradient-button" 
                        size="lg"
                        onClick={handleEnroll}
                      >
                        {course.courseType === 'affiliate' ? 'Purchase & Access Course' : 'Enroll Now'}
                      </Button>
                      {course.courseType === 'affiliate' && course.externalUrl && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          This course is hosted externally. You&apos;ll be redirected after purchase.
                        </p>
                      )}
                      {course.courseType === 'hosted' && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          This course is hosted on Gouache. You&apos;ll have full access to all lessons and materials.
                        </p>
                      )}
                    </>
                  )}

                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Lifetime access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Mobile and desktop</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Certificate of completion</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lessons</span>
                  <span className="font-medium">{course.lessons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">{course.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty</span>
                  <span className="font-medium">{course.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{course.students.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{course.rating}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
