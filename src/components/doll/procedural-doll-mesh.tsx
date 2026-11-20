import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralDollMeshProps {
  mood: 'happy' | 'unhappy';
  rotationY?: number;
}

// Generate high-resolution canvas texture for the plush embroidered face
function createFaceTexture(isHappy: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 1024, 1024);

  const leftEyeX = 345;
  const rightEyeX = 679;
  const eyeY = 470;

  if (isHappy) {
    // --- Happy Face: Large Oval Embroidered Eyes with Dual Highlights + Smile ---
    const drawHappyEye = (x: number) => {
      ctx.save();
      ctx.fillStyle = '#100F12';
      ctx.beginPath();
      ctx.ellipse(x, eyeY, 84, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dual white specular highlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(x - 24, eyeY - 28, 28, 34, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + 26, eyeY + 34, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawHappyEye(leftEyeX);
    drawHappyEye(rightEyeX);

    // Sweet embroidered curved smile
    ctx.strokeStyle = '#100F12';
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(512, 535, 62, 0.22 * Math.PI, 0.78 * Math.PI, false);
    ctx.stroke();
  } else {
    // --- Unhappy / Angry Grumpy Face (Exact match to reference photo!) ---
    // Grumpy flat-topped angled eyes with white circle catchlight
    const drawUnhappyEye = (x: number, isLeft: boolean) => {
      ctx.save();
      ctx.fillStyle = '#100F12';

      // Angle eyes slightly inward (furrowed brow / grumpy angry expression)
      const tilt = isLeft ? 0.14 : -0.14;
      ctx.translate(x, eyeY);
      ctx.rotate(tilt);

      // Flat-topped hooded eye patch matching the reference plushie
      ctx.beginPath();
      ctx.arc(0, 16, 78, Math.PI, 0, true); // rounded lower half
      ctx.rect(-78, -38, 156, 54); // upper flat-topped scowl block
      ctx.fill();

      // Single crisp white circular highlight in the upper-inner area
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      const dotX = isLeft ? 26 : -26;
      const dotY = -4;
      ctx.arc(dotX, dotY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawUnhappyEye(leftEyeX, true);
    drawUnhappyEye(rightEyeX, false);

    // Thick embroidered arched downward frown (∩ shape, clean and distinct, NO nostrils!)
    ctx.strokeStyle = '#100F12';
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Arched curve: starts lower-left, arches up in center, goes to lower-right
    ctx.moveTo(512 - 58, 655);
    ctx.quadraticCurveTo(512, 590, 512 + 58, 655);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function ProceduralDollMesh({ mood, rotationY = 0 }: ProceduralDollMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const upperTentacleMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lowerTentacleMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const happyDecalRef = useRef<THREE.MeshBasicMaterial>(null);
  const unhappyDecalRef = useRef<THREE.MeshBasicMaterial>(null);

  const flipProgress = useRef(mood === 'happy' ? 0 : 1);
  const targetProgress = useRef(mood === 'happy' ? 0 : 1);

  useEffect(() => {
    targetProgress.current = mood === 'happy' ? 0 : 1;
  }, [mood]);

  const happyTexture = useMemo(() => createFaceTexture(true), []);
  const unhappyTexture = useMemo(() => createFaceTexture(false), []);

  const pinkColor = useMemo(() => new THREE.Color('#FF608C'), []);
  const blueColor = useMemo(() => new THREE.Color('#329BD8'), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth spring interpolation for mood flip
    const diff = targetProgress.current - flipProgress.current;
    flipProgress.current += diff * Math.min(delta * 9, 0.4);
    const t = flipProgress.current;

    // Color interpolation
    if (headMaterialRef.current) {
      headMaterialRef.current.color.lerpColors(pinkColor, blueColor, t);
    }
    if (upperTentacleMaterialRef.current) {
      upperTentacleMaterialRef.current.color.lerpColors(pinkColor, blueColor, t);
    }
    if (lowerTentacleMaterialRef.current) {
      // Reversible underside shows the opposite color
      lowerTentacleMaterialRef.current.color.lerpColors(blueColor, pinkColor, t);
    }

    // Cross-fade decals
    if (happyDecalRef.current) {
      happyDecalRef.current.opacity = Math.max(0, 1 - t * 2.2);
    }
    if (unhappyDecalRef.current) {
      unhappyDecalRef.current.opacity = Math.max(0, (t - 0.5) * 2.2);
    }

    // Physical plush flip (squish, stretch, and 180° flip inversion)
    const flipArc = Math.sin(t * Math.PI);
    groupRef.current.rotation.x = flipArc * 0.4;
    groupRef.current.scale.set(
      1 + flipArc * 0.15,
      1 - flipArc * 0.25,
      1 + flipArc * 0.15
    );

    // Idle floating bob
    groupRef.current.position.y = -0.05 + Math.sin(state.clock.getElapsedTime() * 1.8) * 0.04;
  });

  // 8 Chubby rounded tentacles radiating around the base
  const tentacles = useMemo(() => {
    const list = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      list.push({ angle, index: i });
    }
    return list;
  }, []);

  return (
    <group ref={groupRef} dispose={null} rotation={[0, rotationY, 0]}>
      {/* ==================== SINGLE PLUSH HEAD DOME ==================== */}
      <group position={[0, 0.45, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.15, 48, 48]} />
          <meshStandardMaterial
            ref={headMaterialRef}
            color={pinkColor}
            roughness={0.82}
            metalness={0.02}
          />
        </mesh>

        {/* Happy Face Decal */}
        <mesh position={[0, 0.06, 1.155]} rotation={[-0.03, 0, 0]} renderOrder={1}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial
            ref={happyDecalRef}
            map={happyTexture}
            transparent
            opacity={1}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>

        {/* Unhappy Face Decal */}
        <mesh position={[0, 0.06, 1.155]} rotation={[-0.03, 0, 0]} renderOrder={2}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial
            ref={unhappyDecalRef}
            map={unhappyTexture}
            transparent
            opacity={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      </group>

      {/* ==================== 8 CHUBBY SPREAD TENTACLES ==================== */}
      {tentacles.map((t) => {
        const radius = 0.88;
        const x = Math.sin(t.angle) * radius;
        const z = Math.cos(t.angle) * radius;

        return (
          <group
            key={t.index}
            position={[x, -0.22, z]}
            rotation={[0, t.angle, 0]}
          >
            {/* Upper Tentacle Flap */}
            <mesh position={[0, 0.06, 0.52]} rotation={[-0.14, 0, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.46, 0.16, 24]} />
              <meshStandardMaterial
                ref={upperTentacleMaterialRef}
                color={pinkColor}
                roughness={0.8}
              />
            </mesh>

            {/* Lower Reversible Flap (Interior color peeking out) */}
            <mesh position={[0, -0.04, 0.52]} rotation={[0.14, 0, 0]} receiveShadow>
              <cylinderGeometry args={[0.46, 0.36, 0.16, 24]} />
              <meshStandardMaterial
                ref={lowerTentacleMaterialRef}
                color={blueColor}
                roughness={0.8}
              />
            </mesh>

            {/* Soft Rounded Plush Tip */}
            <mesh position={[0, 0.01, 0.85]} scale={[0.44, 0.16, 0.35]}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshStandardMaterial
                ref={upperTentacleMaterialRef}
                color={pinkColor}
                roughness={0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
