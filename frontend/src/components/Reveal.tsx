import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveal on scroll. One IntersectionObserver per element, disconnected the
 * moment it fires — content must never depend on the observer having run, so
 * the initial class is the only thing that changes.
 *
 * Respects prefers-reduced-motion by starting in the shown state.
 */
export default function Reveal({
  children, delay = 0, className = '',
}: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
