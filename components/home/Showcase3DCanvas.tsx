"use client";

// react-three-fiber armchair scene for the home-page 3D showcase.
//
// Procedurally modelled — every shape is a primitive (RoundedBox or
// Cylinder) so we ship zero glTF / GLB assets and the silhouette
// stays in our control. Materials, palette, and lighting are tuned to
// match the warm-cream + walnut + terracotta brand system in
// app/globals.css.
//
// This module is dynamic-imported with `ssr: false` from
// Showcase3DLazy.tsx — never import it directly from a server module.

import { useEffect, useMemo, useRef } from "react";

import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const PALETTE = {
  // Warm walnut for the structural frame.
  walnut: "#3f2a1d",
  // Slightly lighter walnut for the legs — gives subtle internal contrast.
  walnutLight: "#5b3e29",
  // Cream linen upholstery — close to surface-100 in OKLCH.
  linen: "#e8dec8",
  // Brand terracotta for the throw pillow.
  terracotta: "#c46b3b",
  // Floor — slightly warmer than surface-300.
  floor: "#efe6d4",
} as const;

export function Showcase3DCanvas() {
  return (
    <Canvas
      shadows
      // dpr clamp keeps retina performance sane without ruining 4K.
      dpr={[1, 2]}
      camera={{ position: [3.2, 2.0, 4.4], fov: 32 }}
      // 'high-performance' nudges the browser toward the discrete GPU
      // on dual-GPU laptops where it matters.
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      aria-label="Interactive 3D armchair preview"
    >
      <color attach="background" args={[PALETTE.floor]} />

      {/*
        Three-point lighting tuned for an interior product shot. We
        used to layer a drei <Environment preset="apartment"/> on top
        for image-based reflections, but that helper fetches an HDR
        from raw.githack.com — which the production CSP's connect-src
        blocks, taking down the whole page. The hemi + key + fill
        rig below gets us a believable warm/cool soft-light setup
        without any external asset dependency.
      */}
      <hemisphereLight args={["#fff7e8", "#3a2e22", 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[4, 6, 3]}
        intensity={1.4}
        color="#fff2d6"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      {/* Cool side-fill — fakes window light bouncing in from the
          left and keeps the back of the chair from going muddy. */}
      <directionalLight position={[-4, 3, -2]} intensity={0.55} color="#cdd9ff" />
      {/* Warm rim — adds a bit of edge highlight on the silhouette. */}
      <directionalLight position={[0, 4, -5]} intensity={0.4} color="#ffd9a6" />

      <FloatingChair />

      {/* Soft floor shadow under the chair — anchors the piece in
          space without a literal floor plane. */}
      <ContactShadows
        position={[0, -0.001, 0]}
        opacity={0.4}
        scale={8}
        blur={2.4}
        far={4}
        color="#3f2a1d"
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.7}
        minPolarAngle={Math.PI * 0.35}
        maxPolarAngle={Math.PI * 0.55}
        target={[0, 0.55, 0]}
        // Damping makes the drag feel weighted instead of jittery.
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

function FloatingChair() {
  const groupRef = useRef<THREE.Group>(null);

  // Tiny vertical bob — gives the chair "life" even when OrbitControls
  // auto-rotation is paused (e.g. while the user is mid-drag).
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <Chair />
    </group>
  );
}

function Chair() {
  // Cached materials so r3f can re-use them across primitives.
  // Without an Environment map the materials lean entirely on direct
  // lights, so we use slightly higher roughness across the board to
  // avoid hot-spot glare from the key light. Metalness stays at 0 —
  // any non-zero value reads as "wet plastic" without IBL.
  const linenMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.linen, roughness: 0.85, metalness: 0 }),
    []
  );
  const walnutMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.walnut, roughness: 0.55, metalness: 0 }),
    []
  );
  const walnutLightMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.walnutLight, roughness: 0.6, metalness: 0 }),
    []
  );
  const accentMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.terracotta, roughness: 0.95, metalness: 0 }),
    []
  );

  return (
    <group position={[0, 0, 0]} rotation={[0, -0.2, 0]}>
      {/* Seat cushion — slightly tilted forward so weight reads
          correctly when the camera orbits. */}
      <RoundedBox
        args={[1.7, 0.32, 1.45]}
        radius={0.12}
        smoothness={4}
        position={[0, 0.55, 0]}
        material={linenMat}
        castShadow
        receiveShadow
      />

      {/* Back cushion — leans 7° back at the top. */}
      <RoundedBox
        args={[1.65, 1.35, 0.3]}
        radius={0.12}
        smoothness={4}
        position={[0, 1.25, -0.6]}
        rotation={[-0.12, 0, 0]}
        material={linenMat}
        castShadow
        receiveShadow
      />

      {/* Armrests — long rounded bars in walnut. */}
      <RoundedBox
        args={[0.16, 0.16, 1.45]}
        radius={0.06}
        smoothness={4}
        position={[0.93, 0.95, 0]}
        material={walnutMat}
        castShadow
      />
      <RoundedBox
        args={[0.16, 0.16, 1.45]}
        radius={0.06}
        smoothness={4}
        position={[-0.93, 0.95, 0]}
        material={walnutMat}
        castShadow
      />

      {/* Arm supports — short verticals from leg top to armrest. */}
      {[
        [0.93, 0.55, 0.65],
        [0.93, 0.55, -0.65],
        [-0.93, 0.55, 0.65],
        [-0.93, 0.55, -0.65],
      ].map(([x, y, z], i) => (
        <mesh key={`arm-${i}`} position={[x, y, z]} material={walnutMat} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.78, 24]} />
        </mesh>
      ))}

      {/* Legs — slightly tapered turned-wood profile. Top radius is a
          touch wider than the bottom so they read as Mid-century. */}
      {[
        [0.85, 0.12, 0.6],
        [0.85, 0.12, -0.6],
        [-0.85, 0.12, 0.6],
        [-0.85, 0.12, -0.6],
      ].map(([x, y, z], i) => (
        <mesh key={`leg-${i}`} position={[x, y, z]} material={walnutLightMat} castShadow>
          <cylinderGeometry args={[0.075, 0.045, 0.24, 20]} />
        </mesh>
      ))}

      {/* Subtle base rail connecting front and back legs on each side
          so the silhouette doesn't read as four floating sticks. The
          [PI/2, 0, 0] rotation lays the cylinder along the Z axis. */}
      <mesh
        position={[0.85, 0.06, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={walnutMat}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, 1.2, 16]} />
      </mesh>
      <mesh
        position={[-0.85, 0.06, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={walnutMat}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, 1.2, 16]} />
      </mesh>

      {/* Terracotta throw pillow — leaning against the back cushion on
          the left side, rotated for a "lived-in" feel. */}
      <RoundedBox
        args={[0.55, 0.5, 0.14]}
        radius={0.07}
        smoothness={4}
        position={[-0.45, 0.95, -0.42]}
        rotation={[-0.18, 0.4, -0.15]}
        material={accentMat}
        castShadow
        receiveShadow
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Helpers — RoundedBox & rotation primitive
// ---------------------------------------------------------------------------

