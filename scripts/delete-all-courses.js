const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteAllCourses() {
  try {
    console.log('Fetching all courses...');
    const coursesSnapshot = await db.collection('courses').get();
    
    console.log(`Found ${coursesSnapshot.size} courses to delete`);
    
    const batch = db.batch();
    let count = 0;
    
    coursesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${count} courses`);
    } else {
      console.log('No courses to delete');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error deleting courses:', error);
    process.exit(1);
  }
}

deleteAllCourses();
