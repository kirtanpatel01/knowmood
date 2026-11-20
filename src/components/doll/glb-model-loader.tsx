import { Suspense } from 'react';
import { ProceduralDollMesh } from './procedural-doll-mesh';

interface GlbModelLoaderProps {
  mood: 'happy' | 'unhappy';
}

export function GlbModelLoader({ mood }: GlbModelLoaderProps) {
  // Gracefully render the high-fidelity procedural plush model
  // If user drops in /public/models/mood-doll.glb, it can be loaded with useGLTF
  return (
    <Suspense fallback={null}>
      <ProceduralDollMesh mood={mood} />
    </Suspense>
  );
}
