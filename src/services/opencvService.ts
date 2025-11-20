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
 * Calculate aspect ratio of a bounding rectangle
 */
function calculateAspectRatio(points: any[]): number {
  if (points.length < 4) return 0;
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  
  if (height === 0) return 0;
  return width / height;
}

/**
 * Calculate bounding rectangle area
 */
function calculateBoundingArea(points: any[]): number {
  if (points.length < 4) return 0;
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  
  return width * height;
}

/**
 * Check if the shape matches ID card dimensions
 * Emirates ID card aspect ratio: ~1.586:1 (standard ID-1 format: 85.6mm × 53.98mm)
 * Acceptable range: 1.4:1 to 1.7:1 (allowing for perspective and angle)
 */
function isValidIDCardShape(points: any[], imageWidth: number, imageHeight: number): boolean {
  if (points.length < 4) return false;
  
  const aspectRatio = calculateAspectRatio(points);
  const boundingArea = calculateBoundingArea(points);
  const imageArea = imageWidth * imageHeight;
  
  // Aspect ratio check - ID cards are roughly 1.586:1 (width:height)
  // Very wide range for easier detection (allowing for perspective distortion)
  const minAspectRatio = 1.1;
  const maxAspectRatio = 2.2;
  
  if (aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio) {
    return false;
  }
  
  // Size check - ID card should take up a reasonable portion of the image
  // Very lenient range for easier detection, especially for close-up cards
  // Minimum: 5% of image area (filters out chips and small objects)
  // Maximum: 98% of image area (allows very close-up cards that fill most of frame)
  const minAreaRatio = 0.05;
  const maxAreaRatio = 0.98;
  const areaRatio = boundingArea / imageArea;
  
  if (areaRatio < minAreaRatio || areaRatio > maxAreaRatio) {
    return false;
  }
  
  // Minimum absolute size - much smaller for easier detection
  // Cards are typically at least 100x60 pixels when detected
  const minWidth = 100;
  const minHeight = 60;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  
  if (width < minWidth || height < minHeight) {
    return false;
  }
  
  return true;
}

