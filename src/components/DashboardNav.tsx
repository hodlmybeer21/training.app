'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';

/**
 * Menu button plus slide-in navigation drawer used by every dashboard page.
 * The drawer is fixed-position, so this can sit anywhere in the page header.
 */
export default function DashboardNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="hamburger-btn"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="dashboard-nav-drawer"
      >
        <span aria-hidden="true">☰</span>
      </button>
      <div
        id="dashboard-nav-drawer"
        ref={drawerRef}
        className="dash-drawer"
        role="dialog"
        aria-modal={open}
        aria-label="Navigation"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        <Sidebar active={active} />
      </div>
      {open && <div className="dash-drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}
