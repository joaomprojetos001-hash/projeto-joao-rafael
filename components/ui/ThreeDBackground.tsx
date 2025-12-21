'use client'

import Spline from '@splinetool/react-spline'
import { useState } from 'react'

interface ThreeDBackgroundProps {
    sceneUrl?: string
    fallbackColor?: string
}

export default function ThreeDBackground({
    sceneUrl = 'https://prod.spline.design/0z2ywXGrSq4YeRc1/scene.splinecode', // Using the one from history as default/placeholder
    fallbackColor = '#050505'
}: ThreeDBackgroundProps) {
    const [isLoading, setIsLoading] = useState(true)

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                backgroundColor: fallbackColor,
                overflow: 'hidden',
                pointerEvents: 'none' // Ensure clicks go through to content
            }}
        >
            {/* Ambient Gold Glows (CSS Backup) */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(60px)',
                zIndex: 0
            }} />

            <div style={{
                position: 'absolute',
                bottom: '-10%',
                left: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(60px)',
                zIndex: 0
            }} />

            {/* Spline Scene */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: isLoading ? 0 : 1, // Fade in when ready
                transition: 'opacity 1s ease-in-out',
                // If you want interactive 3D, remove pointerEvents: none from parent or add pointerEvents: auto here
            }}>
                <Spline
                    scene={sceneUrl}
                    onLoad={() => setIsLoading(false)}
                />
            </div>

        </div>
    )
}
