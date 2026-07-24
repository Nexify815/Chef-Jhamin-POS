import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'chef-jhamin-staff-tour';

export function useStaffTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) setShowTour(true);
  }, []);

  const startTour = () => setShowTour(true);
  const endTour = () => {
    localStorage.setItem(STORAGE_KEY, 'done');
    setShowTour(false);
  };

  return { showTour, startTour, endTour };
}

const steps = [
  {
    target: 'tour-welcome',
    title: 'Welcome!',
    text: 'This is your dashboard. You can see today\'s sales, orders, and expenses here.',
    placement: 'bottom',
  },
  {
    target: 'tour-clock-status',
    title: 'Clock Status',
    text: 'This shows if you\'re currently clocked in or out, along with your shift details.',
    placement: 'bottom',
  },
  {
    target: 'tour-clock-buttons',
    title: 'Clock In / Out',
    text: 'Start your shift with Clock In, and end it with Clock Out. Always do this!',
    placement: 'bottom',
  },
  {
    target: 'tour-sales-card',
    title: 'Record a Sale',
    text: 'Tap here to quickly record a new sale. Select the item, size, and payment method.',
    placement: 'top',
  },
  {
    target: 'tour-expense-card',
    title: 'Add an Expense',
    text: 'Log expenses like supplies, transport, or utilities here.',
    placement: 'top',
  },
  {
    target: 'tour-inventory-card',
    title: 'Check Inventory',
    text: 'View stock levels and record stock in/out movements.',
    placement: 'top',
  },
];

export default function StaffTour({ show, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlight, setHighlight] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!show) {
      setCurrentStep(0);
      setHighlight(null);
      return;
    }
    highlightStep(currentStep);
  }, [show, currentStep]);

  const highlightStep = (stepIndex) => {
    if (stepIndex >= steps.length) {
      onComplete();
      return;
    }
    const step = steps[stepIndex];
    const el = document.getElementById(step.target);
    if (!el) {
      setCurrentStep(stepIndex + 1);
      return;
    }

    const rect = el.getBoundingClientRect();
    setHighlight(rect);

    const isTop = step.placement === 'top';
    const tooltipWidth = 320;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = isTop ? rect.top - 12 : rect.bottom + 12;

    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) left = window.innerWidth - tooltipWidth - 12;
    if (!isTop && top + 180 > window.innerHeight) top = rect.top - 12;

    setTooltipStyle({ position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${tooltipWidth}px`, zIndex: 10001 });

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const next = () => setCurrentStep((s) => s + 1);
  const skip = () => onComplete();

  if (!show || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }} ref={overlayRef}>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(1px)' }}
        onClick={skip}
      />

      {highlight && (
        <div
          style={{
            position: 'fixed',
            left: highlight.left - 6,
            top: highlight.top - 6,
            width: highlight.width + 12,
            height: highlight.height + 12,
            border: '2px solid var(--teal, #14B8A6)',
            borderRadius: 12,
            boxShadow: '0 0 0 4000px rgba(0,0,0,0.25)',
            transition: 'all 0.3s ease',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={tooltipStyle}
        className="anim-scale-in"
      >
        <div
          style={{
            background: 'var(--bg-card, #1A1F2E)',
            border: '1px solid var(--border-glow, rgba(20,184,166,0.3))',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--teal, #14B8A6)', fontWeight: 600 }}>
              Step {currentStep + 1} of {steps.length}
            </span>
            <button onClick={skip} style={{ fontSize: 11, color: 'var(--text-muted, #888)', cursor: 'pointer', background: 'none', border: 'none' }}>
              Skip Tour
            </button>
          </div>

          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--teal, #14B8A6), var(--teal-deep, #0D9488))', borderRadius: 4, transition: 'width 0.3s ease' }} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: 6 }}>
            {step.title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #aaa)', lineHeight: 1.5, marginBottom: 16 }}>
            {step.text}
          </p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-secondary, #aaa)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--teal, #14B8A6), var(--teal-deep, #0D9488))',
                color: '#fff',
                border: 'none',
              }}
            >
              {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
