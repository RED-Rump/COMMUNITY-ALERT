import { MapPin } from "lucide-react";

export default function ZoneSelector({ zones, selectedZone, onSelect }) {
  return (
    <label className="zone-select-label">
      <span><MapPin size={16} /> Your neighborhood</span>
      <select value={selectedZone} onChange={(event) => onSelect(event.target.value)} disabled={zones.length === 0}>
        {zones.length === 0 ? <option value="">No neighborhoods available</option> : zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
      </select>
    </label>
  );
}