/**
 * Find the largest ID card-shaped contour in the image
 * Specifically filters for Emirates ID card dimensions and proportions
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

    const imageWidth = src.cols;
    const imageHeight = src.rows;

    // Detect if device is mobile for adaptive parameters
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    // Apply contrast enhancement for better edge detection on similar-colored backgrounds
    const enhanced = new window.cv.Mat();
    window.cv.convertScaleAbs(gray, enhanced, 1.5, 30); // Increase contrast and brightness
    
    // Apply histogram equalization to improve contrast
    const equalized = new window.cv.Mat();
    window.cv.equalizeHist(enhanced, equalized);
    
    // Apply Gaussian blur to reduce noise - slightly more blur for mobile
    const blurSize = isMobile ? 7 : 5;
    window.cv.GaussianBlur(equalized, blur, new window.cv.Size(blurSize, blurSize), 0);

    // Try adaptive thresholding first for low-contrast scenarios
    const adaptive = new window.cv.Mat();
    window.cv.adaptiveThreshold(
      blur,
      adaptive,
      255,
      window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      window.cv.THRESH_BINARY,
      11,
      2
    );
    
    // Apply Canny edge detection with lower thresholds for better sensitivity
    // Use lower thresholds to detect edges even on similar-colored backgrounds
    const cannyLow = isMobile ? 10 : 15;
    const cannyHigh = isMobile ? 40 : 50;
    window.cv.Canny(blur, edges, cannyLow, cannyHigh);
    
    // Combine adaptive threshold and Canny edges for better detection
    const combined = new window.cv.Mat();
    window.cv.bitwise_or(edges, adaptive, combined);
    
    // Cleanup intermediate mats
    enhanced.delete();
    equalized.delete();
    adaptive.delete();

    // Apply morphological operations to close gaps in card edges
    // Use larger kernel for better edge connection on low-contrast images
    const kernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(5, 5));
    const closed = new window.cv.Mat();
    window.cv.morphologyEx(combined, closed, window.cv.MORPH_CLOSE, kernel);
    
    // Additional dilation to strengthen weak edges
    const dilated = new window.cv.Mat();
    const dilateKernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(3, 3));
    window.cv.dilate(closed, dilated, dilateKernel);
    
    kernel.delete();
    dilateKernel.delete();
    combined.delete();

    // Find contours
    window.cv.findContours(
      dilated,
      contours,
      hierarchy,
      window.cv.RETR_EXTERNAL,
      window.cv.CHAIN_APPROX_SIMPLE
    );

    let bestContour: any = null;
    let bestScore = 0;

    // Find the best ID card-shaped contour
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = window.cv.contourArea(contour);

      // Minimum area threshold - much lower for easier detection, especially for cards held by hand
      const minArea = isMobile ? 1500 : 2000;
      if (area < minArea) {
        contour.delete();
        continue;
      }

      // Approximate contour to polygon - more lenient for cards held by hand
      // Higher epsilon factor allows for less precise edges (when fingers cover parts)
      const epsilonFactor = isMobile ? 0.05 : 0.045;
      const epsilon = epsilonFactor * window.cv.arcLength(contour, true);
      const approx = new window.cv.Mat();
      window.cv.approxPolyDP(contour, approx, epsilon, true);

      // Check if it's roughly rectangular (4-12 corners acceptable for cards held by hand)
      // More corners allowed because fingers/hand might create additional edge points
      const minCorners = 4;
      const maxCorners = 12;
      if (approx.rows < minCorners || approx.rows > maxCorners) {
        approx.delete();
        contour.delete();
        continue;
      }

      // Convert to points array for validation
      const points: any[] = [];
      for (let j = 0; j < approx.rows; j++) {
        points.push({
          x: approx.data32S[j * 2],
          y: approx.data32S[j * 2 + 1],
        });
      }

      // Validate if it matches ID card shape characteristics
      if (isValidIDCardShape(points, imageWidth, imageHeight)) {
        // Score based on area and aspect ratio match (closer to 1.586 is better)
        // Prefer larger cards (close-up) - up to 70% of image area
        const aspectRatio = calculateAspectRatio(points);
        const idealAspectRatio = 1.586;
        const aspectRatioScore = 1 - Math.abs(aspectRatio - idealAspectRatio) / idealAspectRatio;
        const imageArea = imageWidth * imageHeight;
        const areaRatio = area / imageArea;
        // Prefer larger cards (close-up) - give higher score to cards that take up more space
        const areaScore = Math.min(areaRatio / 0.7, 1); // Prefer cards up to 70% of image (close-up)
        // Weight area more heavily for close-up detection
        const score = aspectRatioScore * 0.4 + areaScore * 0.6;

        if (score > bestScore) {
          if (bestContour) {
            bestContour.delete();
          }
          bestScore = score;
          bestContour = approx;
        } else {
          approx.delete();
        }
      } else {
        approx.delete();
      }
      
      contour.delete();
    }

    // Cleanup
    gray.delete();
    blur.delete();
    edges.delete();
    closed.delete();
    dilated.delete();
    hierarchy.delete();
    contours.delete();

    if (bestContour) {
      // Convert contour points to array
      const points: any[] = [];
      for (let i = 0; i < bestContour.rows; i++) {
        points.push({
          x: bestContour.data32S[i * 2],
          y: bestContour.data32S[i * 2 + 1],
        });
      }
      bestContour.delete();
      console.log('✅ Valid ID card shape detected:', {
        aspectRatio: calculateAspectRatio(points).toFixed(2),
        areaRatio: (calculateBoundingArea(points) / (imageWidth * imageHeight) * 100).toFixed(1) + '%'
      });
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
    canvas.width = (img instanceof HTMLVideoElement ? img.videoWidth : img.width) || img.width;
    canvas.height = (img instanceof HTMLVideoElement ? img.videoHeight : img.height) || img.height;

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
 * Calculate guide frame bounds (Region of Interest) for detection
 * Returns ROI bounds: { x, y, width, height }
 */
