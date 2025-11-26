"use client";

import { type PropsWithChildren, useEffect, useRef, useState } from "react";

type HandlebarsProps = PropsWithChildren;

export function Handlebars({ children }: HandlebarsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftHandleRef = useRef<HTMLDivElement>(null);
  const rightHandleRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(0);
  const [leftHandle, setLeftHandle] = useState(0);
  const [rightHandle, setRightHandle] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const newWidth = el.offsetWidth;
      setWidth(newWidth);
      setRightHandle(newWidth);
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const leftEl = leftHandleRef.current;
    const rightEl = rightHandleRef.current;
    if (!leftEl || !rightEl) return;

    let isDraggingLeft = false;
    let isDraggingRight = false;
    let startX = 0;
    let initialPosition = 0;

    const handleMouseDown = (e: MouseEvent, isLeft: boolean) => {
      e.preventDefault();
      startX = e.clientX;
      
      if (isLeft) {
        isDraggingLeft = true;
        initialPosition = leftHandle;
      } else {
        isDraggingRight = true;
        initialPosition = rightHandle;
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      
      if (isDraggingLeft) {
        const newPosition = Math.max(0, Math.min(rightHandle - 60, initialPosition + deltaX));
        setLeftHandle(newPosition);
        if (leftEl) {
          leftEl.style.transform = `translateX(${newPosition}px)`;
        }
      } else if (isDraggingRight) {
        const newPosition = Math.max(leftHandle + 60, Math.min(width, initialPosition + deltaX));
        setRightHandle(newPosition);
        if (rightEl) {
          rightEl.style.transform = `translateX(${newPosition}px)`;
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingLeft = false;
      isDraggingRight = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    const leftMouseDown = (e: MouseEvent) => handleMouseDown(e, true);
    const rightMouseDown = (e: MouseEvent) => handleMouseDown(e, false);

    leftEl.addEventListener("mousedown", leftMouseDown);
    rightEl.addEventListener("mousedown", rightMouseDown);

    return () => {
      leftEl.removeEventListener("mousedown", leftMouseDown);
      rightEl.removeEventListener("mousedown", rightMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [leftHandle, rightHandle, width]);

  const leftGradientPercent = width > 0 ? (leftHandle / (width - 10)) * 100 : 0;
  const rightGradientPercent = width > 0 ? (rightHandle / (width + 10)) * 100 : 0;

  return (
    <div className="leading-16 -z-10 flex justify-center gap-4">
      <div
        ref={containerRef}
        className="relative -z-10 mt-0.5 -rotate-[2.76deg]"
      >
        <div className="absolute inset-0 flex h-full w-full justify-between rounded-2xl border border-yellow-500">
          <div
            ref={leftHandleRef}
            className="bg-background absolute left-0 flex h-full w-7 select-none items-center justify-center rounded-full border border-yellow-500 cursor-grab hover:scale-105 transition-transform"
            style={{
              transform: `translateX(${leftHandle}px)`,
            }}
          >
            <div className="h-8 w-2 rounded-full bg-yellow-500" />
          </div>

          <div
            ref={rightHandleRef}
            className="bg-background absolute -left-[30px] flex h-full w-7 select-none items-center justify-center rounded-full border border-yellow-500 cursor-grab hover:scale-105 transition-transform]"
            style={{
              transform: `translateX(${rightHandle}px)`,
            }}
          >
            <div className="h-8 w-2 rounded-full bg-yellow-500" />
          </div>
        </div>

        <span
          className="relative inline-flex h-full w-full items-center justify-center rounded-2xl px-9 will-change-auto"
          style={{
            mask: `linear-gradient(90deg,
            rgba(255, 255, 255, 0) 0%, 
            rgba(255, 255, 255, 0) ${leftGradientPercent}%, 
            rgba(0, 0, 0) ${leftGradientPercent}%, 
            rgba(0, 0, 0) ${rightGradientPercent}%, 
            rgba(255, 255, 255, 0) ${rightGradientPercent}%, 
            rgba(255, 255, 255, 0) 100%)`,
          }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}
