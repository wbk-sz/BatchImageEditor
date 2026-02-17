import { useState, useEffect } from 'react'
import { DropZone } from './components/DropZone'
import { ImageGrid } from './components/ImageGrid'
// lucide-react icons
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { ImagePreviewModal } from './components/ImagePreviewModal'

function App() {
    const [backendStatus, setBackendStatus] = useState('Checking connection...')
    const [images, setImages] = useState<string[]>([])
    const [targetFormat, setTargetFormat] = useState('PNG')
    const [resizeWidth, setResizeWidth] = useState<number | ''>('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [processResult, setProcessResult] = useState<string | null>(null)
    const [outputDir, setOutputDir] = useState<string | null>(null)
    const [aspectRatio, setAspectRatio] = useState('Original')
    const [resizeMode, setResizeMode] = useState<'Original' | 'Cover' | 'Contain' | 'Stretch'>('Original')
    const [previewIndex, setPreviewIndex] = useState<number | null>(null)
    const [cropPositions, setCropPositions] = useState<Record<string, { x: number, y: number }>>({})
    const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null)
    // New state for loading overlay when adding files
    const [isAddingFiles, setIsAddingFiles] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const initBackend = async (retryCount = 0) => {
            if (!isMounted) return;

            if (retryCount > 0) {
                setBackendStatus(`Retrying connection (${retryCount}/10)...`);
            } else {
                setBackendStatus('Checking connection...');
            }

            // 1. Get port from main process
            try {
                // We re-fetch port every time, in case backend changed ports
                const port = await window.electron.getApiPort();

                if (isMounted && port) {
                    const url = `http://127.0.0.1:${port}`;
                    setApiBaseUrl(url);

                    // 2. Check health
                    try {
                        const res = await fetch(`${url}/health`);
                        if (res.ok) {
                            if (isMounted) setBackendStatus(`Available (Port: ${port})`);
                            return; // Success!
                        } else {
                            throw new Error('Health check failed');
                        }
                    } catch (e) {
                        console.warn(`Health check failed on port ${port}:`, e);
                        // Retry path
                    }
                } else {
                    console.warn('Failed to get port from main process.');
                }
            } catch (e) {
                console.error("Failed to get backend port", e);
            }

            // Failure / Retry logic
            if (isMounted) {
                if (retryCount < 10) {
                    setTimeout(() => initBackend(retryCount + 1), 2000);
                } else {
                    setBackendStatus('Connection failed. Please restart app.');
                }
            }
        };

        initBackend();

        return () => { isMounted = false; };
    }, []);

    const handleSelectImages = async () => {
        setIsAddingFiles(true);
        try {
            const selectedImages = await window.electron.selectImages()
            if (selectedImages.length === 0) return;

            console.log('Selected images:', selectedImages);
            const newPaths: string[] = [];
            const pdfPathsToProcess: string[] = [];

            // Filter out PDFs for special processing
            for (const filePath of selectedImages) {
                if (filePath.toLowerCase().endsWith('.pdf')) {
                    pdfPathsToProcess.push(filePath);
                } else {
                    newPaths.push(filePath);
                }
            }

            // Add normal images immediately
            if (newPaths.length > 0) {
                setImages(prev => Array.from(new Set([...prev, ...newPaths])));
            }

            // Process PDFs
            if (pdfPathsToProcess.length > 0) {
                if (!apiBaseUrl) {
                    console.error("Backend not connected, cannot process PDF");
                    // Fallback: just add the PDF path (will show error icon or just generic file)
                    setImages(prev => Array.from(new Set([...prev, ...pdfPathsToProcess])));
                    setProcessResult('Warning: Backend not connected. PDF thumbnails may not generate.');
                    return;
                }

                for (const pdfPath of pdfPathsToProcess) {
                    try {
                        const response = await fetch(`${apiBaseUrl}/extract-pdf-pages`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pdf_path: pdfPath })
                        });

                        const data = await response.json();
                        if (response.ok && data.images) {
                            console.log('Extracted PDF pages (select):', data.images);
                            setImages(prev => Array.from(new Set([...prev, ...data.images])));
                        } else {
                            console.error('Failed to extract PDF pages:', data.error);
                            // Fallback to original path
                            setImages(prev => Array.from(new Set([...prev, pdfPath])));
                        }
                    } catch (e) {
                        console.error('Error calling extract-pdf-pages:', e);
                        setImages(prev => Array.from(new Set([...prev, pdfPath])));
                    }
                }
            }
        } finally {
            setIsAddingFiles(false);
        }
    }

    const handleDrop = async (acceptedFiles: File[], event?: any) => {
        console.log('Dropped files (processed):', acceptedFiles);
        try {
            const newPaths: string[] = [];

            // 1. Try to use the raw event files if available (most reliable for 'path' in Electron Renderer)
            let filesToProcess: File[] | FileList = acceptedFiles;
            if (event && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                console.log('Using raw event.dataTransfer.files', event.dataTransfer.files);
                filesToProcess = event.dataTransfer.files;
            }

            // Iterate and extract paths
            const fileList = Array.isArray(filesToProcess) ? filesToProcess : Array.from(filesToProcess);

            for (const file of fileList) {
                // Check if file is PDF
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    console.log('Detected PDF file:', file.name);
                    let pdfPath = (file as any).path;

                    if (!pdfPath && window.electron) {
                        try {
                            pdfPath = window.electron.getPathForFile(file);
                        } catch (e) {
                            console.error('Failed to get PDF path via bridge:', e);
                        }
                    }

                    if (pdfPath && apiBaseUrl) {
                        // Call backend to extract pages
                        try {
                            const response = await fetch(`${apiBaseUrl}/extract-pdf-pages`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pdf_path: pdfPath })
                            });

                            const data = await response.json();
                            if (response.ok && data.images) {
                                console.log('Extracted PDF pages:', data.images);
                                newPaths.push(...data.images);
                            } else {
                                console.error('Failed to extract PDF pages:', data.error);
                            }
                        } catch (e) {
                            console.error('Error calling extract-pdf-pages:', e);
                        }
                    } else {
                        console.error('Could not resolve path for PDF:', file.name);
                    }
                    continue; // Skip normal image processing for this file
                }

                // Normal image file processing
                let filePath = (file as any).path;

                if (!filePath) {
                    console.warn(`File ${file.name} is missing 'path' property on the object. Trying direct webUtils...`);
                    try {
                        // @ts-ignore
                        if (window.require) {
                            // @ts-ignore
                            const electron = window.require('electron');
                            if (electron.webUtils) {
                                const pathDirect = electron.webUtils.getPathForFile(file);
                                console.log('Path from direct webUtils:', pathDirect);
                                if (pathDirect) filePath = pathDirect;
                            }
                        }
                    } catch (e) {
                        console.error('Direct webUtils failed:', e);
                    }

                    if (!filePath) {
                        // Fallback to preload bridge if direct failed
                        try {
                            const pathFromUtils = window.electron.getPathForFile(file);
                            console.log('Path from preload webUtils:', pathFromUtils);
                            if (pathFromUtils) {
                                filePath = pathFromUtils;
                            }
                        } catch (e) {
                            console.error('Failed to get path via webUtils:', e);
                        }
                    }
                }

                if (filePath) {
                    console.log('Resolved path:', filePath);
                    newPaths.push(filePath);
                } else {
                    console.error(`Could not resolve path for file: ${file.name}`);
                }
            }

            if (newPaths.length > 0) {
                setImages(prev => Array.from(new Set([...prev, ...newPaths])));
                setProcessResult(null);
            } else {
                setProcessResult('Error: Could not resolve file paths or process PDF.');
            }
        } catch (e) {
            console.error("Failed to process dropped files", e);
            setProcessResult('Error: Internal error processing files.');
        }
    }

    const handleSelectOutputDir = async () => {
        const dir = await window.electron.selectDirectory()
        if (dir) {
            setOutputDir(dir)
        }
    }

    const handleRemoveImage = (path: string) => {
        setImages(prev => prev.filter(p => p !== path));
        // Also remove crop position if exists
        setCropPositions(prev => {
            const next = { ...prev };
            delete next[path];
            return next;
        });
    }

    // Define payload interface
    interface ProcessPayload {
        images: string[];
        output_dir: string | null;
        output_format: string;
        aspect_ratio: string;
        resize_mode: 'Original' | 'Cover' | 'Contain' | 'Stretch';
        crop_positions: Record<string, { x: number, y: number }>;
        resize?: number;
        overwrite?: boolean;
    }

    const handleProcess = async (overwrite = false) => {
        if (images.length === 0) return
        setIsProcessing(true)
        setProcessResult(null)

        try {
            const payload: ProcessPayload = {
                images: images,
                output_dir: outputDir,
                output_format: targetFormat,
                aspect_ratio: aspectRatio,
                resize_mode: resizeMode,
                crop_positions: cropPositions,
                overwrite: overwrite
            };

            if (resizeWidth !== '') {
                payload.resize = parseInt(String(resizeWidth), 10)
            }

            // Determine endpoint based on format
            let endpoint = '/process';
            if (targetFormat === 'PDF') endpoint = '/convert-pdf';
            if (targetFormat === 'PPTX') endpoint = '/convert-pptx';

            if (!apiBaseUrl) {
                setProcessResult('Error: Backend not connected');
                setIsProcessing(false);
                return;
            }

            const response = await fetch(`${apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            // Check for conflict (overwrite confirmation needed)
            if (response.status === 409 && data.status === 'conflict') {
                const confirmMessage = `The following files already exist:\n\n${data.existing_files.slice(0, 5).join('\n')}${data.existing_files.length > 5 ? '\n...' : ''}\n\nDo you want to overwrite them?`
                if (window.confirm(confirmMessage)) {
                    // Retry with overwrite=true
                    await handleProcess(true)
                    return // Exit current execution, new one started
                } else {
                    setProcessResult('Cancelled: File overwrite denied.')
                    setIsProcessing(false)
                    return
                }
            }

            if (response.ok) {
                if (targetFormat === 'PDF' || targetFormat === 'PPTX') {
                    // Document conversion result
                    setProcessResult(`Success: Created ${targetFormat} at \n${data.processed}`)
                } else {
                    // Image batch processing result
                    const errors = data.results.filter((r: any) => r.status === 'error')
                    if (errors.length > 0) {
                        console.error('Processing errors:', errors)
                        setProcessResult(`Partial Success: ${data.results.length - errors.length} done, ${errors.length} failed. \nLast Error: ${errors[errors.length - 1].error}`)
                    } else {
                        setProcessResult(`Success: Processed ${data.results.length} images`)
                    }
                }
            } else {
                setProcessResult(`Error: ${data.error || 'Unknown error'}`)
            }
        } catch (error) {
            setProcessResult('Error: Failed to connect to backend')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden relative">
            {/* Global Loading Overlay */}
            {isAddingFiles && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 border border-gray-700">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                        <p className="text-lg font-medium text-blue-400">Processing files...</p>
                        <p className="text-sm text-gray-400">Extracting pages from PDF/PPTX</p>
                    </div>
                </div>
            )}

            <header className="px-6 py-4 bg-gray-800 shadow-md flex justify-between items-center z-10 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                        Batch Image Editor
                    </h1>

                    {/* Persistent Action Buttons */}
                    <div className="flex items-center gap-2 ml-8">
                        <button
                            onClick={handleSelectImages}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <ImageIcon size={18} />
                            Add Images
                        </button>
                        {images.length > 0 && (
                            <button
                                onClick={() => setImages([])}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-red-900/30 text-gray-300 hover:text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Trash2 size={18} />
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                        <label className="block text-sm font-medium text-gray-400">Output Location</label>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSelectOutputDir}
                                    className="flex bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded transition-colors border border-gray-600"
                                >
                                    Select Folder...
                                </button>
                                {outputDir && (
                                    <button
                                        onClick={() => setOutputDir(null)}
                                        className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 p-2 rounded border border-gray-700 transition-colors"
                                        title="Reset to original"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <div className="text-xs text-gray-500 break-all bg-gray-900 p-2 rounded border border-gray-700">
                                    {outputDir || 'Same as original file'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-xs font-mono text-gray-500">
                    <div className="flex items-center gap-2">
                        {/* Status Checker Fixed: using toLowerCase() to match 'available' */}
                        <div className={`w-2 h-2 rounded-full ${backendStatus.toLowerCase().includes('available') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {backendStatus}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex">
                {/* Left Side: Image Grid / Drop Zone */}
                <div className="flex-1 relative bg-gray-900/50 p-4 overflow-hidden flex flex-col">
                    {images.length === 0 ? (
                        <DropZone onDrop={handleDrop} />
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                    Queue ({images.length})
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 rounded-xl border border-gray-800 bg-gray-900/30">
                                <ImageGrid
                                    images={images}
                                    onImagesChange={setImages}
                                    onRemoveImage={handleRemoveImage}
                                    onImageClick={setPreviewIndex}
                                />
                                {/* Drop zone area at the bottom for adding more files easily */}
                                <div className="p-4 border-t border-gray-800/50">
                                    <div className="h-32">
                                        <DropZone onDrop={handleDrop} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Settings Panel */}
                <div className="w-48 bg-gray-800 border-l border-gray-700 flex flex-col shadow-xl z-20">
                    <div className="p-6 flex-1 overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <span>Settings</span>
                            <div className="h-px flex-1 bg-gray-700"></div>
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400">Target Format</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['PNG', 'JPEG', 'PDF', 'PPTX'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setTargetFormat(fmt)}
                                            className={`
                                                py-2 rounded text-sm font-medium transition-colors
                                                ${targetFormat === fmt
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }
                                            `}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400">Aspect Ratio</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Original', '16:9', '4:3', '1:1'].map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio)}
                                            className={`
                                                py-2 rounded text-sm font-medium transition-colors
                                                ${aspectRatio === ratio
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }
                                            `}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resize Mode */}
                            {aspectRatio !== 'Original' && (
                                <div className="space-y-2 animate-fadeIn">
                                    <label className="block text-sm font-medium text-gray-400">Resize Mode</label>
                                    <select
                                        value={resizeMode}
                                        onChange={(e) => setResizeMode(e.target.value as 'Original' | 'Cover' | 'Contain' | 'Stretch')}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white"
                                    >
                                        <option value="Contain">Contain (Fit)</option>
                                        <option value="Cover">Cover (Crop)</option>
                                        <option value="Stretch">Stretch</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {resizeMode === 'Contain' && 'Fit image inside, add black bars'}
                                        {resizeMode === 'Cover' && 'Fill area, crop excess'}
                                        {resizeMode === 'Stretch' && 'Force fit, distort image'}
                                    </p>
                                </div>
                            )}


                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400">Resize Width</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={resizeWidth}
                                        onChange={(e) => setResizeWidth(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        placeholder="Original Size"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600 text-white"
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">px</span>
                                </div>
                                <p className="text-xs text-gray-500">Leave empty to keep original dimensions</p>
                            </div>



                        </div>
                    </div>

                    <div className="p-6 bg-gray-800 border-t border-gray-700">
                        {processResult && (
                            <div className={`mb-4 p-3 rounded-lg text-sm border ${processResult.startsWith('Success')
                                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                : 'bg-red-500/10 border-red-500/30 text-red-300'
                                }`}>
                                <p className="whitespace-pre-wrap font-medium">{processResult}</p>
                            </div>
                        )}

                        <button
                            onClick={() => handleProcess(false)}
                            disabled={isProcessing || images.length === 0}
                            className={`w-full py-3.5 rounded-lg font-bold shadow-lg transition-all transform active:scale-95 ${isProcessing || images.length === 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/30'
                                }`}
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Start Batch Process'
                            )}
                        </button>
                    </div>
                </div>
            </main >

            {/* Preview Modal */}
            {
                previewIndex !== null && (
                    <ImagePreviewModal
                        images={images}
                        selectedIndex={previewIndex}
                        onClose={() => setPreviewIndex(null)}
                        onNavigate={setPreviewIndex}
                        aspectRatio={aspectRatio}
                        resizeMode={resizeMode}
                        cropPositions={cropPositions}
                        onCropPositionChange={setCropPositions}
                    />
                )
            }
        </div >
    )
}

export default App
