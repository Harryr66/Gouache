/**
 * Safe rendering utilities to prevent React error #31
 * Ensures objects are never accidentally rendered as React children
 */

/**
 * Safely extracts a string value from a nested object path
 * Prevents rendering objects by always returning a string
 */
export function safeString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Never return an object - always convert to string or use default
  return defaultValue;
}

/**
 * Safely extracts a number value
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Safely extracts an instructor userId - CRITICAL for checkout flow
 * This prevents the entire instructor object from being rendered
 */
export function safeInstructorUserId(instructor: any): string {
  if (!instructor) return '';
  if (typeof instructor === 'string') return instructor; // Already a string somehow
  if (typeof instructor.userId === 'string') return instructor.userId;
  if (typeof instructor.id === 'string') return instructor.id;
  return '';
}

/**
 * Validates that a value is a primitive (string, number, boolean) and can be safely rendered
 */
export function isRenderablePrimitive(value: any): boolean {
  return value === null || value === undefined || 
         typeof value === 'string' || 
         typeof value === 'number' || 
         typeof value === 'boolean';
}

/**
 * Safely extracts course data for checkout
 * Returns only primitive values that can be safely passed to CheckoutForm
 */
export function safeCheckoutData(course: any, courseId: string, userId?: string | null) {
  return {
    price: safeNumber(course?.price, 0),
    currency: safeString(course?.currency, 'USD'),
    title: safeString(course?.title, 'Course'),
    artistId: safeInstructorUserId(course?.instructor),
    itemId: safeString(courseId, ''),
    buyerId: safeString(userId, ''),
    // Validation flag
    isValid: (() => {
      const price = safeNumber(course?.price, 0);
      const artistId = safeInstructorUserId(course?.instructor);
      const itemId = safeString(courseId, '');
      const buyerId = safeString(userId, '');
      return price > 0 && artistId.length > 0 && itemId.length > 0 && buyerId.length > 0;
    })(),
  };
}

