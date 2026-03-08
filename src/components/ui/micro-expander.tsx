'use client';

import * as React from 'react';
import {
  motion,
  type HTMLMotionProps,
  type Variants,
  AnimatePresence,
} from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicroExpanderProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  text: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  isLoading?: boolean;
}

const MicroExpander = React.forwardRef<HTMLButtonElement, MicroExpanderProps>(
  (
    {
      text,
      icon,
      isActive = false,
      isLoading = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const containerVariants: Variants = {
      initial: { width: '56px' }, // h-14 is 56px
      hover: { width: 'auto' },
      loading: { width: '56px' },
    };

    const textVariants: Variants = {
      initial: { opacity: 0, x: -10 },
      hover: {
        opacity: 1,
        x: 0,
        transition: { delay: 0.15, duration: 0.3, ease: 'easeOut' },
      },
      exit: {
        opacity: 0,
        x: -5,
        transition: { duration: 0.1, ease: 'linear' },
      },
    };

    const activeClass = "bg-white text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)]";
    const inactiveClass = "bg-[#4a362f] text-white border-white/5 shadow-lg";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading) return;
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative flex h-14 items-center overflow-hidden rounded-full',
          'whitespace-nowrap font-medium text-sm tracking-wide',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isLoading && 'cursor-not-allowed',
          isActive ? activeClass : inactiveClass,
          className
        )}
        initial='initial'
        animate={isLoading ? 'loading' : isHovered ? 'hover' : 'initial'}
        variants={containerVariants}
        // Exact 21st.dev transition curve
        transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={handleClick}
        disabled={isLoading}
        {...props}
        aria-label={text}
      >
        <div className='grid h-14 w-14 place-items-center shrink-0 z-10'>
          <AnimatePresence mode='popLayout'>
            {isLoading ? (
              <motion.div
                key='spinner'
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Loader2 className='h-6 w-6 animate-spin' />
              </motion.div>
            ) : (
              <motion.div
                key='icon'
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <div className={isActive ? "text-black" : "text-white"}>
                  {icon || <Plus className='h-6 w-6' />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div variants={textVariants} className={cn('pr-6 pl-1', isActive ? 'text-black' : 'text-white')}>
          {text}
        </motion.div>
      </motion.button>
    );
  }
);

MicroExpander.displayName = 'MicroExpander';

export { MicroExpander };