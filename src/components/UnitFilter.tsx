import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ALL_UNITS = "all";

export function UnitFilter({ units, value, onChange }: { units: { id: string; identifier: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Filtrar por unidade" className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_UNITS}>Todas as unidades</SelectItem>
        {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.identifier}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
