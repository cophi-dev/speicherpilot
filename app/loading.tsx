import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-5 pt-8 md:px-8">
      <Skeleton className="h-10 w-64 rounded-md" />
      <Skeleton className="h-24 w-full rounded-md" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`sk-${index}`} className="h-28 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-md" />
    </div>
  );
}
