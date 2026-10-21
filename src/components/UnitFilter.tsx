import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { activeFilterUnits } from "@/lib/unit-lifecycle";

export const ALL_UNITS = "all";

export function UnitFilter({ units, value, onChange }: { units: { id: string; identifier: string; active: boolean; terminated_at: string | null }[]; value: string; onChange: (v: string) => void }) {
  const activeUnits = activeFilterUnits(units);
  useEffect(() => {
    if (value !== ALL_UNITS && !activeUnits.some((u) => u.id === value)) onChange(ALL_UNITS);
  }, [units, value, onChange]);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Filtrar por unidade" className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_UNITS}>Todas as unidades</SelectItem>
        {activeUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
