const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBi_3rG4Kn31tvjsXl6kB_C2iYZhdOEuO0",
  authDomain: "soma-social.firebaseapp.com",
  projectId: "soma-social",
  storageBucket: "soma-social.firebasestorage.app",
  messagingSenderId: "44064741792",
  appId: "1:44064741792:web:232214570fc8bc58dcecc5",
  measurementId: "G-KS591CG0QZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Course categories and subcategories
const courseCategories = {
  'painting': {
    name: 'Painting',
    subcategories: ['Oil Painting', 'Watercolor', 'Acrylic', 'Gouache', 'Mixed Media']
  },
  'drawing': {
    name: 'Drawing',
    subcategories: ['Pencil Drawing', 'Charcoal', 'Ink & Pen', 'Pastel', 'Figure Drawing']
  },
  'sculpture': {
    name: 'Sculpture',
    subcategories: ['Stone Carving', 'Metalwork', 'Wood Carving', 'Mixed Media Sculpture', 'Installation Art']
  },
  'pottery-ceramics': {
    name: 'Pottery & Ceramics',
    subcategories: ['Wheel Throwing', 'Hand Building', 'Glazing Techniques', 'Kiln Firing', 'Ceramic Sculpture', 'Functional Pottery']
  },
  'styles': {
    name: 'Styles',
    subcategories: ['Abstract', 'Realism', 'Impressionism', 'Expressionism', 'Surrealism', 'Minimalism', 'Contemporary', 'Pop Art', 'Cubism', 'Street Art']
  },
  'books': {
    name: 'Books',
    subcategories: ['Art Techniques', 'Art History', 'Artist Biographies', 'Art Theory', 'Coffee Table Books', 'Exhibition Catalogs']
  }
};

// Sample instructor data
const sampleInstructors = [
  {
    id: 'instructor-1',
    userId: 'demo-user',
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
    },
    credentials: 'MFA in Painting, Royal Academy of Arts; Featured in ArtDaily, Saatchi Art',
    specialties: ['Oil Painting', 'Color Theory', 'Portraiture', 'Landscapes'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'instructor-2',
    userId: 'demo-user-2',
    name: 'Sarah Williams',
    avatar: '',
    bio: 'Watercolor specialist with over 10 years of teaching experience. Sarah has won numerous awards for her landscape paintings and has taught workshops internationally.',
    rating: 4.9,
    students: 1567,
    courses: 8,
    verified: true,
    location: 'Vancouver, Canada',
    website: 'https://sarahwilliamsart.com',
    socialLinks: {
      instagram: '@sarahwilliams_watercolor',
      youtube: 'Sarah Williams Watercolor'
    },
    credentials: 'BFA in Fine Arts, Emily Carr University; Signature Member, Canadian Watercolour Society',
    specialties: ['Watercolor', 'Landscape Painting', 'Nature Studies'],
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  }
];

