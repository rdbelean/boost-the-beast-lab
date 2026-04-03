"use client";
import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only on fine pointer devices (desktop)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    setVisible(true);
    const dot = dotRef.current;
    if (!dot) return;

    let cx = -100, cy = -100, tx = -100, ty = -100;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const update = () => {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      dot.style.transform = `translate(${cx}px, ${cy}px)`;
      rafId = requestAnimationFrame(update);
    };

    document.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(update);

    // Expand on interactive elements
    const onEnter = () => setExpanded(true);
    const onLeave = () => setExpanded(false);

    const observe = () => {
      document.querySelectorAll("a, button").forEach((el) => {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    };

    observe();
    // Re-observe after DOM changes
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      mo.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={dotRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: expanded ? 40 : 10,
        height: expanded ? 40 : 10,
        background: expanded ? "transparent" : "#fff",
        border: expanded ? "2px solid var(--accent-red)" : "none",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 9999,
        marginLeft: expanded ? -20 : -5,
        marginTop: expanded ? -20 : -5,
        mixBlendMode: expanded ? "normal" : "difference",
        transition: "width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s, border 0.25s, margin 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
    />
  );
}
