import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SortableImageProps {
    id: string;
    path: string;
    onRemove: (path: string) => void;
    onClick?: () => void;
}

export function SortableImage({ id, path, onRemove, onClick }: SortableImageProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors"
            onClick={onClick}
        >
            <img
                src={`file://${path}`}
                alt="Thumbnail"
                className="w-full h-full object-cover pointer-events-none"
            />
            <button
                // Prevent drag/sort start when clicking remove
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(path);
                }}
                className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Remove"
            >
                <X size={14} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-70 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity text-white">
                {path.split(/[\\/]/).pop()}
            </div>
        </div>
    );
}
