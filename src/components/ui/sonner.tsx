import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      expand={true}
      richColors={true}
      closeButton={true}
      duration={4000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-primary/30 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          title: "group-[.toast]:font-cinzel group-[.toast]:font-bold group-[.toast]:text-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-cinzel",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-card group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted",
          success: "group-[.toaster]:border-green-500/40 group-[.toaster]:bg-green-500/10",
          error: "group-[.toaster]:border-red-500/40 group-[.toaster]:bg-red-500/10",
          warning: "group-[.toaster]:border-yellow-500/40 group-[.toaster]:bg-yellow-500/10",
          info: "group-[.toaster]:border-cyan-500/40 group-[.toaster]:bg-cyan-500/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
