import { cn } from "@/lib/utils";

/** A shape that sweeps a soft highlight while real content loads. Motion stops under prefers-reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

export function MonitorRowSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <Skeleton className="h-6 w-14" />
      <Skeleton className="h-4 w-24 hidden sm:block" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}
