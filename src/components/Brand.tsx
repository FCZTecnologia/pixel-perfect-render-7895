export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-brand-gradient grid size-11 place-items-center rounded-2xl font-display text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
        BND
      </div>
      <div>
        <div className="font-display font-semibold leading-none">Painel Bandeiras Empresarial</div>
        {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}
