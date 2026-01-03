'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { type Course, type Instructor, type CourseEnrollment, type CourseSubmission } from '@/lib/types';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  query, 
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';

interface CourseContextType {
  courses: Course[];
  instructors: Instructor[];
  courseEnrollments: CourseEnrollment[];
  courseSubmissions: CourseSubmission[];
  isLoading: boolean;
  
  // Course operations
  getCourse: (courseId: string) => Promise<Course | null>;
  enrollInCourse: (courseId: string) => Promise<void>;
  unenrollFromCourse: (courseId: string) => Promise<void>;
  updateEnrollmentProgress: (enrollmentId: string, progress: number, currentWeek: number, currentLesson: number) => Promise<void>;
  markLessonComplete: (courseId: string, lessonId: string) => Promise<void>;
  verifyEnrollment: (courseId: string, paymentIntentId: string, maxAttempts?: number) => Promise<boolean>;
  
  // Instructor operations
  createInstructor: (instructorData: Omit<Instructor, 'id'>) => Promise<void>;
  updateInstructor: (instructorId: string, updates: Partial<Instructor>) => Promise<void>;
  
  // Course management operations
  createCourse: (courseData: Omit<Course, 'id'>) => Promise<void>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  publishCourse: (courseId: string) => Promise<void>;
  unpublishCourse: (courseId: string) => Promise<void>;
  
