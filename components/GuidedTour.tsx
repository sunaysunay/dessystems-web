'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

type GuideStep = {
  id: string;
  title: string;
  body: string;
  target_selector: string | null;
  doc_link: string | null;
  screen_path: string | null;
  step_order: number;
};

type Props = {
  moduleCode: string;
  submodule: string;
  userId?: string;
  /** Externally controlled: when true, force-start the tour */
  forceStart?: boolean;
  onClose?: () => void;
};

export default function GuidedTour({ moduleCode, submodule, userId, forceStart, onClose }: Props) {
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const fetchSteps = useCallback(async () => {
    const params = new URLSearchParams({ module: moduleCode, submodule });
    if (userId) params.set('user_id', userId);
    const res = await fetch(`/api/bop/shop/guide?${params}`);
    const data = await res.json();
    if (data.steps?.length > 0 && !data.completed) {
      setSteps(data.steps);
      setCurrent(0);
      setVisible(true);
    } else if (data.steps?.length > 0) {
      setSteps(data.steps);
    }
  }, [moduleCode, submodule, userId]);

  useEffect(() => { fetchSteps(); }, [fetchSteps]);

  useEffect(() => {
    if (forceStart && steps.length > 0) {
      setCurrent(0);
      setVisible(true);
    }
  }, [forceStart, steps.length]);

  // Position spotlight around target element
  const updateRect = useCallback(() => {
    if (!visible || !steps[current]) { setRect(null); return; }
    const sel = steps[current].target_selector;
    if (!sel) { setRect(null); return; }
    const el = document.querySelector(sel);
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
  }, [visible, steps, current]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  // ResizeObserver for layout changes
  useEffect(() => {
    if (!visible) return;
    const ro = new ResizeObserver(() => updateRect());
    ro.observe(document.body);
    observerRef.current = ro;
    return () => { ro.disconnect(); observerRef.current = null; };
  }, [visible, updateRect]);

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const markComplete = useCallback(async () => {
    if (userId) {
      await fetch('/api/bop/shop/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_code: moduleCode, submodule, user_id: userId }),
      });
    }
    close();
  }, [userId, moduleCode, submodule, close]);

  if (!visible || steps.length === 0) return null;

  const step = steps[current];
  const isLast = current === steps.length - 1;
  const padding = 8;

  // Tooltip positioning
  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.bottom + padding + 8,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)),
        zIndex: 10000,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
      };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {/* Overlay with spotlight cutout */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9999 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="guided-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(15,23,42,0.6)"
          mask="url(#guided-tour-mask)"
        />
      </svg>

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="w-[360px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-4"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{step.title}</h3>
          <span className="text-[11px] text-slate-400 ml-2 whitespace-nowrap">
            {current + 1} of {steps.length}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{step.body}</p>
        {step.doc_link && (
          <a
            href={step.doc_link}
            className="text-xs text-indigo-500 hover:text-indigo-400 mb-3 inline-block"
          >
            Learn more &rarr;
          </a>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={close}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {current > 0 && (
              <button
                onClick={() => setCurrent(c => c - 1)}
                className="text-xs px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                &larr; Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={markComplete}
                className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Done &#10003;
              </button>
            ) : (
              <button
                onClick={() => setCurrent(c => c + 1)}
                className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Next &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
