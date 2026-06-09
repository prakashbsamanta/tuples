import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useProgressStore } from '../../store/useProgressStore';

const COUNT = 170;
const BOUND = new THREE.Vector3(7.5, 4.4, 3);
const LINK_DIST = 2.1;
const MAX_LINKS = 1100;
const PALETTE = ['#6366f1', '#8b5cf6', '#38bdf8'];

/** A soft radial dot so points read as glowing nodes rather than hard squares. */
function makeDotTexture(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(196,205,255,0.9)');
  g.addColorStop(1, 'rgba(120,120,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/**
 * A drifting 3D point cloud whose nearby nodes are linked into a living network.
 * Parallaxes toward the cursor and pulses (brighter, faster, bigger) on game events.
 */
export function ParticleField() {
  const group = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);
  const mouse = useRef({ x: 0, y: 0 });
  const pulse = useRef(0);

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = PALETTE.map((c) => new THREE.Color(c));
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * BOUND.x;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * BOUND.y;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * BOUND.z;
      velocities[i * 3] = (Math.random() * 2 - 1) * 0.05;
      velocities[i * 3 + 1] = (Math.random() * 2 - 1) * 0.05;
      velocities[i * 3 + 2] = (Math.random() * 2 - 1) * 0.03;
      const col = palette[i % palette.length];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { positions, velocities, colors };
  }, []);

  const dotTex = useMemo(makeDotTexture, []);
  const linePositions = useMemo(() => new Float32Array(MAX_LINKS * 2 * 3), []);

  // Track the cursor across the whole window (the canvas itself is pointer-events:none).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // React to game events: a solve gives a ripple, a level-up a bigger one.
  useEffect(() => {
    return useProgressStore.subscribe((s, p) => {
      if (s.lastSolve && s.lastSolve !== p.lastSolve) pulse.current = Math.max(pulse.current, 1);
      if (Math.floor(s.xp / 500) > Math.floor(p.xp / 500)) pulse.current = 1.8;
    });
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const speed = 1 + pulse.current * 1.6;

    // Drift + wrap inside the bounding box.
    for (let i = 0; i < COUNT; i++) {
      const xi = i * 3, yi = xi + 1, zi = xi + 2;
      arr[xi] += velocities[xi] * speed * dt * 8;
      arr[yi] += velocities[yi] * speed * dt * 8;
      arr[zi] += velocities[zi] * speed * dt * 8;
      if (arr[xi] > BOUND.x) arr[xi] = -BOUND.x; else if (arr[xi] < -BOUND.x) arr[xi] = BOUND.x;
      if (arr[yi] > BOUND.y) arr[yi] = -BOUND.y; else if (arr[yi] < -BOUND.y) arr[yi] = BOUND.y;
      if (arr[zi] > BOUND.z) arr[zi] = -BOUND.z; else if (arr[zi] < -BOUND.z) arr[zi] = BOUND.z;
    }
    posAttr.needsUpdate = true;

    // Rebuild links between nearby nodes.
    let v = 0;
    const maxV = MAX_LINKS * 2 * 3;
    const linkDist2 = LINK_DIST * LINK_DIST;
    for (let i = 0; i < COUNT && v < maxV; i++) {
      const ax = arr[i * 3], ay = arr[i * 3 + 1], az = arr[i * 3 + 2];
      for (let j = i + 1; j < COUNT && v < maxV; j++) {
        const dx = ax - arr[j * 3];
        const dy = ay - arr[j * 3 + 1];
        const dz = az - arr[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < linkDist2) {
          linePositions[v++] = ax; linePositions[v++] = ay; linePositions[v++] = az;
          linePositions[v++] = arr[j * 3]; linePositions[v++] = arr[j * 3 + 1]; linePositions[v++] = arr[j * 3 + 2];
        }
      }
    }
    const lineAttr = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    lineAttr.needsUpdate = true;
    linesRef.current.geometry.setDrawRange(0, v / 3);

    // Parallax toward the cursor.
    const g = group.current;
    g.rotation.y += (mouse.current.x * 0.35 - g.rotation.y) * 0.05;
    g.rotation.x += (-mouse.current.y * 0.25 - g.rotation.x) * 0.05;

    // Pulse decay + visual reaction.
    pulse.current *= 0.94;
    const pm = pointsRef.current.material as THREE.PointsMaterial;
    pm.size = 0.13 + pulse.current * 0.13;
    pm.opacity = 0.7 + pulse.current * 0.3;
    const lm = linesRef.current.material as THREE.LineBasicMaterial;
    lm.opacity = 0.1 + pulse.current * 0.28;
  });

  return (
    <group ref={group}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={dotTex}
          size={0.13}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.8}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}
