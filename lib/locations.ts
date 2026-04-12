export const LOCATIONS = [
  { value: 'cairo', label: 'Cairo' },
  { value: 'giza', label: 'Giza' },
  { value: 'alexandria', label: 'Alexandria' },
  { value: 'sharm-el-sheikh', label: 'Sharm El Sheikh' },
  { value: 'hurghada', label: 'Hurghada' },
  { value: 'luxor', label: 'Luxor' },
  { value: 'aswan', label: 'Aswan' },
  { value: 'port-said', label: 'Port Said' },
  { value: 'suez', label: 'Suez' },
  { value: 'mansoura', label: 'Mansoura' },
  { value: 'tanta', label: 'Tanta' },
  { value: 'asyut', label: 'Asyut' },
  { value: 'ismailia', label: 'Ismailia' },
  { value: 'faiyum', label: 'Faiyum' },
  { value: 'zagazig', label: 'Zagazig' },
  { value: 'damietta', label: 'Damietta' },
  { value: 'minya', label: 'Minya' },
  { value: 'damanhur', label: 'Damanhur' },
  { value: 'beni-suef', label: 'Beni Suef' },
  { value: 'qena', label: 'Qena' },
  { value: 'sohag', label: 'Sohag' },
  { value: 'shibin-el-kom', label: 'Shibin El Kom' },
] as const

const LOCATION_LABELS = new Map<string, string>(
  LOCATIONS.flatMap((location) => [
    [location.value.toLowerCase(), location.label],
    [location.label.toLowerCase(), location.label],
  ])
)

export function getLocationLabel(value: string | null | undefined): string {
  if (!value) return ''
  const normalized = value.toString().trim().toLowerCase()
  return LOCATION_LABELS.get(normalized) || value
}
