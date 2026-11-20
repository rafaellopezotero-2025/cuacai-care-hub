import * as React from "react";

import { cn } from "@/lib/utils";
import { aplicaMayusculas, convertirAMayusculas } from "@/lib/mayusculas";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onChange, ...props }, ref) => {
    const mayus = aplicaMayusculas(props);
    return (
      <textarea
        className={cn(
          mayus && "uppercase",
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground placeholder:normal-case focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        onChange={(e) => {
          if (mayus) convertirAMayusculas(e.target);
          onChange?.(e);
        }}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
