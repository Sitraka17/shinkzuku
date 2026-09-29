import { Hand, Pencil, Palette, X, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POND_MATERIALS, type PondMaterial } from "./pond-materials";
import { useSetting } from "./settings/react";
import { settings } from "./settings/store";

export type PondTool = "hand" | "stick";
const hex = (value: number) => `#${value.toString(16).padStart(6, "0")}`;

export function PondTools({ tool, onToolChange, editorOpen, onEditorChange }: {
  tool: PondTool;
  onToolChange: (tool: PondTool) => void;
  editorOpen: boolean;
  onEditorChange: (open: boolean) => void;
}) {
  const [material, setMaterial] = useSetting<PondMaterial>(["pond-bed", "material"]);
  const [base, setBase] = useSetting<number>(["pond-bed", "materialBase"]);
  const [detail, setDetail] = useSetting<number>(["pond-bed", "materialDetail"]);
  const [custom, setCustom] = useSetting<boolean>(["pond-bed", "customPalette"]);
  const preset = POND_MATERIALS.find((item) => item.value === material)!;
  const selectMaterial = (value: PondMaterial) => {
    setMaterial(value);
    setCustom(false);
    if (value !== "sand") onToolChange("hand");
  };
  const openEditor = () => {
    if (!custom) {
      setBase(parseInt(preset.base.slice(1), 16));
      setDetail(parseInt(preset.detail.slice(1), 16));
    }
    onEditorChange(!editorOpen);
  };
  return <div className="pond-tools" lang="fr">
    <div className="pond-tool-toggle" role="group" aria-label="Outil du bassin">
      <Button variant="ghost" size="sm" aria-pressed={tool === "hand"} onClick={() => onToolChange("hand")} title="Appeler les carpes">
        <Hand aria-hidden="true" /> Main
      </Button>
      <Button variant="ghost" size="sm" aria-pressed={tool === "stick"} onClick={() => { selectMaterial("sand"); onToolChange("stick"); }} title="Écrire dans le sable pendant sept secondes">
        <Pencil aria-hidden="true" /> Bâton
      </Button>
    </div>
    <label className="pond-material-picker">
      <span>Fond</span>
      <select aria-label="Fond du bassin" value={material} onChange={(event) => selectMaterial(event.target.value as PondMaterial)}>
        {POND_MATERIALS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <Button variant="ghost" size="sm" aria-expanded={editorOpen} aria-controls="pond-material-editor" onClick={openEditor} aria-label="Créer un fond">
      <Palette aria-hidden="true" /><span>Créer</span>
    </Button>
    {editorOpen && <section id="pond-material-editor" className="pond-material-editor" aria-label="Créer un fond" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onEditorChange(false); } }}>
      <div className="pond-material-editor__heading"><h2>Votre fond, votre calme</h2><Button variant="ghost" size="icon-sm" aria-label="Fermer la création de fond" onClick={() => onEditorChange(false)}><X /></Button></div>
      <p>Personnalisez les couleurs du matériau choisi. Votre création reste enregistrée sur cet appareil.</p>
      {material === "natural" ? <p>Choisissez sable, pierre, pavés, brique, bois ou piscine pour créer votre propre palette.</p> : <>
        <div className="pond-material-colors">
          <label>Teinte principale<input type="color" value={custom ? hex(base) : preset.base} onChange={(e) => { setBase(parseInt(e.target.value.slice(1), 16)); setCustom(true); }} /></label>
          <label>Grain et joints<input type="color" value={custom ? hex(detail) : preset.detail} onChange={(e) => { setDetail(parseInt(e.target.value.slice(1), 16)); setCustom(true); }} /></label>
        </div>
        <Button variant="secondary" size="sm" onClick={() => settings.set(["pond-bed", "materialSeed"], Math.floor(Math.random() * 100000))}><Shuffle /> Nouvelle texture</Button>
        <Button variant="ghost" size="sm" onClick={() => setCustom(false)}>Couleurs d’origine</Button>
      </>}
    </section>}
  </div>;
}
