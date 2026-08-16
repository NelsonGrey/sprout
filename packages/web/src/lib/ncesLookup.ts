import { useEffect, useState } from 'react';

// NCES's own ArcGIS REST service — the federal government's public school
// directory (Common Core of Data). Confirmed callable directly from the
// browser: it reflects Access-Control-Allow-Origin for any origin, no
// backend proxy needed. Only covers *public* schools — private schools
// need the manual-entry fallback in CreateSchoolPage.
const NCES_LAYER_URL =
  'https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2223/MapServer/0/query';

export interface NcesSchoolResult {
  ncesId: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export async function searchNcesSchools(query: string, limit = 8): Promise<NcesSchoolResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // Escape single quotes for the ArcGIS `where` clause (basic SQL-string escaping).
  const escaped = trimmed.replace(/'/g, "''");
  const params = new URLSearchParams({
    where: `NAME LIKE '%${escaped}%'`,
    outFields: 'NCESSCH,NAME,STREET,CITY,STATE,ZIP',
    f: 'json',
    resultRecordCount: String(limit),
  });

  const response = await fetch(`${NCES_LAYER_URL}?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json();

  return (data.features ?? []).map((feature: { attributes: Record<string, string> }) => ({
    ncesId: feature.attributes.NCESSCH,
    name: feature.attributes.NAME,
    street: feature.attributes.STREET,
    city: feature.attributes.CITY,
    state: feature.attributes.STATE,
    zip: feature.attributes.ZIP,
  }));
}

/** Debounced (~350ms) search-as-you-type against searchNcesSchools. */
export function useNcesSchoolSearch(query: string): { results: NcesSchoolResult[]; loading: boolean } {
  const [results, setResults] = useState<NcesSchoolResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await searchNcesSchools(trimmed);
        if (!cancelled) setResults(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading };
}
