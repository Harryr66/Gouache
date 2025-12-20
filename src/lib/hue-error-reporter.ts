/**
 * Global error reporting utility for Hue chatbot
 * This allows any part of the application to report errors to Hue
 */

// Global error handler reference (set by HueChatbot component)
let globalHueErrorHandler: ((error: Error | any, context?: string, errorType?: string, errorCode?: string) => void) | null = null;

/**
 * Set the global error handler (called by HueChatbot component)
 */
export function setHueErrorHandler(handler: ((error: Error | any, context?: string, errorType?: string, errorCode?: string) => void) | null) {
  globalHueErrorHandler = handler;
}

/**
 * Report an error to Hue chatbot
 * This can be called from anywhere in the application
 * 
 * @param error - The error object or error message string
 * @param context - Optional context about what the user was trying to do
 * @param errorType - Optional error type (e.g., 'API Error', 'Firestore Error')
 * @param errorCode - Optional error code
 */
export function reportErrorToHue(
  error: Error | string | any,
  context?: string,
  errorType?: string,
  errorCode?: string
) {
  if (globalHueErrorHandler) {
    const errorObj = typeof error === 'string' 
      ? new Error(error) 
      : (error instanceof Error ? error : new Error(String(error)));
    globalHueErrorHandler(errorObj, context, errorType, errorCode);
  } else {
    // Fallback: dispatch error event if handler not ready
    const errorMessage = typeof error === 'string' 
      ? error 
      : (error?.message || String(error));
    
    const errorEvent = new ErrorEvent('error', {
      message: errorMessage,
      error: typeof error === 'string' ? new Error(error) : error,
      filename: typeof window !== 'undefined' ? window.location.href : '',
      lineno: 0,
      colno: 0
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(errorEvent);
    }
  }
}

/**
 * Wrap a function to automatically catch and report errors
 */
export function withErrorReporting<T extends (...args: any[]) => any>(
  fn: T,
  context?: string,
  errorType?: string
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          reportErrorToHue(error, context, errorType);
          throw error; // Re-throw to maintain original behavior
        });
      }
      
      return result;
    } catch (error) {
      reportErrorToHue(error, context, errorType);
      throw error; // Re-throw to maintain original behavior
    }
  }) as T;
}
