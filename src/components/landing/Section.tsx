import type { ReactNode } from 'react';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cn } from '../../utils/cn';
import { AnimatedWrapper } from './AnimatedWrapper';

interface SectionProps {
  id: string;
  eyebrow: string;
  index: string;
  title: string;
  lines: readonly string[];
  children?: ReactNode;
  className?: string;
  layout?: 'split' | 'sticky' | 'centered';
  visualClassName?: string;
}

export function Section({
  id,
  eyebrow,
  index,
  title,
  lines,
  children,
  className,
  layout = 'split',
  visualClassName,
}: SectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const backdropY = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 56, reduceMotion ? 0 : -56]);

  return (
    <section
      ref={ref}
      id={id}
      data-story-section={id}
      className={cn(
        'landing-screen relative overflow-hidden px-6 py-18 md:px-10 lg:px-16',
        layout === 'centered' && 'flex items-center',
        className,
      )}
    >
      <motion.div aria-hidden className="landing-section-halo" style={{ y: backdropY }} />

      <div
        className={cn(
          'relative z-10 mx-auto max-w-[1240px]',
          layout === 'centered'
            ? 'w-full text-center'
            : 'grid items-center gap-12 lg:gap-18',
          layout === 'split' && 'lg:grid-cols-[0.9fr_1.1fr]',
          layout === 'sticky' && 'lg:grid-cols-[0.72fr_1.28fr] lg:items-start',
        )}
      >
        <div
          className={cn(
            'space-y-6',
            layout === 'centered' && 'mx-auto max-w-[760px]',
            layout === 'sticky' && 'lg:sticky lg:top-24',
          )}
        >
          <AnimatedWrapper className="landing-section-meta" y={14}>
            <span>{index}</span>
            <span className="h-px w-10 bg-white/14" />
            <span>{eyebrow}</span>
          </AnimatedWrapper>

          <AnimatedWrapper delay={0.05}>
            <h2 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl lg:text-6xl">
              {title}
            </h2>
          </AnimatedWrapper>

          <div className={cn('space-y-3', layout === 'centered' && 'mx-auto max-w-[640px]')}>
            {lines.map((line, indexLine) => (
              <AnimatedWrapper
                key={line}
                delay={0.1 + indexLine * 0.06}
                y={16}
                className={cn(layout === 'centered' && 'mx-auto')}
              >
                <p className={cn('max-w-[30rem] text-base leading-7 text-slate-300 md:text-lg', layout === 'centered' && 'mx-auto text-center')}>
                  {line}
                </p>
              </AnimatedWrapper>
            ))}
          </div>
        </div>

        {children ? (
          <AnimatedWrapper
            delay={layout === 'centered' ? 0.18 : 0.14}
            className={cn('relative', layout === 'centered' && 'mx-auto w-full max-w-[980px]', visualClassName)}
          >
            {children}
          </AnimatedWrapper>
        ) : null}
      </div>
    </section>
  );
}
