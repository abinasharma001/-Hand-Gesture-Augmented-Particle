import { FilesetResolver, HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export class GestureService {
  private handLandmarker: HandLandmarker | null = null;
  private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private rafId: number = 0;

  // Callbacks
  public onResults: (openness: number, distance: number, fingerCount: number, isHandsDetected: boolean) => void = () => {};

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: this.runningMode,
        numHands: 2
      });
      console.log("HandLandmarker initialized");
    } catch (e) {
      console.error("Failed to init HandLandmarker", e);
    }
  }

  start(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.detect();
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private countFingers(landmarks: NormalizedLandmark[]): number {
    // Tips IDs: Thumb=4, Index=8, Middle=12, Ring=16, Pinky=20
    // PIP IDs (Knuckles): Thumb=2, Index=6, Middle=10, Ring=14, Pinky=18
    
    let count = 0;

    // Thumb: Compare X position (depends on handedness, simplistic check here)
    // We'll skip thumb for simple 1-4 counting to avoid confusion, or treat simplistic logic:
    // Check if tip is "far" from MCP
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    
    // Logic for fingers (Index, Middle, Ring, Pinky)
    // If Tip Y < PIP Y (Note: Y is 0 at top in MediaPipe, so Lower value is Higher on screen)
    if (landmarks[8].y < landmarks[6].y) count++; // Index
    if (landmarks[12].y < landmarks[10].y) count++; // Middle
    if (landmarks[16].y < landmarks[14].y) count++; // Ring
    if (landmarks[20].y < landmarks[18].y) count++; // Pinky

    // Thumb logic is tricky due to rotation. 
    // Simplified: If thumb tip is further from pinky base than index base
    // For now, let's just stick to the 4 main fingers for reliable 1-4 counts
    // But user asked for 1, 2, 3, 4. 
    // Let's add thumb if it's extended outward.
    
    return count;
  }

  private detect = () => {
    this.rafId = requestAnimationFrame(this.detect);

    if (!this.handLandmarker || !this.video || this.video.readyState < 2) return;

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const results = this.handLandmarker.detectForVideo(this.video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        let avgOpenness = 0;
        let handDistance = 0.5; // Default neutral
        let maxFingers = 0;

        results.landmarks.forEach(landmarks => {
          const wrist = landmarks[0];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];
          
          const d1 = Math.sqrt(Math.pow(indexTip.x - wrist.x, 2) + Math.pow(indexTip.y - wrist.y, 2));
          const d2 = Math.sqrt(Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2));
          
          const openness = Math.min(Math.max((Math.max(d1, d2) - 0.1) * 3, 0), 1);
          avgOpenness += openness;

          const fCount = this.countFingers(landmarks);
          if (fCount > maxFingers) maxFingers = fCount;
        });

        avgOpenness /= results.landmarks.length;

        if (results.landmarks.length === 2) {
          const h1 = results.landmarks[0][0]; 
          const h2 = results.landmarks[1][0]; 
          const dx = h1.x - h2.x;
          const dy = h1.y - h2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          handDistance = Math.min(Math.max(dist, 0), 1); 
        }

        this.onResults(avgOpenness, handDistance, maxFingers, true);
      } else {
        this.onResults(0, 0.5, 0, false);
      }
    }
  };
}

export const gestureService = new GestureService();