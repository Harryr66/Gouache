/**
 * Extract a thumbnail frame from a video file
 * @param videoFile - The video file to extract frame from
 * @param timeOffset - Time in seconds to extract frame (default: 1 second)
 * @returns Promise<Blob> - The thumbnail image as a Blob
 */
export async function extractVideoThumbnail(
  videoFile: File,
  timeOffset: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to the desired time
      video.currentTime = Math.min(timeOffset, video.duration - 0.1);
    };
    
    video.onseeked = () => {
      try {
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Clean up
              URL.revokeObjectURL(video.src);
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.9 // Quality: 0.9 (90%)
        );
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };
    
    video.onerror = (error) => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail extraction'));
    };
    
    // Create object URL and load video
    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Convert a Blob to a File
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

