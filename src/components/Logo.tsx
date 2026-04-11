import React from 'react';
import { cn } from '../utils/cn';

interface LogoProps extends React.SVGProps<SVGSVGElement> {}

/**
 * FinIQ logo icon — professional fintech-grade mark.
 *
 * A rounded-rectangle container enclosing a clean upward-trending
 * chart line with an arrow, inspired by the Stitch-generated brand identity.
 * The icon is perfectly centered in a 32×32 viewBox.
 */
export function LogoIcon({ className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={cn(className)}
      {...props}
    >
      {/* Container — rounded rectangle background */}
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        fill="currentColor"
        fillOpacity="0.12"
      />

      {/* Chart line — 3 data points going up-right with an arrow */}
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Line segments */}
        <polyline
          points="7,22 12.5,16 18,19 25,10"
          strokeWidth="2.2"
        />

        {/* Arrow head */}
        <polyline
          points="21,10 25,10 25,14"
          strokeWidth="2.2"
        />
      </g>
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon className="w-7 h-7 text-primary" />
      <span className={cn('font-bold text-text-primary tracking-tight', textClassName)}>FINIQ</span>
    </div>
  );
}
