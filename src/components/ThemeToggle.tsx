import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const ThemeToggle = () => {
  const { resolvedTheme = "dark", setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => {
        if (mounted) {
          setTheme(nextTheme);
        }
      }}
      className="relative h-10 w-10 border-border shadow-sm"
    >
      <Sun
        className={cn(
          "absolute inset-0 m-auto h-5 w-5 transition-all",
          mounted && isDark ? "scale-0 opacity-0" : "scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute inset-0 m-auto h-5 w-5 transition-all",
          mounted && isDark ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      />
    </Button>
  );
};
