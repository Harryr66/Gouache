/**
 * Video Compression Utilities
 * 
 * Client-side video compression using browser APIs
 * For production, consider server-side compression for better performance
 */

export interface VideoQuality {
  url: string;
  quality: '240p' | '360p' | '720p' | '1080p';
  bitrate?: number; // in kbps
  width?: number;
  height?: number;
}

export interface VideoVariants {
  thumbnail: string; // 240p for tiles (faster loading, acceptable quality)
  full: string; // 1080p for expanded view
  thumbnailQuality?: '240p';
  fullQuality?: '1080p';
  thumbnailBitrate?: number; // 300 kbps target (reduced for faster loading)
  fullBitrate?: number; // 2000-5000 kbps target
}

/**
 * Compress video client-side using canvas and MediaRecorder API
 * This is a basic implementation - server-side compression would be better
 */
export async function compressVideo(
  file: File,
  targetQuality: '240p' | '360p' | '720p' | '1080p' = '240p',
  targetBitrate: number = 300 // kbps (default 300 for 240p)
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.preload = 'auto';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Calculate dimensions based on target quality
      let width = video.videoWidth;
      let height = video.videoHeight;
      const aspectRatio = width / height;

      if (targetQuality === '240p') {
        const maxDimension = 426;
        if (width > height) {
          width = Math.min(width, maxDimension);
          height = Math.round(width / aspectRatio);
        } else {
          height = Math.min(height, maxDimension);
          width = Math.round(height * aspectRatio);
        }
        // Default bitrate for 240p if not specified
        if (!targetBitrate || targetBitrate === 500) {
          targetBitrate = 300;
        }
      } else if (targetQuality === '360p') {
        const maxDimension = 640;
        if (width > height) {
          width = Math.min(width, maxDimension);
          height = Math.round(width / aspectRatio);
        } else {
          height = Math.min(height, maxDimension);
          width = Math.round(height * aspectRatio);
        }
        // Default bitrate for 360p if not specified
        if (!targetBitrate || targetBitrate === 300) {
          targetBitrate = 500;
        }
      } else if (targetQuality === '720p') {
        const maxDimension = 1280;
        if (width > height) {
          width = Math.min(width, maxDimension);
          height = (height / video.videoWidth) * width;
        } else {
          height = Math.min(height, maxDimension);
          width = (width / video.videoHeight) * height;
        }
      }
      // 1080p - keep original dimensions or scale down if larger

      canvas.width = width;
      canvas.height = height;

      video.oncanplay = () => {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Use MediaRecorder to compress
        canvas.captureStream(30).getTracks().forEach(track => {
          const mediaRecorder = new MediaRecorder(
            new MediaStream([track]),
            {
              mimeType: 'video/webm;codecs=vp8',
              videoBitsPerSecond: targetBitrate * 1000,
            }
          );

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            URL.revokeObjectURL(video.src);
            resolve(blob);
          };

          mediaRecorder.start();
          video.play();

          // Stop after video duration
          setTimeout(() => {
            mediaRecorder.stop();
            video.pause();
          }, video.duration * 1000);
        });
      };
    };

    video.onerror = (error) => {
      URL.revokeObjectURL(video.src);
      reject(error);
    };
  });
}

/**
 * Generate video filename with quality suffix
 */
export function getVideoFilenameWithQuality(
  originalFilename: string,
  quality: '240p' | '360p' | '1080p'
): string {
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  return `${nameWithoutExt}_${quality}.mp4`;
}

/**
 * Extract base filename and quality from a quality-specific filename
 */
export function parseVideoFilename(filename: string): {
  baseName: string;
  quality?: '240p' | '360p' | '1080p';
} {
  const match = filename.match(/^(.+?)(_240p|_360p|_1080p)?\.(mp4|webm)$/i);
  if (match) {
    return {
      baseName: match[1],
      quality: match[2]?.replace('_', '') as '240p' | '360p' | '1080p' | undefined,
    };
  }
  return { baseName: filename };
}
