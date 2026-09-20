export function KPISkeleton() {
  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 animate-pulse h-[116px] shadow-sm">
      <div className="h-4 bg-[#333] rounded w-1/2 mb-6"></div>
      <div className="h-8 bg-[#333] rounded w-3/4"></div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 animate-pulse h-[350px] shadow-sm">
      <div className="h-5 bg-[#333] rounded w-1/4 mb-8"></div>
      <div className="h-[250px] bg-[#333] rounded w-full"></div>
    </div>
  );
}