export function calculateGuideFrameROI(
  videoWidth: number,
  videoHeight: number
): { x: number; y: number; width: number; height: number } | null {
  if (!videoWidth || !videoHeight) {
    return null;
  }

  // Guide frame dimensions match the UI frame (centered, ID card aspect ratio)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const isSmallScreen = window.innerWidth >= 640 && window.innerWidth < 768; // sm breakpoint
  const isMediumScreen = window.innerWidth >= 768; // md breakpoint

  // Frame width as percentage of video width
  let frameWidthPercent = 0.70; // Default for mobile (70%)
  if (isSmallScreen) {
    frameWidthPercent = 0.65; // Small screens (65%)
  } else if (isMediumScreen) {
    frameWidthPercent = 0.60; // Medium+ screens (60%)
  }

  // Calculate frame width and height (maintaining ID card aspect ratio: 85.6/53.98 ≈ 1.586)
  const idCardAspectRatio = 85.6 / 53.98;
  let frameWidth = videoWidth * frameWidthPercent;
  let frameHeight = frameWidth / idCardAspectRatio;

  // Apply max width constraints (matching UI constraints)
  const maxWidth = isMobile ? 320 : 400;
  const maxHeight = isMobile ? 200 : 250;

  if (frameWidth > maxWidth) {
    frameWidth = maxWidth;
    frameHeight = frameWidth / idCardAspectRatio;
  }
  if (frameHeight > maxHeight) {
    frameHeight = maxHeight;
    frameWidth = frameHeight * idCardAspectRatio;
  }

  // Ensure frame doesn't exceed video dimensions
  frameWidth = Math.min(frameWidth, videoWidth);
  frameHeight = Math.min(frameHeight, videoHeight);

  // Center the frame
  const x = Math.max(0, (videoWidth - frameWidth) / 2);
  const y = Math.max(0, (videoHeight - frameHeight) / 2);

  // Ensure ROI is within bounds
  const roiX = Math.floor(Math.max(0, x));
  const roiY = Math.floor(Math.max(0, y));
  const roiWidth = Math.floor(Math.min(frameWidth, videoWidth - roiX));
  const roiHeight = Math.floor(Math.min(frameHeight, videoHeight - roiY));

  return {
    x: roiX,
    y: roiY,
    width: roiWidth,
    height: roiHeight,
  };
}

/**
 * Detect document in video frame (across entire frame for close-up detection)
 * Returns detection result with contour points and blur score
 */
export async function detectDocumentInFrame(
  videoElement: HTMLVideoElement,
  useROI: boolean = false // Detect across entire frame by default for close-up cards
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
    const fullMat = await imageToMat(videoElement);
    if (!fullMat) {
      return null;
    }

    const videoWidth = fullMat.cols;
    const videoHeight = fullMat.rows;

    let mat = fullMat;
    let roiOffsetX = 0;
    let roiOffsetY = 0;

    // Crop to guide frame region if requested
    if (useROI) {
      const roi = calculateGuideFrameROI(videoWidth, videoHeight);
      
      if (roi && roi.width > 0 && roi.height > 0 && 
          roi.x >= 0 && roi.y >= 0 && 
          roi.x + roi.width <= videoWidth && 
          roi.y + roi.height <= videoHeight) {
        
        // Extract ROI from full image
        const roiRect = new window.cv.Rect(roi.x, roi.y, roi.width, roi.height);
        mat = fullMat.roi(roiRect);
        
        // Store offset to adjust points back to full video coordinates
        roiOffsetX = roi.x;
        roiOffsetY = roi.y;
        
        console.log('🎯 Detection limited to guide frame ROI:', {
          roi,
          videoSize: { width: videoWidth, height: videoHeight },
          roiPercent: {
            width: ((roi.width / videoWidth) * 100).toFixed(1) + '%',
            height: ((roi.height / videoHeight) * 100).toFixed(1) + '%'
          }
        });
      } else {
        console.warn('⚠️ Invalid ROI, using full frame for detection:', roi);
      }
    }

    const blurScore = calculateBlurScore(mat);
    const points = findDocumentContour(mat);

    // Adjust points back to full video coordinates if ROI was used
    let adjustedPoints = points;
    if (useROI && points && points.length >= 4 && (roiOffsetX !== 0 || roiOffsetY !== 0)) {
      adjustedPoints = points.map(point => ({
        x: point.x + roiOffsetX,
        y: point.y + roiOffsetY,
      }));
      console.log('📍 Adjusted detection points to full video coordinates:', {
        original: points,
        adjusted: adjustedPoints,
        offset: { x: roiOffsetX, y: roiOffsetY }
      });
    }

    // Cleanup
    if (mat !== fullMat) {
      mat.delete();
    }
    fullMat.delete();

    return {
      detected: adjustedPoints !== null && adjustedPoints.length >= 4,
      points: adjustedPoints || null,
      blurScore,
      stable: false, // Stability is checked over time by the component
    };
  } catch (error) {
    console.error('Error detecting document:', error);
    return null;
  }
}

