import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CTAButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-4 py-2.5 text-[11px]',
  md: 'px-5 py-3 text-xs',
  lg: 'px-7 py-4 text-sm',
};

const baseClassName =
  'landing-cta inline-flex items-center gap-2 rounded-full font-semibold uppercase tracking-[0.24em] text-slate-950';

export function CTAButton({
  children,
  className,
  href,
  onClick,
  size = 'md',
}: CTAButtonProps) {
  const classes = cn(baseClassName, sizeClasses[size], className);

  const content = (
    <>
      <span>{children}</span>
      <ArrowRight size={16} />
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={classes}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={classes}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {content}
    </motion.button>
  );
}
