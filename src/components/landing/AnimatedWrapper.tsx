import { type CSSProperties, type ReactNode, useRef } from 'react';
import { motion, useInView } from 'motion/react';

interface AnimatedWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  scale?: number;
  once?: boolean;
  amount?: number;
  style?: CSSProperties;
}

export function AnimatedWrapper({
  children,
  className,
  delay = 0,
  duration = 0.72,
  y = 20,
  scale = 1,
  once = false,
  amount = 0.4,
  style,
}: AnimatedWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y, scale }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y, scale }}
      transition={{ delay, duration, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
