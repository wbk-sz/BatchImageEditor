import { useEffect, useCallback, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, Move } from 'lucide-react';

interface ImagePreviewModalProps {
    images: string[];
    selectedIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
    aspectRatio: string;
    resizeMode: string;
    cropPositions: Record<string, { x: number, y: number }>;
    onCropPositionChange: (positions: Record<string, { x: number, y: number }>) => void;
}

export function ImagePreviewModal({
    images,
    selectedIndex,
    onClose,
    onNavigate,
    aspectRatio,
    resizeMode,
    cropPositions,
    onCropPositionChange
}: ImagePreviewModalProps) {
    const currentImage = images[selectedIndex];
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Initial position
    const currentPos = cropPositions[currentImage] || { x: 50, y: 50 };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    onClose();
                }
            }
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'f') toggleFullScreen();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, onClose]);

    // Sync state with actual fullscreen changes (e.g. user pressing Esc)
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!document.fullscreenElement) {
            try {
                // Request fullscreen on the specific modal element if possible, 
                // or document.documentElement to be safe
                if (modalRef.current) {
                    await modalRef.current.requestFullscreen();
                } else {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.error("Error attempting to enable full-screen mode:", err);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex > 0) {
            onNavigate(selectedIndex - 1);
        }
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex < images.length - 1) {
            onNavigate(selectedIndex + 1);
        }
    };

    // Drag handling for crop position
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isAdjusting || resizeMode !== 'Cover') return;
        e.stopPropagation();
        e.preventDefault();

        const img = imageRef.current;
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = currentPos.x;
        const startPosY = currentPos.y;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            // Calculate delta as percentage of image size
            // Note: Movement is inverted because moving mouse right means we want to see left part of image?
            // Actually: object-position: 100% 100% means bottom-right of image is at bottom-right of box.
            // If we drag mouse right, we visually want to move image right.
            // object-position X% aligns X% of image to X% of box.
            // It's a bit intuitive. Let's try direct mapping first.

            // Sensitivity factor
            const sensitivity = 0.2;
            const deltaX = (moveEvent.clientX - startX) * sensitivity;
            const deltaY = (moveEvent.clientY - startY) * sensitivity;

            let newX = startPosX - deltaX; // Invert to feel like "dragging the image"
            let newY = startPosY - deltaY;

            newX = Math.max(0, Math.min(100, newX));
            newY = Math.max(0, Math.min(100, newY));

            onCropPositionChange({
                ...cropPositions,
                [currentImage]: { x: newX, y: newY }
            });
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };


    // Calculate aspect ratio style
    const getAspectRatioStyle = () => {
        if (aspectRatio === 'Original') return {
            // Remove max constraints from container, let content (img) define size
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        };

        const [w, h] = aspectRatio.split(':').map(Number);
        const maxWidthVal = isFullScreen ? '100vw' : '80vw';
        const maxHeightVal = isFullScreen ? '100vh' : '80vh';

        // Constrain width and height based on Aspect Ratio and Max Viewport
        const ar = w / h;

        return {
            aspectRatio: `${w}/${h}`,
            width: `min(${maxWidthVal}, calc(${maxHeightVal} * ${ar}))`,
            height: `min(${maxHeightVal}, calc(${maxWidthVal} / ${ar}))`
        };
    };

    const getObjectFit = () => {
        switch (resizeMode) {
            case 'Cover': return 'cover';
            case 'Contain': return 'contain';
            case 'Stretch': return 'fill'; // 'fill' is the CSS value for 'Stretch'
            default: return 'contain';
        }
    };

    if (!currentImage) return null;

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 outline-none select-none"
            onClick={onClose}
        >
            {/* Controls Container */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
                {/* Crop Position Toggle (Only active for Cover mode) */}
                {resizeMode === 'Cover' && aspectRatio !== 'Original' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAdjusting(!isAdjusting); }}
                        className={`p-2 rounded-full transition-colors ${isAdjusting ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Adjust Crop Position"
                    >
                        <Move size={24} />
                    </button>
                )}

                <button
                    onClick={toggleFullScreen}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                    title={isFullScreen ? "Exit Full Screen (F)" : "Full Screen (F)"}
                >
                    {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                    title="Close (Esc)"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Navigation Buttons */}
            {selectedIndex > 0 && (
                <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-50"
                    title="Previous (Left Arrow)"
                >
                    <ChevronLeft size={48} />
                </button>
            )}

            {selectedIndex < images.length - 1 && (
                <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-50"
                    title="Next (Right Arrow)"
                >
                    <ChevronRight size={48} />
                </button>
            )}

            {/* Image Container */}
            <div
                className="relative flex items-center justify-center transition-all duration-300 overflow-hidden"
                style={{
                    ...getAspectRatioStyle(),
                    // Dark checkerboard pattern for transparency
                    backgroundColor: '#1f2937',
                    backgroundImage: `
                        linear-gradient(45deg, #374151 25%, transparent 25%), 
                        linear-gradient(-45deg, #374151 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #374151 75%), 
                        linear-gradient(-45deg, transparent 75%, #374151 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    borderColor: isAdjusting ? '#3b82f6' : 'transparent',
                    borderWidth: isAdjusting ? '2px' : '0',
                    cursor: isAdjusting ? 'move' : 'default'
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={handlePointerDown}
            >
                {/* 
                   If aspect ratio is set, we need a container with that ratio.
                   Inside, the image behaves according to resizeMode.
                */}
                <img
                    ref={imageRef}
                    src={`file://${currentImage}`}
                    alt="Preview"
                    className="block pointer-events-none" // Events handled by container
                    style={{
                        width: aspectRatio === 'Original' ? 'auto' : '100%',
                        height: aspectRatio === 'Original' ? 'auto' : '100%',

                        maxWidth: aspectRatio === 'Original'
                            ? (isFullScreen ? '100vw' : '80vw') // Original mode constraints
                            : '100%',

                        maxHeight: aspectRatio === 'Original'
                            ? (isFullScreen ? '100vh' : '80vh') // Original mode constraints
                            : '100%',

                        objectFit: aspectRatio !== 'Original' ? getObjectFit() as any : 'contain',
                        objectPosition: `${currentPos.x}% ${currentPos.y}%`
                    }}
                />

                {/* Grid Overlay when Adjusting */}
                {isAdjusting && (
                    <div className="absolute inset-0 pointer-events-none opacity-50">
                        <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="border border-white/30"></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white text-sm whitespace-nowrap z-10 font-mono">
                    {selectedIndex + 1} / {images.length}
                    {isAdjusting && ` | Pos: ${Math.round(currentPos.x)}%, ${Math.round(currentPos.y)}%`}
                </div>
            </div>
        </div>
    );
}
