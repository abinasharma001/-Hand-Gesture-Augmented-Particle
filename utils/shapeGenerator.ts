import * as THREE from 'three';
import { ShapeType } from '../types';

// Helper to get a random point in a sphere
const randomInSphere = (radius: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
};

// Helper: Generate particles from Text
const generateTextParticles = (text: string, count: number): THREE.Vector3[] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  // Increased size to fit long names like "Abinash Sharma"
  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px Arial'; // Larger font for better resolution
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const validPixels: THREE.Vector3[] = [];

  // Sample density based on image size
  const step = 4; 
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      if (data[index] > 128) { // If pixel is bright
        // Map to 3D space centered at 0
        // Scale down to fit in view (approx -4 to 4)
        const pX = (x - width / 2) * 0.015;
        const pY = -(y - height / 2) * 0.015; // Flip Y
        validPixels.push(new THREE.Vector3(pX, pY, 0));
      }
    }
  }

  // Resample to match exact count
  const result: THREE.Vector3[] = [];
  
  // Fallback if text generation failed (prevent crash)
  if (validPixels.length === 0) {
      for (let i = 0; i < count; i++) {
        result.push(randomInSphere(2));
      }
      return result;
  }

  for (let i = 0; i < count; i++) {
    const p = validPixels[Math.floor(Math.random() * validPixels.length)];
    // Add thickness
    result.push(new THREE.Vector3(p.x, p.y, (Math.random() - 0.5) * 0.5));
  }
  return result;
};

export const generateParticles = (count: number, type: ShapeType): Float32Array => {
  const positions = new Float32Array(count * 3);

  // Pre-calculate text points if needed
  let textPoints: THREE.Vector3[] = [];
  if (type === ShapeType.TEXT_ABINASH) {
    textPoints = generateTextParticles("Abinash Sharma", count);
  } else if (type === ShapeType.TEXT_AS) {
    textPoints = generateTextParticles("A & S", count);
  }

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;

    switch (type) {
      case ShapeType.HEART: {
        const t = Math.random() * Math.PI * 2;
        x = 16 * Math.pow(Math.sin(t), 3);
        y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        z = (Math.random() - 0.5) * 5; 
        x *= 0.15; y *= 0.15; z *= 0.5;
        y += 0.5; // Center it better
        break;
      }
      case ShapeType.SATURN: {
        if (Math.random() > 0.4) {
          const p = randomInSphere(1.5);
          x = p.x; y = p.y; z = p.z;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const dist = 2.2 + Math.random() * 1.5;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          y = (Math.random() - 0.5) * 0.1;
          const tilt = Math.PI / 6;
          const yNew = y * Math.cos(tilt) - z * Math.sin(tilt);
          const zNew = y * Math.sin(tilt) + z * Math.cos(tilt);
          y = yNew; z = zNew;
        }
        break;
      }
      case ShapeType.FLOWER: {
        const k = 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const rBase = 2 + Math.cos(k * theta) * Math.sin(phi);
        const r = rBase * Math.sqrt(Math.random());
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.cos(phi);
        z = r * Math.sin(phi) * Math.sin(theta);
        break;
      }
      case ShapeType.BUDDHA: {
         const r = Math.random();
         if (r < 0.3) {
           const angle = Math.random() * Math.PI * 2;
           const rad = 1.5 * Math.sqrt(Math.random());
           x = Math.cos(angle) * rad; z = Math.sin(angle) * rad; y = -1.5 + (Math.random() * 0.5);
         } else if (r < 0.7) {
           const p = randomInSphere(1.1);
           x = p.x * 0.8; y = p.y; z = p.z * 0.8;
         } else {
           const p = randomInSphere(0.6);
           x = p.x; y = 1.2 + p.y; z = p.z;
         }
         break;
      }
      case ShapeType.JAGANNATH: {
        // Abstract Jagannath Face
        const r = Math.random();
        // Face outline (Square-ish circle)
        if (r < 0.4) {
           const p = randomInSphere(2.5);
           x = p.x; y = p.y * 0.9; z = p.z * 0.2; 
        } 
        // Big Circular Eyes
        else if (r < 0.7) {
            const whichEye = Math.random() > 0.5 ? 1 : -1;
            const angle = Math.random() * Math.PI * 2;
            const rad = Math.sqrt(Math.random()) * 0.8; 
            x = (whichEye * 1.2) + Math.cos(angle) * rad;
            y = 0.5 + Math.sin(angle) * rad;
            z = 0.2;
        }
        // Smile
        else {
           const t = Math.random() * Math.PI;
           x = 1.5 * Math.cos(t + Math.PI); 
           y = -1.0 + 0.5 * Math.sin(t + Math.PI);
           z = 0.2;
        }
        break;
      }
      case ShapeType.BOW: {
        // Bow and Arrow
        const r = Math.random();
        if (r < 0.4) {
          // The Bow Arc
          const t = (Math.random() - 0.5) * Math.PI * 0.8;
          x = Math.cos(t) * 2.5; 
          y = Math.sin(t) * 4.0; 
          z = 0;
        } else if (r < 0.5) {
           // The String
           x = 0.5;
           y = (Math.random() - 0.5) * 7.0;
           z = 0;
        } else {
           // The Arrow
           x = (Math.random() - 0.5) * 5.0; 
           y = 0;
           z = 0;
        }
        // Rotate to aim 
        const ang = -Math.PI/4;
        const xOld = x;
        x = x * Math.cos(ang) - y * Math.sin(ang);
        y = xOld * Math.sin(ang) + y * Math.cos(ang);
        break;
      }
      case ShapeType.TEXT_ABINASH:
      case ShapeType.TEXT_AS: {
        if (textPoints.length > 0) {
          const p = textPoints[i % textPoints.length];
          x = p.x; y = p.y; z = p.z;
        }
        break;
      }
      case ShapeType.FIREWORKS:
      case ShapeType.SPHERE:
      default: {
        const p = randomInSphere(2.5);
        x = p.x; y = p.y; z = p.z;
        break;
      }
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};