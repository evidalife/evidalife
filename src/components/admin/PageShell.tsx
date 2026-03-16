interface PageShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[#1c2a2b]/50">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children ?? (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
          Coming soon
        </div>
      )}
    </div>
  );
}
