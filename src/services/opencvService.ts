/**
 * OpenCV.js Service for Document Detection
 * Handles automatic detection of rectangular documents (ID cards)
 */

declare global {
  interface Window {
    cv: any;
  }
}

let opencvReady = false;
let opencvLoading = false;

/**
 * Load OpenCV.js from CDN
 */
export async function loadOpenCV(): Promise<void> {
  if (opencvReady) {
    return Promise.resolve();
  }

  if (opencvLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (opencvReady) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  opencvLoading = true;

  return new Promise((resolve, reject) => {
    // Check if OpenCV is already loaded
    if (window.cv && window.cv.Mat) {
      opencvReady = true;
      opencvLoading = false;
      resolve();
      return;
    }

    // Initialize window.cv object and set up callback BEFORE loading script
    // This is crucial - OpenCV.js calls this callback when ready
    if (!window.cv) {
      (window as any).cv = {
        onRuntimeInitialized: () => {
          opencvReady = true;
          opencvLoading = false;
          console.log('✅ OpenCV.js loaded and initialized successfully');
          resolve();
        }
      };
    } else {
      // If cv already exists, set the callback
      window.cv['onRuntimeInitialized'] = () => {
        opencvReady = true;
        opencvLoading = false;
        console.log('✅ OpenCV.js loaded and initialized successfully');
        resolve();
      };
    }

    // Try multiple CDN sources in order of reliability
    // OpenCV.js is large (~8MB), so loading may take time
    const cdnSources = [
      // Primary: Official OpenCV documentation site (most reliable)
      'https://docs.opencv.org/4.8.0/opencv.js',
      // Fallback 1: jsDelivr from GitHub (alternative CDN)
      'https://cdn.jsdelivr.net/gh/opencv/opencv@4.8.0/platforms/js/opencv.js'
    ];

    let sourceIndex = 0;
    const maxChecks = 150; // 15 seconds timeout per source

    const loadFromSource = (index: number) => {
      if (index >= cdnSources.length) {
        opencvLoading = false;
        const errorMsg = 'OpenCV.js could not be loaded. Automatic ID detection is disabled. You can still upload images manually.';
        console.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      const script = document.createElement('script');
      script.src = cdnSources[index];
      script.async = true;
      script.defer = false;
      
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // Check if OpenCV is ready
        if (window.cv && window.cv.Mat) {
          clearInterval(checkInterval);
          opencvReady = true;
          opencvLoading = false;
          console.log(`✅ OpenCV.js loaded from source ${index + 1}`);
          resolve();
          return;
        }
        
        // Timeout - try next source
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          script.remove();
          console.warn(`OpenCV.js timeout from source ${index + 1}, trying next...`);
          loadFromSource(index + 1);
        }
      }, 100);
      
      script.onload = () => {
        console.log(`OpenCV.js script loaded from source ${index + 1}, waiting for initialization...`);
        // The onRuntimeInitialized callback will be called by OpenCV.js
        // We're checking in the interval above
      };
      
      script.onerror = () => {
        clearInterval(checkInterval);
        script.remove();
        console.warn(`Failed to load OpenCV.js from source ${index + 1}, trying next...`);
        loadFromSource(index + 1);
      };
      
      document.head.appendChild(script);
    };

    // Start loading
    loadFromSource(0);
  });
}

/**
 * Calculate blur using Variance of Laplacian
 * Returns a blur score - higher values indicate sharper images
 */
export function calculateBlurScore(src: any): number {
  if (!window.cv || !window.cv.Mat) {
    return 0;
  }

  try {
    let gray: any;
    const laplacian = new window.cv.Mat();
    const mean = new window.cv.Mat();
    const stddev = new window.cv.Mat();

    // Convert to grayscale if needed
    if (src.channels() === 3 || src.channels() === 4) {
      gray = new window.cv.Mat();
      if (src.channels() === 4) {
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      } else {
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGB2GRAY);
      }
    } else {
      gray = src.clone();
    }

    // Apply Laplacian filter
    window.cv.Laplacian(gray, laplacian, window.cv.CV_64F);

    // Calculate variance
    window.cv.meanStdDev(laplacian, mean, stddev);
    const variance = stddev.data64F[0] * stddev.data64F[0];

    // Cleanup
    gray.delete();
    laplacian.delete();
    mean.delete();
    stddev.delete();

    return variance;
  } catch (error) {
    console.error('Error calculating blur score:', error);
    return 0;
  }
}