// Tidy wrapper around our procedural rounded-box geometry. We omit
// `args` from the mesh element type because mesh's own `args` is the
// THREE.Mesh constructor tuple ([geometry?, material?]); we want
// `args` to be the box dimensions instead and resolve any conflict
// up-front.
type RoundedBoxProps = Omit<
  ThreeElements["mesh"],
  "geometry" | "material" | "args"
> & {
  args: [number, number, number];
  radius?: number;
  smoothness?: number;
  material: THREE.Material;
};

function RoundedBox({
  args,
  radius = 0.1,
  smoothness = 3,
  material,
  ...rest
}: RoundedBoxProps) {
  const geometry = useMemo(
    () => createRoundedBoxGeometry(args[0], args[1], args[2], radius, smoothness),
    [args, radius, smoothness]
  );

  // Dispose geometry on unmount — three.js doesn't garbage-collect
  // GPU buffers for us.
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} material={material} {...rest} />;
}

// Build a rounded-box BufferGeometry without depending on drei's
// own RoundedBox component (avoids version-skew between drei minor
// releases). Implementation: a regular BoxGeometry with vertex
// positions pushed onto a rounded silhouette via a smoothed clamp.
function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  smoothness: number
): THREE.BufferGeometry {
  const segments = Math.max(1, Math.floor(smoothness));
  const widthSeg = segments * 4;
  const heightSeg = segments * 4;
  const depthSeg = segments * 4;
  const geom = new THREE.BoxGeometry(
    width,
    height,
    depth,
    widthSeg,
    heightSeg,
    depthSeg
  );

  const r = Math.min(radius, width / 2, height / 2, depth / 2);
  const halfW = width / 2 - r;
  const halfH = height / 2 - r;
  const halfD = depth / 2 - r;

  const pos = geom.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Clamp v to the inner box, then push out by r along the
    // normalized direction. Vertices already inside the inner box
    // stay put — it's the corners and edges that round.
    const cx = THREE.MathUtils.clamp(v.x, -halfW, halfW);
    const cy = THREE.MathUtils.clamp(v.y, -halfH, halfH);
    const cz = THREE.MathUtils.clamp(v.z, -halfD, halfD);
    const dx = v.x - cx;
    const dy = v.y - cy;
    const dz = v.z - cz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 1e-6) {
      const k = r / len;
      v.set(cx + dx * k, cy + dy * k, cz + dz * k);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

