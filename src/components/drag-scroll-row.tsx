"use client";

import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
};

export function DragScrollRow({ children, className = "", ariaLabel }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, pointerId: -1, startX: 0, startScrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !rowRef.current) return;
    drag.current = { active: true, moved: false, pointerId: event.pointerId, startX: event.clientX, startScrollLeft: rowRef.current.scrollLeft };
    rowRef.current.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || !rowRef.current) return;
    const distance = event.clientX - drag.current.startX;
    if (Math.abs(distance) > 4) drag.current.moved = true;
    rowRef.current.scrollLeft = drag.current.startScrollLeft - distance;
    if (drag.current.moved) event.preventDefault();
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
    drag.current.active = false;
    if (rowRef.current?.hasPointerCapture(event.pointerId)) rowRef.current.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  }

  function captureClick(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return <div ref={rowRef} dir="rtl" aria-label={ariaLabel} className={`${className} select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClickCapture={captureClick} onDragStart={(event) => event.preventDefault()}>{children}</div>;
}
