"use client";

import { useEffect, useState } from "react";
import { BpCombobox } from "./ui";

type Option = { id: string; name: string };

/**
 * Where the store ships from — same data source and contract as the Classic
 * `ShippingOriginPicker`, just built on `BpCombobox` (search + a pending state) instead of
 * `HeroSelectField`'s `searchable`/`loading` props.
 */
export function BlueprintShippingOriginPicker({ provinceId, cityId, onChange }: {
  provinceId: string | null;
  cityId: string | null;
  onChange: (next: { provinceId: string | null; cityId: string | null }) => void;
}) {
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [citiesFor, setCitiesFor] = useState<string | null>(null);
  const loadingCities = Boolean(provinceId) && citiesFor !== provinceId;

  useEffect(() => {
    let active = true;
    void fetch("/api/locations/provinces")
      .then((response) => response.json())
      .then((result) => { if (active) setProvinces(result.items ?? []); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoadingProvinces(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    let active = true;
    void fetch(`/api/locations/cities?provinceId=${encodeURIComponent(provinceId)}`)
      .then((response) => response.json())
      .then((result) => { if (!active) return; setCities(result.items ?? []); })
      .catch(() => { if (active) setCities([]); })
      .finally(() => { if (active) setCitiesFor(provinceId); });
    return () => { active = false; };
  }, [provinceId]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <BpCombobox
        label="استان مبدأ"
        value={provinceId ?? ""}
        pending={loadingProvinces}
        options={provinces.map((item) => ({ value: item.id, label: item.name }))}
        onChange={(value) => onChange({ provinceId: value || null, cityId: null })}
      />
      <BpCombobox
        label="شهر مبدأ"
        value={cityId ?? ""}
        pending={Boolean(provinceId) && loadingCities}
        options={provinceId ? cities.map((item) => ({ value: item.id, label: item.name })) : []}
        onChange={(value) => onChange({ provinceId, cityId: value || null })}
      />
    </div>
  );
}
