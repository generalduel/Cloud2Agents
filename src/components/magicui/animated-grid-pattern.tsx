"use client";

import { motion } from "motion/react";
import {
  ComponentPropsWithoutRef,
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
} from "react";

import { cn } from "@/lib/utils";

export interface AnimatedGridPatternProps
  extends ComponentPropsWithoutRef<"svg"> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 1,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState<{ id: number; pos: number[] }[]>([]);

  const dimensionsRef = useRef({ width: 0, height: 0 });
  const prevNumSquares = useRef(numSquares);

  const getPos = useCallback(
    (dims: { width: number; height: number }) => {
      return [
        Math.floor((Math.random() * dims.width) / width),
        Math.floor((Math.random() * dims.height) / height),
      ];
    },
    [width, height]
  );

  const generateSquares = useCallback(
    (count: number, dims: { width: number; height: number }) => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        pos: getPos(dims),
      }));
    },
    [getPos]
  );

  const updateSquarePosition = useCallback(
    (id: number) => {
      setSquares((currentSquares) =>
        currentSquares.map((sq) =>
          sq.id === id
            ? {
                ...sq,
                pos: getPos(dimensionsRef.current),
              }
            : sq
        )
      );
    },
    [getPos]
  );

  useEffect(() => {
    if (numSquares !== prevNumSquares.current) {
      prevNumSquares.current = numSquares;
      if (dimensions.width && dimensions.height) {
        setSquares(generateSquares(numSquares, dimensions));
      }
    }
  }, [numSquares, dimensions, generateSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const newDims = { width, height };

        if (
          dimensionsRef.current.width !== width ||
          dimensionsRef.current.height !== height
        ) {
          dimensionsRef.current = newDims;
          setDimensions(newDims);
          setSquares(generateSquares(numSquares, newDims));
        }
      }
    });

    const container = containerRef.current;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, [numSquares, generateSquares]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
              repeatDelay,
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            key={`${x}-${y}-${index}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}
