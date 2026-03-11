export default function PlanBadge({ plan }: { plan: string | null | undefined }) {
  if (!plan) return null;
  return (
    <span className="inline-block text-[10px] font-bold lowercase bg-[#E3B636] text-white rounded px-1 py-0.5 leading-none">
      {plan}
    </span>
  );
}
