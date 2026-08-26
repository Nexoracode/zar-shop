"use client";

import { useEffect, useState } from "react";
import { HeroSelectField } from "@/components/hero-select-field";

type Option = { id: string; name: string };

/**
 * Where the store ships from.
 *
 * A carrier rate needs an origin as a province and city pair, and the store's only address until
 * now was free text that no rate service can read. The lists come from the same endpoints the
 * customer's address form uses, so origin and destination speak the same codes.
 */
export function ShippingOriginPicker({ provinceId, cityId, onChange }: {
  provinceId: string | null;
  cityId: string | null;
  onChange: (next: { provinceId: string | null; cityId: string | null }) => void;
}) {
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  // Which province the loaded cities belong to. Loading is derived from it rather than set at
  // the top of the effect, which would be a state write during render's commit phase.
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
      <HeroSelectField
        name="originProvinceId"
        label="استان مبدأ"
        searchable
        value={provinceId ?? ""}
        loading={loadingProvinces}
        options={provinces.map((item) => ({ value: item.id, label: item.name }))}
        onValueChange={(value) => onChange({ provinceId: value || null, cityId: null })}
      />
      <HeroSelectField
        name="originCityId"
        label="شهر مبدأ"
        searchable
        value={cityId ?? ""}
        disabled={!provinceId}
        loading={Boolean(provinceId) && loadingCities}
        options={cities.map((item) => ({ value: item.id, label: item.name }))}
        onValueChange={(value) => onChange({ provinceId, cityId: value || null })}
      />
    </div>
  );
}
