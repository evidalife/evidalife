export default function AuthDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[#0e393d]/10" />
      <span className="text-xs text-[#1c2a2b]/40 whitespace-nowrap">{text}</span>
      <div className="flex-1 h-px bg-[#0e393d]/10" />
    </div>
  );
}
