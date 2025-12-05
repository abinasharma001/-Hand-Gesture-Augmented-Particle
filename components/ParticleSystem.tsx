import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeType, AppState, THEMES } from '../types';
import { generateParticles } from '../utils/shapeGenerator';

// Vertex Shader
const vertexShader = `
  uniform float uTime;
  uniform float uSize;
  uniform float uMorphFactor;
  uniform float uExpansion; // From hand gesture (openness)
  uniform float uNoiseStrength;
  uniform float uGlobalScale; // From hand distance
  
  attribute vec3 aPositionTarget;
  
  varying vec3 vColor;
  varying float vAlpha;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // Morphing logic
    vec3 mixedPos = mix(position, aPositionTarget, uMorphFactor);

    // Dynamic noise
    float noiseVal = snoise(mixedPos * 2.0 + uTime * 0.5) * uNoiseStrength;
    
    // Hand Gesture: Expansion (Explodes outwards from center)
    // Add noise to the direction of expansion for organic feel
    vec3 direction = normalize(mixedPos + vec3(0.001)); 
    vec3 expansionVec = direction * uExpansion * (1.0 + noiseVal);

    // Apply transformation
    vec3 finalPos = mixedPos + expansionVec;
    
    // Global Scale (Distance between hands)
    finalPos *= uGlobalScale;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = uSize * (300.0 / -mvPosition.z);

    // Fade transparency based on depth and noise
    vAlpha = 0.6 + 0.4 * sin(uTime + noiseVal * 10.0);
  }
`;

// Fragment Shader
const fragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // Circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft edge
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(uColor, vAlpha * glow);
  }
`;

interface ParticleSystemProps {
  appState: AppState;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ appState }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Buffers for morphing
  const [currentPositions, setCurrentPositions] = useState<Float32Array>(() => generateParticles(appState.particleCount, ShapeType.SPHERE));
  const [targetPositions, setTargetPositions] = useState<Float32Array>(() => generateParticles(appState.particleCount, ShapeType.SPHERE));
  
  // Animation state
  const morphProgress = useRef(1.0); // 0 to 1
  const prevShape = useRef(appState.shape);
  const prevCount = useRef(appState.particleCount);

  // Re-generate particles when Count changes
  useEffect(() => {
    if (appState.particleCount !== prevCount.current) {
        const newPos = generateParticles(appState.particleCount, appState.shape);
        setCurrentPositions(newPos);
        setTargetPositions(newPos);
        prevCount.current = appState.particleCount;
        morphProgress.current = 1.0;
    }
  }, [appState.particleCount, appState.shape]);

  // Handle Shape Change logic
  useEffect(() => {
    if (appState.shape !== prevShape.current) {
      // Logic:
      // 1. Snapshot current visual state to 'position' attribute (handled by lerp in useFrame roughly, but for simplicity here we just swap)
      // Actually, we will just update targetPositions and let the shader interpolate if we could, 
      // but standard attribute interpolation is hard in raw GLSL without double buffering.
      // So we will do a "fake" morph:
      // We keep 'position' as the Start, 'aPositionTarget' as the End, and animate uMorphFactor.
      
      // If we are fully morphed (progress=1), current 'position' attribute is effectively 'aPositionTarget'.
      // So we copy target -> current.
      setCurrentPositions(targetPositions); // Set current to what was the target
      
      // Generate NEW target
      const newTarget = generateParticles(appState.particleCount, appState.shape);
      setTargetPositions(newTarget);
      
      // Reset Morph
      morphProgress.current = 0.0;
      prevShape.current = appState.shape;
    }
  }, [appState.shape, appState.particleCount, targetPositions]);

  // Uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSize: { value: appState.particleSize },
    uColor: { value: new THREE.Color(appState.color) },
    uMorphFactor: { value: 1.0 },
    uExpansion: { value: 0.0 },
    uGlobalScale: { value: 1.0 },
    uNoiseStrength: { value: appState.noiseStrength }
  }), []);

  // Frame Loop
  useFrame((state) => {
    if (!shaderRef.current) return;

    // Update Time
    shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Update simple props
    shaderRef.current.uniforms.uSize.value = appState.particleSize;
    shaderRef.current.uniforms.uNoiseStrength.value = appState.noiseStrength;
    shaderRef.current.uniforms.uColor.value.set(appState.color);

    // Update Morphing
    if (morphProgress.current < 1.0) {
      morphProgress.current += 0.02; // Morph speed
      if (morphProgress.current > 1.0) morphProgress.current = 1.0;
      shaderRef.current.uniforms.uMorphFactor.value = morphProgress.current;
    }

    // Handle Gestures / Interactions
    // Expansion: 0 (closed) -> 1 (open). Map to 0..2 or so for explosion.
    let targetExpansion = 0;
    let targetScale = 1.0;

    if (appState.useCamera) {
      // Map openness: 0.2 (fist) -> 0.0 expansion, 0.8 (open) -> 1.5 expansion
      // If fireworks, we explode huge
      if (appState.shape === ShapeType.FIREWORKS && appState.isExploding) {
          targetExpansion = 5.0 + Math.sin(state.clock.elapsedTime * 10) * 1.0;
      } else {
        targetExpansion = appState.gestureOpen * 2.5; // Scale up effect
      }
      
      // Map Distance: 0 (close) -> 0.5 scale, 1 (far) -> 1.5 scale
      // Default distance is usually around 0.3-0.5 depending on webcam framing
      targetScale = 0.5 + appState.gestureDistance * 1.5;
    } else {
      // Mouse/Fallback logic could go here, but for now we leave static or subtle breathing
      targetExpansion = 0.2 + Math.sin(state.clock.elapsedTime) * 0.1;
      targetScale = 1.0;
    }

    // Smooth LERP for physics
    shaderRef.current.uniforms.uExpansion.value = THREE.MathUtils.lerp(
      shaderRef.current.uniforms.uExpansion.value,
      targetExpansion,
      0.1
    );

    shaderRef.current.uniforms.uGlobalScale.value = THREE.MathUtils.lerp(
      shaderRef.current.uniforms.uGlobalScale.value,
      targetScale,
      0.1
    );
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={currentPositions.length / 3}
          array={currentPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aPositionTarget"
          count={targetPositions.length / 3}
          array={targetPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
      />
    </points>
  );
};