/**
 * Find the largest rectangle contour in the image
 */
export function findDocumentContour(src: any): any[] | null {
  if (!window.cv || !window.cv.Mat) {
    return null;
  }

  try {
    let gray: any;
    const blur = new window.cv.Mat();
    const edges = new window.cv.Mat();
    const hierarchy = new window.cv.Mat();
    const contours = new window.cv.MatVector();

    // Convert to grayscale
    if (src.channels() === 3 || src.channels() === 4) {
      gray = new window.cv.Mat();
      if (src.channels() === 4) {
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      } else {
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGB2GRAY);
      }
    } else {
      gray = src.clone();
    }

    // Detect if device is mobile for adaptive parameters
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    // Apply Gaussian blur to reduce noise - slightly more blur for mobile
    const blurSize = isMobile ? 7 : 5;
    window.cv.GaussianBlur(gray, blur, new window.cv.Size(blurSize, blurSize), 0);

    // Apply Canny edge detection - lower thresholds for mobile (better detection in lower light)
    const cannyLow = isMobile ? 30 : 50;
    const cannyHigh = isMobile ? 100 : 150;
    window.cv.Canny(blur, edges, cannyLow, cannyHigh);

    // Find contours
    window.cv.findContours(
      edges,
      contours,
      hierarchy,
      window.cv.RETR_EXTERNAL,
      window.cv.CHAIN_APPROX_SIMPLE
    );

    let maxArea = 0;
    let largestContour: any = null;

    // Find the largest contour
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = window.cv.contourArea(contour);

      // Adaptive minimum area threshold - lower for mobile devices
      const minArea = isMobile ? 5000 : 10000;
      if (area > maxArea && area > minArea) {
        // Approximate contour to polygon - more lenient epsilon for mobile
        const epsilonFactor = isMobile ? 0.03 : 0.02;
        const epsilon = epsilonFactor * window.cv.arcLength(contour, true);
        const approx = new window.cv.Mat();
        window.cv.approxPolyDP(contour, approx, epsilon, true);

        // Check if it's roughly rectangular (4-6 corners, more lenient for mobile)
        const minCorners = isMobile ? 4 : 4;
        const maxCorners = isMobile ? 8 : 6;
        if (approx.rows >= minCorners && approx.rows <= maxCorners) {
          maxArea = area;
          largestContour = approx;
        } else {
          approx.delete();
        }
      }
      contour.delete();
    }

    // Cleanup
    gray.delete();
    blur.delete();
    edges.delete();
    hierarchy.delete();
    contours.delete();

    if (largestContour) {
      // Convert contour points to array
      const points: any[] = [];
      for (let i = 0; i < largestContour.rows; i++) {
        points.push({
          x: largestContour.data32S[i * 2],
          y: largestContour.data32S[i * 2 + 1],
        });
      }
      largestContour.delete();
      return points;
    }

    return null;
  } catch (error) {
    console.error('Error finding document contour:', error);
    return null;
  }
}

/**
 * Order points for perspective transformation
 * Returns points in order: top-left, top-right, bottom-right, bottom-left
 */
export function orderPoints(points: any[]): any[] {
  if (points.length < 4) {
    return points;
  }

  // Calculate center
  const center = {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };

  // Sort points by angle from center
  const sortedPoints = points
    .map((p) => {
      const angle = Math.atan2(p.y - center.y, p.x - center.x);
      return { ...p, angle };
    })
    .sort((a, b) => a.angle - b.angle);

  // Identify corners
  const topLeft = sortedPoints.find((p) => p.x < center.x && p.y < center.y) || sortedPoints[0];
  const topRight = sortedPoints.find((p) => p.x > center.x && p.y < center.y) || sortedPoints[1];
  const bottomRight = sortedPoints.find((p) => p.x > center.x && p.y > center.y) || sortedPoints[2];
  const bottomLeft = sortedPoints.find((p) => p.x < center.x && p.y > center.y) || sortedPoints[3];

  return [topLeft, topRight, bottomRight, bottomLeft].filter(Boolean);
}

/**
 * Crop and warp perspective to get the document
 */
