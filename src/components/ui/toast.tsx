import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full max-w-md flex-col-reverse gap-2 p-4",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center gap-4 overflow-hidden rounded-xl border-2 p-4 pr-10 shadow-2xl transition-all backdrop-blur-xl data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-gradient-to-r from-card/95 via-card/90 to-card/95 text-foreground shadow-[0_4px_30px_rgba(234,179,8,0.15)]",
        destructive: "border-red-500/50 bg-gradient-to-r from-red-950/90 via-red-900/85 to-red-950/90 text-red-50 shadow-[0_4px_30px_rgba(239,68,68,0.2)]",
        success: "border-green-500/50 bg-gradient-to-r from-green-950/90 via-green-900/85 to-green-950/90 text-green-50 shadow-[0_4px_30px_rgba(34,197,94,0.2)]",
        warning: "border-yellow-500/50 bg-gradient-to-r from-yellow-950/90 via-yellow-900/85 to-yellow-950/90 text-yellow-50 shadow-[0_4px_30px_rgba(234,179,8,0.2)]",
        info: "border-cyan-500/50 bg-gradient-to-r from-cyan-950/90 via-cyan-900/85 to-cyan-950/90 text-cyan-50 shadow-[0_4px_30px_rgba(6,182,212,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Icon component based on variant
const ToastIcon = ({ variant }: { variant?: string | null }) => {
  const iconClass = "w-6 h-6 shrink-0";

  switch (variant) {
    case "destructive":
      return <XCircle className={cn(iconClass, "text-red-400")} />;
    case "success":
      return <CheckCircle className={cn(iconClass, "text-green-400")} />;
    case "warning":
      return <AlertTriangle className={cn(iconClass, "text-yellow-400")} />;
    case "info":
      return <Info className={cn(iconClass, "text-cyan-400")} />;
    default:
      return <Info className={cn(iconClass, "text-primary")} />;
  }
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <ToastIcon variant={variant} />
      {children}
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-cinzel font-bold text-primary ring-offset-background transition-all hover:bg-primary/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-400/30 group-[.destructive]:text-red-200 group-[.destructive]:hover:bg-red-500/20",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1.5 text-foreground/40 transition-all hover:text-foreground hover:bg-white/10 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:hover:bg-red-500/20",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-cinzel font-bold tracking-wide", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs opacity-80", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
