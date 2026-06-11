import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, PresentationControls } from '@react-three/drei';

function Model(props) {
    // Load the 3D model
    const { scene } = useGLTF('/models/iphone_17_pro_max.glb');
    const modelRef = useRef();

    // Auto-rotate the model smoothly on every frame
    useFrame((state, delta) => {
        if (modelRef.current) {
            modelRef.current.rotation.y += delta * 0.4; // Speed of rotation
        }
    });

    return <primitive object={scene} ref={modelRef} {...props} />;
}

export default function PhoneModel() {
    return (
        <div className="w-full h-full min-h-[400px] sm:min-h-[500px]">
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                {/* 
                    Allows users to grab and rotate the model smoothly.
                    global=true prevents rotation clipping.
                    polar restricts up/down rotation so they mostly see it frontally.
                    azimuth restricts left/right rotation.
                */}
                <PresentationControls
                    global
                    rotation={[0.1, -0.2, 0]}
                    polar={[-0.2, 0.2]}
                    azimuth={[-Math.PI / 4, Math.PI / 4]}
                    config={{ mass: 2, tension: 400 }}
                    snap={{ mass: 4, tension: 400 }}
                >
                    <Suspense fallback={null}>
                        {/* The model positioned perfectly and rotated to face the user */}
                        <Model position={[0, 0, 0]} scale={[1.2, 1.2, 1.2]} rotation={[0, Math.PI / 2, 0]} />

                        {/* Lighting and Reflections suited for dark themes */}
                        <Environment preset="city" />
                        <ambientLight intensity={0.5} />
                        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

                        {/* Highly realistic contact shadows */}
                        <ContactShadows position={[0, -0.8, 0]} opacity={0.7} scale={10} blur={2.5} far={4} />
                    </Suspense>
                </PresentationControls>
            </Canvas>
        </div>
    );
}

// Preload the model so there is no delay when the component mounts
useGLTF.preload('/models/iphone_17_pro_max.glb');
