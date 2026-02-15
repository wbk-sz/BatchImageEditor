import { useRef, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
    onDrop: (files: File[], event?: any) => void;
}

export function DropZone({ onDrop }: DropZoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if verify if we are really leaving the dropzone or just entering a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            // Pass the native event as the second argument
            onDrop(files, e);
        }
    }, [onDrop]);

    const handleClick = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            onDrop(files);
        }
        // Reset value so same file can be selected again
        e.target.value = '';
    }, [onDrop]);

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`
                h-full w-full flex flex-col items-center justify-center 
                border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
                ${isDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                }
            `}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.pptx,.bmp,.tiff,.tif,.svg,.ico"
                className="hidden"
                onChange={handleInputChange}
            />
            <div className="bg-gray-700/50 p-4 rounded-full mb-4 pointer-events-none">
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-400' : 'text-gray-400'}`} />
            </div>
            <p className="text-xl font-medium text-gray-300 mb-2 pointer-events-none">
                {isDragActive ? 'Drop files here' : 'Drag & Drop images or PDFs here'}
            </p>
            <p className="text-sm text-gray-500 mb-6 pointer-events-none">
                or click "Select Images" button
            </p>
        </div>
    );
}