  // Course submission operations
  submitCourseRequest: (submissionData: Omit<CourseSubmission, 'id'>) => Promise<void>;
  reviewCourseSubmission: (submissionId: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider = ({ children }: { children: ReactNode }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [courseSubmissions, setCourseSubmissions] = useState<CourseSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Load courses - published courses + user's own draft courses
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    // Query 1: Published and approved courses (public)
    const publishedQuery = query(
      collection(db, 'courses'),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc')
    );

    const mapCourseData = (doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        publishedAt: data.publishedAt?.toDate(),
        instructor: {
          ...data.instructor,
          createdAt: data.instructor?.createdAt?.toDate() || new Date(),
          updatedAt: data.instructor?.updatedAt?.toDate() || new Date(),
        },
        reviews: data.reviews?.map((review: any) => ({
          ...review,
          createdAt: review.createdAt?.toDate() || new Date(),
        })) || [],
        discussions: data.discussions?.map((discussion: any) => ({
          ...discussion,
          createdAt: discussion.createdAt?.toDate() || new Date(),
          updatedAt: discussion.updatedAt?.toDate() || new Date(),
          replies: discussion.replies?.map((reply: any) => ({
            ...reply,
            createdAt: reply.createdAt?.toDate() || new Date(),
          })) || [],
        })) || [],
        curriculum: data.curriculum?.map((week: any) => ({
          ...week,
          lessons: week.lessons?.map((lesson: any) => ({
            ...lesson,
            isCompleted: false, // Will be updated based on user enrollment
          })) || [],
        })) || [],
      };
    };

    const unsubPublished = onSnapshot(
      publishedQuery,
      (snapshot) => {
        // No admin approval needed - all published courses are immediately available
        const publishedCourses = snapshot.docs
          .map(mapCourseData) as Course[];

        // Query 2: User's own draft/unpublished courses (if logged in)
        if (user) {
          const draftQuery = query(
            collection(db, 'courses'),
            where('instructor.userId', '==', user.id),
            where('isPublished', '==', false)
          );

          const unsubDrafts = onSnapshot(draftQuery, (draftSnapshot) => {
            const draftCourses = draftSnapshot.docs.map(mapCourseData) as Course[];
            
            // Combine published + user's drafts, remove duplicates by ID
            const allCourses = [...publishedCourses, ...draftCourses];
            const uniqueCourses = Array.from(
              new Map(allCourses.map(c => [c.id, c])).values()
            );
            
            setCourses(uniqueCourses);
            setIsLoading(false);
          });

          unsubscribes.push(unsubDrafts);
        } else {
          // No user logged in - just show published courses
          setCourses(publishedCourses);
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('CourseProvider: Error loading courses:', error);
        setIsLoading(false);
      }
    );

    unsubscribes.push(unsubPublished);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // Load instructors
  useEffect(() => {
    const instructorsQuery = query(
      collection(db, 'instructors'),
      where('isActive', '==', true),
      orderBy('rating', 'desc')
    );

    const unsubscribe = onSnapshot(instructorsQuery, (snapshot) => {
      const instructorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Instructor[];

      setInstructors(instructorsData);
    });

    return () => unsubscribe();
  }, []);

  // Load user enrollments
  useEffect(() => {
    if (!user) {
      setCourseEnrollments([]);
      return;
    }

    const enrollmentsQuery = query(
      collection(db, 'courseEnrollments'),
      where('userId', '==', user.id),
      where('isActive', '==', true),
      orderBy('enrolledAt', 'desc')
    );

    const unsubscribe = onSnapshot(enrollmentsQuery, (snapshot) => {
      const enrollmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate(),
        lastAccessedAt: doc.data().lastAccessedAt?.toDate() || new Date(),
      })) as CourseEnrollment[];

      setCourseEnrollments(enrollmentsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Load course submissions (for admin)
  useEffect(() => {
    const submissionsQuery = query(
      collection(db, 'courseSubmissions'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      const submissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate(),
      })) as CourseSubmission[];

      setCourseSubmissions(submissionsData);
    });

    return () => unsubscribe();
  }, []);

  // Course operations
  const getCourse = async (courseId: string): Promise<Course | null> => {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        
        // Safely extract instructor data - ensure userId is always a string, never an object
        const instructorData = data.instructor;
        const safeInstructor = instructorData ? {
          id: typeof instructorData.id === 'string' ? instructorData.id : String(instructorData.id || ''),
          userId: typeof instructorData.userId === 'string' ? instructorData.userId : String(instructorData.userId || ''),
          name: typeof instructorData.name === 'string' ? instructorData.name : String(instructorData.name || 'Unknown Instructor'),
          avatar: typeof instructorData.avatar === 'string' ? instructorData.avatar : String(instructorData.avatar || ''),
          avatarUrl: typeof instructorData.avatarUrl === 'string' ? instructorData.avatarUrl : (instructorData.avatarUrl ? String(instructorData.avatarUrl) : ''),
          bio: typeof instructorData.bio === 'string' ? instructorData.bio : (instructorData.bio ? String(instructorData.bio) : ''),
          rating: typeof instructorData.rating === 'number' ? instructorData.rating : Number(instructorData.rating || 0),
          students: typeof instructorData.students === 'number' ? instructorData.students : Number(instructorData.students || 0),
          courses: typeof instructorData.courses === 'number' ? instructorData.courses : Number(instructorData.courses || 0),
          verified: Boolean(instructorData.verified),
          isActive: instructorData.isActive !== false,
          location: typeof instructorData.location === 'string' ? instructorData.location : (instructorData.location ? String(instructorData.location) : ''),
          website: typeof instructorData.website === 'string' ? instructorData.website : (instructorData.website ? String(instructorData.website) : ''),
          // CRITICAL: Flatten socialLinks to only contain string primitives to prevent React error #31
          socialLinks: {
            instagram: typeof instructorData.socialLinks?.instagram === 'string' ? instructorData.socialLinks.instagram : '',
            twitter: typeof instructorData.socialLinks?.twitter === 'string' ? instructorData.socialLinks.twitter : '',
            x: typeof instructorData.socialLinks?.x === 'string' ? instructorData.socialLinks.x : '',
            facebook: typeof instructorData.socialLinks?.facebook === 'string' ? instructorData.socialLinks.facebook : '',
            youtube: typeof instructorData.socialLinks?.youtube === 'string' ? instructorData.socialLinks.youtube : '',
            website: typeof instructorData.socialLinks?.website === 'string' ? instructorData.socialLinks.website : '',
          },
          createdAt: instructorData.createdAt?.toDate ? instructorData.createdAt.toDate() : (instructorData.createdAt instanceof Date ? instructorData.createdAt : new Date()),
          updatedAt: instructorData.updatedAt?.toDate ? instructorData.updatedAt.toDate() : (instructorData.updatedAt instanceof Date ? instructorData.updatedAt : new Date()),
        } : {
          id: '',
          userId: '',
          name: 'Unknown Instructor',
          avatar: '',
          avatarUrl: '',
          bio: '',
          rating: 0,
          students: 0,
          courses: 0,
          verified: false,
          isActive: true,
          location: '',
          website: '',
          // CRITICAL: socialLinks must contain only string primitives
          socialLinks: {
            instagram: '',
            twitter: '',
            x: '',
            facebook: '',
            youtube: '',
            website: '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        return {
          id: courseDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate(),
          instructor: safeInstructor,
          reviews: data.reviews?.map((review: any) => ({
            ...review,
            createdAt: review.createdAt?.toDate() || new Date(),
          })) || [],
          discussions: data.discussions?.map((discussion: any) => ({
            ...discussion,
            createdAt: discussion.createdAt?.toDate() || new Date(),
            updatedAt: discussion.updatedAt?.toDate() || new Date(),
            replies: discussion.replies?.map((reply: any) => ({
              ...reply,
              createdAt: reply.createdAt?.toDate() || new Date(),
            })) || [],
          })) || [],
          curriculum: data.curriculum || [],
        } as unknown as Course;
      }
      return null;
    } catch (error) {
      console.error('Error getting course:', error);
      throw error;
    }
  };

