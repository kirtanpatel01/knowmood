import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ProceduralDollMesh } from './procedural-doll-mesh';
import { motion } from 'motion/react';
import { RotateCcw, RotateCw, Compass } from 'lucide-react';

interface MoodDollProps {
  mood: 'happy' | 'unhappy';
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  showRotateButtons?: boolean;
  onClick?: () => void;
}

export function MoodDoll({
  mood,
  interactive = true,
  size = 'lg',
  className = '',
  showRotateButtons = true,
  onClick,
}: MoodDollProps) {
  // Direct rotation state with smooth spring interpolation
  const [targetRotationY, setTargetRotationY] = useState(0);
  const [currentRotationY, setCurrentRotationY] = useState(0);

  // Drag tracking refs
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startRotation = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth lerp frame loop for silky rotation animation
  useEffect(() => {
    const animate = () => {
      setCurrentRotationY((prev) => {
        const diff = targetRotationY - prev;
        if (Math.abs(diff) < 0.0005) return targetRotationY;
        return prev + diff * 0.14; // Buttery smooth spring-like lerp
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [targetRotationY]);

  // Window-level pointer listeners for 100% reliable drag tracking (desktop mouse + mobile touch)
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !interactive) return;
      const deltaX = e.clientX - startX.current;
      const sensitivity = 0.0085;
      setTargetRotationY(startRotation.current + deltaX * sensitivity);
    };

    const handleWindowPointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [interactive]);

  // Pointer down handler on the doll container
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    isDragging.current = true;
    startX.current = e.clientX;
    startRotation.current = targetRotationY;
  }, [interactive, targetRotationY]);

  // Button rotation helpers with smooth motion
  const rotateBy = (angle: number) => {
    setTargetRotationY((prev) => prev + angle);
  };

  const resetRotation = () => {
    setTargetRotationY(0);
  };

  // Spacious dimensions so the 3D plush never touches the edges or gets square-cropped
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-full max-w-[280px] h-[270px] sm:max-w-[320px] sm:h-[300px]',
    lg: 'w-full max-w-[340px] h-[330px] sm:max-w-[380px] sm:h-[360px]',
    full: 'w-full h-full min-h-[350px]',
  }[size];

  // Camera distance tuned so the plush tentacles and ground shadow have generous margin
  const cameraZ = size === 'sm' ? 4.9 : 5.0;

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Canvas Box (No square crop, unclipped viewport) */}
      <div
        onClick={onClick}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
        className={`relative overflow-visible cursor-grab active:cursor-grabbing flex items-center justify-center ${sizeClasses}`}
      >
        <Canvas
          camera={{ position: [0, 0.42, cameraZ], fov: 38 }}
          shadows
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', overflow: 'visible', touchAction: 'none' }}
        >
          {/* Soft Studio Lighting */}
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[3, 5, 4]}
            intensity={1.25}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-3, -1, -2]} intensity={0.4} color="#FFF0F4" />

          <Suspense fallback={null}>
            <ProceduralDollMesh mood={mood} rotationY={currentRotationY} />

            {/* Soft ground contact shadow - smoothly fades out with ample breathing room */}
            <ContactShadows
              position={[0, -0.45, 0]}
              opacity={0.3}
              scale={3.2}
              blur={2.4}
              far={1.8}
              color={mood === 'happy' ? '#D65377' : '#2272A8'}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Smooth Motion Rotate Buttons */}
      {interactive && showRotateButtons && size !== 'sm' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 mt-2 pointer-events-auto"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={() => rotateBy(-Math.PI / 4)}
            aria-label="Rotate doll left"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm hover:shadow transition-colors"
          >
            <RotateCcw className="w-4 h-4 stroke-[2]" />
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetRotation}
            aria-label="Reset doll rotation"
            className="px-3 h-8 rounded-full bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md border border-[var(--border-soft)] text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 opacity-70" />
            <span>Rotate / Drag</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={() => rotateBy(Math.PI / 4)}
            aria-label="Rotate doll right"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm hover:shadow transition-colors"
          >
            <RotateCw className="w-4 h-4 stroke-[2]" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
