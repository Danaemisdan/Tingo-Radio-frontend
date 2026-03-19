import React from "react";
import { AudioSynthesizerIcon } from "./audio-synthesizer-icon";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  showSynthIcon?: boolean;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", showSynthIcon = false, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-full border bg-background p-2 text-center font-semibold",
        "flex items-center justify-center",
        className,
      )}
      {...props}
    >
      {/* Unhovered State: Perfectly centered flow containing exactly one dot and text */}
      <div className="relative z-10 flex h-full w-full items-center justify-center gap-2 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-x-4">
        <div className="h-2 w-2 rounded-full bg-[#FF6B35]"></div>
        <span>{text}</span>
      </div>

      {/* Hovered State: Slides in with text and optional synth icon */}
      <div className="absolute top-0 left-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <span>{text}</span>
        {showSynthIcon && <AudioSynthesizerIcon className="w-5 h-5 opacity-90" />}
      </div>

      {/* Hovered Background Ripple: Expands from center out to fill the pill */}
      <div className="absolute left-1/2 top-1/2 z-0 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF6B35] transition-all duration-300 ease-out group-hover:h-[500px] group-hover:w-[500px]"></div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