// Sample course data
const sampleCourses = [
  {
    id: 'course-1',
    title: 'Master Oil Painting Techniques',
    description: 'Learn advanced oil painting techniques from a professional artist with 15+ years of experience.',
    longDescription: 'This comprehensive oil painting masterclass is designed for intermediate to advanced artists who want to refine their techniques and develop their own artistic voice.',
    instructor: sampleInstructors[0],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 89.99,
    originalPrice: 120.00,
    currency: 'USD',
    category: 'painting',
    subcategory: 'Oil Painting',
    difficulty: 'Intermediate',
    duration: '8 weeks',
    format: 'Self-Paced',
    students: 1247,
    lessons: 24,
    rating: 4.8,
    reviewCount: 324,
    isOnSale: true,
    isNew: false,
    isFeatured: true,
    isPublished: true,
    tags: ['oil-painting', 'techniques', 'masterclass'],
    skills: ['Color Theory', 'Brush Techniques', 'Composition', 'Lighting'],
    curriculum: [
      {
        week: 1,
        title: 'Introduction to Oil Painting',
        description: 'Foundation concepts and materials',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Materials and Setup',
            description: 'Essential materials for oil painting',
            type: 'video',
            duration: '15 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          },
          {
            id: 'lesson-2',
            title: 'Color Theory Basics',
            description: 'Understanding color relationships',
            type: 'video',
            duration: '25 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: false,
            order: 2
          }
        ]
      }
    ],
    reviews: [
      {
        id: 'review-1',
        userId: 'user-1',
        userName: 'Alice Smith',
        rating: 5,
        comment: 'Absolutely brilliant course! Elena is an amazing instructor.',
        createdAt: new Date('2024-03-10'),
        isVerified: true
      }
    ],
    discussions: [],
    enrollmentCount: 1247,
    completionRate: 78.5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    publishedAt: new Date('2024-01-01')
  },
  {
    id: 'course-2',
    title: 'Watercolor Landscapes: From Sketch to Final Piece',
    description: 'Create stunning watercolor landscapes with professional techniques and color mixing strategies.',
    longDescription: 'Discover the magic of watercolor landscapes in this comprehensive course. Learn to capture light, atmosphere, and emotion in your paintings.',
    instructor: sampleInstructors[1],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 69.99,
    originalPrice: 89.99,
    currency: 'USD',
    category: 'painting',
    subcategory: 'Watercolor',
    difficulty: 'Beginner',
    duration: '6 weeks',
    format: 'Self-Paced',
    students: 892,
    lessons: 18,
    rating: 4.9,
    reviewCount: 267,
    isOnSale: true,
    isNew: true,
    isFeatured: true,
    isPublished: true,
    tags: ['watercolor', 'landscape', 'nature'],
    skills: ['Wet-on-Wet Technique', 'Color Mixing', 'Composition', 'Atmospheric Perspective'],
    curriculum: [
      {
        week: 1,
        title: 'Watercolor Fundamentals',
        description: 'Essential watercolor techniques',
        lessons: [
          {
            id: 'lesson-w1',
            title: 'Materials and Paper Selection',
            description: 'Choosing the right tools',
            type: 'video',
            duration: '12 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          }
        ]
      }
    ],
    reviews: [],
    discussions: [],
    enrollmentCount: 892,
    completionRate: 85.2,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
    publishedAt: new Date('2024-02-01')
  },
  {
    id: 'course-3',
    title: 'Figure Drawing Fundamentals',
    description: 'Master the art of drawing the human figure with proportion, gesture, and anatomy lessons.',
    longDescription: 'Build a solid foundation in figure drawing through structured lessons on anatomy, proportion, and gesture.',
    instructor: sampleInstructors[0],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 79.99,
    originalPrice: 99.99,
    currency: 'USD',
    category: 'drawing',
    subcategory: 'Figure Drawing',
    difficulty: 'Beginner',
    duration: '10 weeks',
    format: 'Self-Paced',
    students: 1456,
    lessons: 32,
    rating: 4.7,
    reviewCount: 412,
    isOnSale: false,
    isNew: false,
    isFeatured: false,
    isPublished: true,
    tags: ['figure-drawing', 'anatomy', 'gesture'],
    skills: ['Proportion', 'Gesture Drawing', 'Anatomy', 'Shading'],
    curriculum: [
      {
        week: 1,
        title: 'Basic Proportions',
        description: 'Understanding human proportions',
        lessons: [
          {
            id: 'lesson-f1',
            title: 'Introduction to Proportions',
            description: 'The 8-head method',
            type: 'video',
            duration: '18 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          }
        ]
      }
    ],
    reviews: [],
    discussions: [],
    enrollmentCount: 1456,
    completionRate: 72.8,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-25'),
    publishedAt: new Date('2024-01-10')
  },
  {
    id: 'course-4',
    title: 'Pottery Wheel Throwing Basics',
    description: 'Learn to create beautiful pottery pieces on the wheel with hands-on techniques.',
    longDescription: 'Start your pottery journey with this beginner-friendly wheel throwing course.',
    instructor: sampleInstructors[1],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 99.99,
    originalPrice: 129.99,
    currency: 'USD',
    category: 'pottery-ceramics',
    subcategory: 'Wheel Throwing',
    difficulty: 'Beginner',
    duration: '12 weeks',
    format: 'Self-Paced',
    students: 634,
    lessons: 28,
    rating: 4.8,
    reviewCount: 189,
    isOnSale: true,
    isNew: true,
    isFeatured: false,
    isPublished: true,
    tags: ['pottery', 'ceramics', 'wheel-throwing'],
    skills: ['Centering', 'Pulling', 'Shaping', 'Trimming'],
    curriculum: [
      {
        week: 1,
        title: 'Getting Started',
        description: 'Wheel throwing basics',
        lessons: [
          {
            id: 'lesson-p1',
            title: 'Clay Preparation',
            description: 'Wedging and preparing clay',
            type: 'video',
            duration: '15 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          }
        ]
      }
    ],
    reviews: [],
    discussions: [],
    enrollmentCount: 634,
    completionRate: 81.5,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-20'),
    publishedAt: new Date('2024-02-10')
  },
  {
    id: 'course-5',
    title: 'Acrylic Painting for Beginners',
    description: 'Start your painting journey with acrylic paints - versatile, forgiving, and vibrant.',
    longDescription: 'Perfect for complete beginners, this course covers everything you need to know to start painting with acrylics.',
    instructor: sampleInstructors[0],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 59.99,
    originalPrice: 79.99,
    currency: 'USD',
    category: 'painting',
    subcategory: 'Acrylic',
    difficulty: 'Beginner',
    duration: '4 weeks',
    format: 'Self-Paced',
    students: 2145,
    lessons: 16,
    rating: 4.6,
    reviewCount: 578,
    isOnSale: true,
    isNew: false,
    isFeatured: true,
    isPublished: true,
    tags: ['acrylic', 'beginner', 'painting'],
    skills: ['Brush Control', 'Color Mixing', 'Layering', 'Texture'],
    curriculum: [
      {
        week: 1,
        title: 'Acrylic Basics',
        description: 'Foundation techniques',
        lessons: [
          {
            id: 'lesson-a1',
            title: 'Understanding Acrylics',
            description: 'Properties and materials',
            type: 'video',
            duration: '10 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          }
        ]
      }
    ],
    reviews: [],
    discussions: [],
    enrollmentCount: 2145,
    completionRate: 88.4,
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-01-05'),
    publishedAt: new Date('2023-12-15')
  },
  {
    id: 'course-6',
    title: 'Abstract Expressionism: Finding Your Voice',
    description: 'Explore abstract expressionism and develop your unique artistic style through spontaneous creation.',
    longDescription: 'Dive into the world of abstract expressionism and learn to express emotions and ideas through non-representational art.',
    instructor: sampleInstructors[0],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 94.99,
    originalPrice: 119.99,
    currency: 'USD',
    category: 'styles',
    subcategory: 'Abstract',
    difficulty: 'Intermediate',
    duration: '6 weeks',
    format: 'Self-Paced',
    students: 743,
    lessons: 20,
    rating: 4.8,
    reviewCount: 201,
    isOnSale: true,
    isNew: true,
    isFeatured: true,
    isPublished: true,
    tags: ['abstract', 'expressionism', 'contemporary'],
    skills: ['Spontaneous Composition', 'Color Theory', 'Texture Building', 'Emotional Expression'],
    curriculum: [
      {
        week: 1,
        title: 'Introduction to Abstract Art',
        description: 'Understanding abstract expressionism',
        lessons: [
          {
            id: 'lesson-abs1',
            title: 'What is Abstract Expressionism?',
            description: 'History and key concepts',
            type: 'video',
            duration: '20 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          }
        ]
      }
    ],
    reviews: [],
    discussions: [],
    enrollmentCount: 743,
    completionRate: 76.3,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-03-01'),
    publishedAt: new Date('2024-02-20')
  },
  {
    id: 'course-7',
    title: 'Mastering Realism: Photorealistic Techniques',
    description: 'Learn to create stunningly realistic artwork with advanced techniques in observation and rendering.',
    longDescription: 'Master the art of realism through detailed lessons on observation, proportion, value, and rendering techniques.',
    instructor: sampleInstructors[1],
    thumbnail: '',
    previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 109.99,
    originalPrice: 139.99,
    currency: 'USD',
    category: 'styles',
    subcategory: 'Realism',
    difficulty: 'Advanced',
    duration: '12 weeks',
    format: 'Self-Paced',
    students: 521,
    lessons: 36,
    rating: 4.9,
    reviewCount: 156,
    isOnSale: false,
    isNew: false,
    isFeatured: false,
    isPublished: true,
    tags: ['realism', 'photorealism', 'advanced'],
    skills: ['Observation', 'Value Control', 'Edge Work', 'Photo Reference Use'],
    curriculum: [
      {
        week: 1,
        title: 'Foundations of Realism',
        description: 'Building observational skills',
        lessons: [
          {
            id: 'lesson-real1',
            title: 'The Art of Observation',
            description: 'Seeing like an artist',
            type: 'video',
            duration: '25 min',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            isPreview: true,
            order: 1
          }
        ]
      }
    ],
    reviews: [],
    discussions: [],
    enrollmentCount: 521,
    completionRate: 68.9,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-05'),
    publishedAt: new Date('2024-01-20')
  }
];

async function setupCourseDatabase() {
  try {
    console.log('🚀 Setting up SOMA Learn database collections...');

    // Create course categories document
    await setDoc(doc(db, 'courseCategories', 'categories'), {
      categories: courseCategories,
      updatedAt: new Date()
    });
    console.log('✅ Course categories created');

    // Create instructors
    for (const instructor of sampleInstructors) {
      await setDoc(doc(db, 'instructors', instructor.id), instructor);
    }
    console.log(`✅ Created ${sampleInstructors.length} instructors`);

    // Create courses
    for (const course of sampleCourses) {
      await setDoc(doc(db, 'courses', course.id), course);
    }
    console.log(`✅ Created ${sampleCourses.length} courses`);

    // Create course submissions collection (empty for now)
    await addDoc(collection(db, 'courseSubmissions'), {
      // Empty document to create the collection
      _placeholder: true,
      createdAt: new Date()
    });
    console.log('✅ Course submissions collection created');

    // Create course enrollments collection (empty for now)
    await addDoc(collection(db, 'courseEnrollments'), {
      // Empty document to create the collection
      _placeholder: true,
      createdAt: new Date()
    });
    console.log('✅ Course enrollments collection created');

    console.log('🎉 SOMA Learn database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up course database:', error);
    throw error;
  }
}

// Run the setup
setupCourseDatabase()
  .then(() => {
    console.log('Database setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
