export const POND_MATERIALS = [
  { value: "sand", label: "Sable clair", base: "#cbbd98", detail: "#998966" },
  { value: "stone", label: "Pierre taillée", base: "#b9b4a4", detail: "#817d72" },
  { value: "cobble", label: "Pavés", base: "#a6a79c", detail: "#737a70" },
  { value: "brick", label: "Brique", base: "#bc886f", detail: "#d4c7ae" },
  { value: "wood", label: "Bois", base: "#b79b73", detail: "#796448" },
  { value: "pool", label: "Piscine", base: "#a5cbd0", detail: "#e0e5db" },
  { value: "natural", label: "Étang vert", base: "#7cb7a1", detail: "#256541" },
] as const;
export type PondMaterial = (typeof POND_MATERIALS)[number]["value"];
