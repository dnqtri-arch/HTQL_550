import { useState, useRef, useCallback } from 'react'

export interface DraggablePosition {
  x: number
  y: number
}

export interface UseDraggableResult {
  containerRef: React.RefObject<HTMLDivElement>
  /** Style áp vào container (popup box): override position khi đang kéo */
  containerStyle: React.CSSProperties
  /** Props áp vào thanh tiêu đề (handle kéo) */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    style: React.CSSProperties
  }
}

/**
 * Hook dùng chung để thêm khả năng kéo (drag) cho popup / dialog.
 *
 * Cách dùng:
 *   const { containerRef, containerStyle, dragHandleProps } = useDraggable()
 *
 *   <div ref={containerRef} style={{ ...boxStyle, ...containerStyle }}>
 *     <div {...dragHandleProps} style={{ ...titleStyle, ...dragHandleProps.style }}>
 *       Tiêu đề
 *     </div>
 *     ...nội dung...
 *   </div>
 */
export function useDraggable(): UseDraggableResult {
  const [position, setPosition] = useState<DraggablePosition | null>(null)
  const dragStartRef = useRef<{
    clientX: number
    clientY: number
    startX: number
    startY: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const startX = position?.x ?? rect.left
      const startY = position?.y ?? rect.top
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, startX, startY }

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragStartRef.current) return
        const dx = ev.clientX - dragStartRef.current.clientX
        const dy = ev.clientY - dragStartRef.current.clientY
        setPosition({
          x: dragStartRef.current.startX + dx,
          y: dragStartRef.current.startY + dy,
        })
      }
      const onMouseUp = () => {
        dragStartRef.current = null
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [position],
  )

  const containerStyle: React.CSSProperties =
    position != null
      ? { position: 'fixed', left: position.x, top: position.y, transform: 'none', margin: 0 }
      : {}

  return {
    containerRef,
    containerStyle,
    dragHandleProps: {
      onMouseDown,
      style: { cursor: 'move', userSelect: 'none' },
    },
  }
}
