import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, type ReactNode } from 'react';
import { gridClass, ShowLink, type ShowGridProps } from './show-grid';

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-manipulation select-none [-webkit-touch-callout:none] ${
        isDragging ? 'z-10 scale-105 opacity-90' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      {children}
    </li>
  );
}

/** Show grid/list reorderable with mouse, long-press touch or keyboard. */
export function SortableShowGrid({
  shows,
  layout,
  badges,
  latest,
  onReorder,
}: ShowGridProps & { onReorder: (ids: string[]) => void }) {
  const justDragged = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Long-press on touch so normal scrolling and taps keep working.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = shows.map((s) => s.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    // The click that follows a drop must not open the podcast.
    setTimeout(() => (justDragged.current = false), 0);
    if (!over || active.id === over.id) return;
    onReorder(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => (justDragged.current = true)}
      onDragEnd={onDragEnd}
      onDragCancel={() => (justDragged.current = false)}
    >
      <SortableContext
        items={ids}
        strategy={
          layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy
        }
      >
        <ul className={gridClass(layout)}>
          {shows.map((show) => (
            <SortableItem key={show.id} id={show.id}>
              <ShowLink
                show={show}
                layout={layout}
                badge={badges.get(show.id)}
                latest={latest.get(show.id)?.items.find(Boolean)}
                suppressClick={() => justDragged.current}
              />
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export default SortableShowGrid;
