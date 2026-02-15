import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableImage } from './SortableImage';

interface ImageGridProps {
    images: string[];
    onImagesChange: (newImages: string[]) => void;
    onRemoveImage: (path: string) => void;
    onImageClick: (index: number) => void;
}

export function ImageGrid({ images, onImagesChange, onRemoveImage, onImageClick }: ImageGridProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = images.indexOf(active.id as string);
            const newIndex = images.indexOf(over.id as string);
            onImagesChange(arrayMove(images, oldIndex, newIndex));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={images}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
                    {images.map((path, index) => (
                        <SortableImage
                            key={path}
                            id={path}
                            path={path}
                            onRemove={onRemoveImage}
                            onClick={() => onImageClick(index)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
