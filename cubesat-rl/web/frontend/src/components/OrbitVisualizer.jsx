import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Trail } from '@react-three/drei';
import * as THREE from 'three';

// Earth sphere with realistic appearance
function Earth() {
  const meshRef = useRef();
  useFrame(() => { if (meshRef.current) meshRef.current.rotation.y += 0.0005; });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial color="#1a4a8a" emissive="#0a1f4a" specular="#4488cc" shininess={40} />
    </mesh>
  );
}

// Atmosphere glow
function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.03, 32, 32]} />
      <meshPhongMaterial
        color="#2266cc"
        transparent opacity={0.12}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// Orbital path ghost ring
function OrbitRing({ radius = 1.45 }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00d4ff" transparent opacity={0.15} />
    </line>
  );
}

// Satellite that orbits automatically (demo mode) or follows live data
function Satellite({ position, color = '#00d4ff', autoOrbit = true, action = null }) {
  const groupRef = useRef();
  const angle = useRef(0);
  const thrustValue = action && action[0] > 0 ? action[0] : 0; // map [-1,1] to [0,1] roughly, thrust is mainly >0

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (autoOrbit) {
      angle.current += delta * 0.4;
      const r = 1.45;
      groupRef.current.position.set(
        Math.cos(angle.current) * r,
        Math.sin(angle.current * 0.15) * 0.15,
        Math.sin(angle.current) * r,
      );
    } else if (position) {
      groupRef.current.position.set(...position);
    }
    // Only spin if auto-orbiting, otherwise attitude should be driven by quaternion if we had it, but here we just leave it or spin it slowly.
    if (autoOrbit) {
      groupRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group ref={groupRef}>
      <Trail width={0.04} length={30} color={color} attenuation={t => t * t}>
        <mesh>
          <boxGeometry args={[0.04, 0.02, 0.06]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      </Trail>
      {/* Solar panels */}
      <mesh position={[0.07, 0, 0]}>
        <boxGeometry args={[0.06, 0.002, 0.03]} />
        <meshStandardMaterial color="#334466" emissive="#223355" />
      </mesh>
      <mesh position={[-0.07, 0, 0]}>
        <boxGeometry args={[0.06, 0.002, 0.03]} />
        <meshStandardMaterial color="#334466" emissive="#223355" />
      </mesh>
      {/* Thruster Plume (visible only when thrusting) */}
      {thrustValue > 0 && (
        <mesh position={[0, 0, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.015, 0.08 * thrustValue, 16]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.8 + 0.2 * thrustValue} />
          <pointLight color="#ff8800" intensity={2 * thrustValue} distance={0.5} />
        </mesh>
      )}
      {/* Glow point */}
      <pointLight color={color} intensity={0.6} distance={0.4} />
    </group>
  );
}

export default function OrbitVisualizer({
  satellitePosition = null, // [x, y, z] normalized, or null for auto-orbit
  satelliteColor = '#00d4ff',
  height = 400,
  autoOrbit = true,
  action = null,
}) {
  return (
    <div style={{ width: '100%', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#020710' }}>
      <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }}>
        <color attach="background" args={['#020710']} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color="#fff8e7" />
        <pointLight position={[-5, -2, -3]} intensity={0.3} color="#2244aa" />

        <Stars radius={80} depth={50} count={3000} factor={3} saturation={0} fade />

        <Earth />
        <Atmosphere />
        <OrbitRing radius={1.45} />
        <Satellite position={satellitePosition} color={satelliteColor} autoOrbit={autoOrbit} action={action} />

        <OrbitControls enablePan={false} minDistance={2} maxDistance={6} autoRotate autoRotateSpeed={0.3} />
      </Canvas>
    </div>
  );
}
