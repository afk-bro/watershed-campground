"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export default function Tooltip({ children, content, side = 'top', className = '' }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const show = () => {
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                let top = 0;
                let left = 0;
                
                if (side === 'top') {
                    top = rect.top - 6; 
                    left = rect.left + rect.width / 2;
                } else if (side === 'bottom') {
                    top = rect.bottom + 6;
                    left = rect.left + rect.width / 2;
                } else if (side === 'left') {
                    top = rect.top + rect.height / 2;
                    left = rect.left - 6;
                } else if (side === 'right') {
                    top = rect.top + rect.height / 2;
                    left = rect.right + 6;
                }
                
                setCoords({ top, left });
                setVisible(true);
            }
        }, 300);
    };

    const hide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setVisible(false);
    };

    const transformClasses = {
        top: '-translate-x-1/2 -translate-y-full',
        bottom: '-translate-x-1/2',
        left: '-translate-x-full -translate-y-1/2',
        right: '-translate-y-1/2'
    };

    return (
        <div 
            ref={triggerRef}
            className={`relative inline-block ${className}`}
            onMouseEnter={show} 
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children}
            {mounted && visible && createPortal(
                <div 
                    className={`
                        fixed z-[9999] px-2.5 py-1.5 
                        bg-zinc-900 dark:bg-zinc-800 text-zinc-100 text-xs font-medium rounded-md shadow-lg whitespace-nowrap
                        pointer-events-none animate-in fade-in zoom-in-95 duration-100
                        ${transformClasses[side]}
                    `}
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                    {/* Tiny Arrow Pseudo-element simulation using border tricks if needed, but clean rect is safer for portal without complex math */}
                </div>,
                document.body
            )}
        </div>
    );
}