export function cropDocument(
  src: any,
  points: any[],
  outputWidth: number = 800,
  outputHeight: number = 500
): any | null {
  if (!window.cv || !window.cv.Mat || points.length < 4) {
    return null;
  }

  try {
    const orderedPoints = orderPoints(points);

    // Source points
    const srcPoints = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      orderedPoints[0].x,
      orderedPoints[0].y,
      orderedPoints[1].x,
      orderedPoints[1].y,
      orderedPoints[2].x,
      orderedPoints[2].y,
      orderedPoints[3].x,
      orderedPoints[3].y,
    ]);

    // Destination points (rectangle)
    const dstPoints = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
      0,
      0,
      outputWidth,
      0,
      outputWidth,
      outputHeight,
      0,
      outputHeight,
    ]);

    // Get perspective transform matrix
    const M = window.cv.getPerspectiveTransform(srcPoints, dstPoints);

    // Warp perspective
    const dst = new window.cv.Mat();
    window.cv.warpPerspective(src, dst, M, new window.cv.Size(outputWidth, outputHeight));

    // Cleanup
    srcPoints.delete();
    dstPoints.delete();
    M.delete();

    return dst;
  } catch (error) {
    console.error('Error cropping document:', error);
    return null;
  }
}

/**
 * Convert OpenCV Mat to base64 image
 */
export function matToBase64(mat: any, format: string = 'image/jpeg'): string | null {
  if (!window.cv || !mat) {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = mat.cols;
    canvas.height = mat.rows;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    // Use OpenCV's imshow helper to convert Mat to ImageData
    try {
      // Convert Mat to RGBA if needed
      let rgbaMat = mat;
      if (mat.channels() === 1) {
        rgbaMat = new window.cv.Mat();
        window.cv.cvtColor(mat, rgbaMat, window.cv.COLOR_GRAY2RGBA);
      } else if (mat.channels() === 3) {
        rgbaMat = new window.cv.Mat();
        window.cv.cvtColor(mat, rgbaMat, window.cv.COLOR_RGB2RGBA);
      }

      // Create ImageData
      const imageData = ctx.createImageData(mat.cols, mat.rows);
      const data = new Uint8ClampedArray(rgbaMat.data);
      imageData.data.set(data);

      ctx.putImageData(imageData, 0, 0);
      
      // Cleanup if we created a new mat
      if (rgbaMat !== mat) {
        rgbaMat.delete();
      }
      
      return canvas.toDataURL(format, 0.92);
    } catch (error) {
      console.error('Error in matToBase64 conversion:', error);
      // Fallback: try direct canvas drawing
      try {
        window.cv.imshow(canvas, mat);
        return canvas.toDataURL(format, 0.92);
      } catch (fallbackError) {
        console.error('Fallback conversion also failed:', fallbackError);
        return null;
      }
    }
  } catch (error) {
    console.error('Error converting mat to base64:', error);
    return null;
  }
}

/**
 * Convert image element or base64 to OpenCV Mat
 */
export async function imageToMat(imageSrc: string | HTMLImageElement | HTMLVideoElement): Promise<any | null> {
  if (!window.cv) {
    return null;
  }

  try {
    let img: HTMLImageElement | HTMLVideoElement;

    if (typeof imageSrc === 'string') {
      // Base64 or URL
      img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });
    } else {
      img = imageSrc;
    }

    // Create canvas to get image data
    const canvas = document.createElement('canvas');
    canvas.width = img.videoWidth || img.width;
    canvas.height = img.videoHeight || img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create OpenCV Mat from image data
    const mat = window.cv.matFromImageData(imageData);
    return mat;
  } catch (error) {
    console.error('Error converting image to mat:', error);
    return null;
  }
}

/**
 * Detect document in video frame
 * Returns detection result with contour points and blur score
 */
export async function detectDocumentInFrame(
  videoElement: HTMLVideoElement
): Promise<{
  detected: boolean;
  points: any[] | null;
  blurScore: number;
  stable: boolean;
} | null> {
  if (!window.cv) {
    return null;
  }

  try {
    const mat = await imageToMat(videoElement);
    if (!mat) {
      return null;
    }

    const blurScore = calculateBlurScore(mat);
    const points = findDocumentContour(mat);

    mat.delete();

    return {
      detected: points !== null && points.length >= 4,
      points: points || null,
      blurScore,
      stable: false, // Stability is checked over time by the component
    };
  } catch (error) {
    console.error('Error detecting document:', error);
    return null;
  }
}

