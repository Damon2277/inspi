'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef, useMemo } from 'react';

interface VirtualCardGridProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  columns?: number;
  gap?: number;
  overscan?: number;
}

export function VirtualCardGrid({
  items,
  renderItem,
  columns = 3,
  gap = 20,
  overscan = 3,
}: VirtualCardGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 将一维数组转换为行数据
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // 估算每行高度
    overscan,
  });

  return (
    <div
      ref={parentRef}
      style={{
        height: '100%',
        overflow: 'auto',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                height: '100%',
              }}
            >
              {rows[virtualRow.index].map((item, colIndex) => {
                const globalIndex = virtualRow.index * columns + colIndex;
                return (
                  <div key={item.id || globalIndex}>
                    {renderItem(item, globalIndex)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