  const enrollInCourse = async (courseId: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to enroll in a course');
    }

    try {
      // Check if already enrolled
      const existingEnrollment = courseEnrollments.find(e => e.courseId === courseId);
      if (existingEnrollment) {
        throw new Error('You are already enrolled in this course');
      }

      const enrollmentData: Omit<CourseEnrollment, 'id'> = {
        userId: user.id,
        courseId,
        enrolledAt: new Date(),
        progress: 0,
        currentWeek: 1,
        currentLesson: 1,
        completedLessons: [],
        lastAccessedAt: new Date(),
        certificateEarned: false,
        isActive: true,
      };

      await addDoc(collection(db, 'courseEnrollments'), enrollmentData);

      // Update course enrollment count
      const course = courses.find(c => c.id === courseId);
      if (course) {
        await updateDoc(doc(db, 'courses', courseId), {
          enrollmentCount: course.enrollmentCount + 1,
          updatedAt: new Date(),
        });
      }

      toast({
        title: "Enrollment Successful",
        description: "You have been enrolled in the course.",
      });
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Failed to enroll in course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // CRITICAL: Verify enrollment was created by webhook after payment
  // Polls Firestore to wait for webhook to create enrollment record
  // This prevents navigating to course before access is granted
  const verifyEnrollment = async (
    courseId: string,
    paymentIntentId: string,
    maxAttempts: number = 10
  ): Promise<boolean> => {
    if (!user) {
      console.error('[verifyEnrollment] No user logged in');
      return false;
    }

    console.log(`[verifyEnrollment] Starting verification for course ${courseId}, payment ${paymentIntentId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[verifyEnrollment] Attempt ${attempt}/${maxAttempts}`);
        
        // Query for enrollment created by webhook with this payment intent
        const enrollmentQuery = query(
          collection(db, 'courseEnrollments'),
          where('courseId', '==', courseId),
          where('userId', '==', user.id),
          where('paymentIntentId', '==', paymentIntentId)
        );
        
        const snapshot = await getDocs(enrollmentQuery);
        
        if (!snapshot.empty) {
          console.log(`[verifyEnrollment] ✅ Enrollment found!`);
          return true;
        }
        
        // If not found and not last attempt, wait 2 seconds before trying again
        if (attempt < maxAttempts) {
          console.log(`[verifyEnrollment] Enrollment not found yet, waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`[verifyEnrollment] Error on attempt ${attempt}:`, error);
        
        // If not last attempt, wait and retry
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    console.log(`[verifyEnrollment] ❌ Timeout: Enrollment not found after ${maxAttempts} attempts (${maxAttempts * 2} seconds)`);
    return false;
  };

  const unenrollFromCourse = async (courseId: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to unenroll from a course');
    }

    try {
      const enrollment = courseEnrollments.find(e => e.courseId === courseId);
      if (!enrollment) {
        throw new Error('You are not enrolled in this course');
      }

      await updateDoc(doc(db, 'courseEnrollments', enrollment.id), {
        isActive: false,
      });

      toast({
        title: "Unenrolled Successfully",
        description: "You have been unenrolled from the course.",
      });
    } catch (error) {
      console.error('Error unenrolling from course:', error);
      toast({
        title: "Unenrollment Failed",
        description: error instanceof Error ? error.message : "Failed to unenroll from course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEnrollmentProgress = async (
    enrollmentId: string, 
    progress: number, 
    currentWeek: number, 
    currentLesson: number
  ): Promise<void> => {
    try {
      await updateDoc(doc(db, 'courseEnrollments', enrollmentId), {
        progress,
        currentWeek,
        currentLesson,
        lastAccessedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating enrollment progress:', error);
      throw error;
    }
  };

  const markLessonComplete = async (courseId: string, lessonId: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to mark lessons complete');
    }

    try {
      const enrollment = courseEnrollments.find(e => e.courseId === courseId);
      if (!enrollment) {
        throw new Error('You are not enrolled in this course');
      }

      const updatedCompletedLessons = [...enrollment.completedLessons];
      if (!updatedCompletedLessons.includes(lessonId)) {
        updatedCompletedLessons.push(lessonId);
      }

      // Calculate new progress
      const course = courses.find(c => c.id === courseId);
      const totalLessons = course?.curriculum.reduce((total, week) => total + week.lessons.length, 0) || 1;
      const newProgress = Math.round((updatedCompletedLessons.length / totalLessons) * 100);

      await updateDoc(doc(db, 'courseEnrollments', enrollment.id), {
        completedLessons: updatedCompletedLessons,
        progress: newProgress,
        lastAccessedAt: new Date(),
      });

      if (newProgress === 100) {
        await updateDoc(doc(db, 'courseEnrollments', enrollment.id), {
          completedAt: new Date(),
          certificateEarned: true,
        });
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      throw error;
    }
  };

  // Instructor operations
  const createInstructor = async (instructorData: Omit<Instructor, 'id'>): Promise<void> => {
    try {
      await addDoc(collection(db, 'instructors'), {
        ...instructorData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: "Instructor Created",
        description: "Instructor profile has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating instructor:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create instructor profile.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateInstructor = async (instructorId: string, updates: Partial<Instructor>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'instructors', instructorId), {
        ...updates,
        updatedAt: new Date(),
      });

      toast({
        title: "Instructor Updated",
        description: "Instructor profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating instructor:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update instructor profile.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Course management operations
  // Helper function to remove undefined values from objects (Firestore doesn't allow undefined)
  const cleanObject = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (obj instanceof Date) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => cleanObject(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          cleaned[key] = cleanObject(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  const createCourse = async (courseData: Omit<Course, 'id'>): Promise<void> => {
    try {
      const cleanedData = cleanObject({
        ...courseData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await addDoc(collection(db, 'courses'), cleanedData);

      toast({
        title: "Course Created",
        description: "Course has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        ...updates,
        updatedAt: new Date(),
      });

      toast({
        title: "Course Updated",
        description: "Course has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCourse = async (courseId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'courses', courseId));

      toast({
        title: "Course Deleted",
        description: "Course has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const publishCourse = async (courseId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: "Course Published",
        description: "Course has been published successfully.",
      });
    } catch (error) {
      console.error('Error publishing course:', error);
      toast({
        title: "Publish Failed",
        description: "Failed to publish course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const unpublishCourse = async (courseId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        isPublished: false,
        updatedAt: new Date(),
      });

      toast({
        title: "Course Unpublished",
        description: "Course has been unpublished successfully.",
      });
    } catch (error) {
      console.error('Error unpublishing course:', error);
      toast({
        title: "Unpublish Failed",
        description: "Failed to unpublish course.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Course submission operations
  const submitCourseRequest = async (submissionData: Omit<CourseSubmission, 'id'>): Promise<void> => {
    try {
      await addDoc(collection(db, 'courseSubmissions'), {
        ...submissionData,
        submittedAt: new Date(),
      });

      toast({
        title: "Request Submitted",
        description: "Your course submission request has been submitted for review.",
      });
    } catch (error) {
      console.error('Error submitting course request:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit course request.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const reviewCourseSubmission = async (
    submissionId: string, 
    status: 'approved' | 'rejected', 
    notes?: string
  ): Promise<void> => {
    try {
      await updateDoc(doc(db, 'courseSubmissions', submissionId), {
        status,
        reviewedAt: new Date(),
        reviewedBy: user?.id,
        notes,
      });

      toast({
        title: "Submission Reviewed",
        description: `Course submission has been ${status}.`,
      });
    } catch (error) {
      console.error('Error reviewing course submission:', error);
      toast({
        title: "Review Failed",
        description: "Failed to review course submission.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value: CourseContextType = {
    courses,
    instructors,
    courseEnrollments,
    courseSubmissions,
    isLoading,
    getCourse,
    enrollInCourse,
    unenrollFromCourse,
    updateEnrollmentProgress,
    markLessonComplete,
    verifyEnrollment,
    createInstructor,
    updateInstructor,
    createCourse,
    updateCourse,
    deleteCourse,
    publishCourse,
    unpublishCourse,
    submitCourseRequest,
    reviewCourseSubmission,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
};
