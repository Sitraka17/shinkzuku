import * as THREE from "three";
import { POND_MATERIALS } from "./pond-materials";
import { SandWriting, type SandPoint } from "./sand-writing";
import { CANVAS_HEIGHT, CANVAS_WIDTH, POND_BED } from "./config";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSpeckColor;
  uniform float uVerticalTone;
  uniform float uGrainScale;
  uniform float uEdgeDarkening;
  uniform float uMaterial;
  uniform float uSeed;
  uniform vec3 uMaterialBase;
  uniform vec3 uMaterialDetail;
  uniform sampler2D uWriting;
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  void main() {
    float verticalTone = smoothstep(0.0, 1.0, vUv.y) * uVerticalTone;
    vec3 color = mix(uDeepColor, uShallowColor, verticalTone);

    vec2 grainCell = floor(
      vUv * uResolution * uGrainScale
    );
    float grain = hash21(grainCell);
    float darkSpeck = smoothstep(0.975, 0.998, grain);
    color -= darkSpeck * uSpeckColor;

    vec2 p = vUv * uResolution;
    float grainFine = hash21(floor(p * 1.7) + uSeed);
    vec3 base = uMaterialBase;
    vec3 detail = uMaterialDetail;
    if (uMaterial < 0.5) {
      // Fine, warm sand with shallow ripples, like a quiet riverbank.
      float dune = sin(p.y * 0.13 + sin(p.x * 0.032) * 2.0) * 0.018;
      color = base * (0.94 + grainFine * 0.10 + dune);
      color = mix(color, detail, step(0.987, grainFine) * 0.25);
    } else if (uMaterial < 5.5) {
      vec2 tileSize = vec2(34.0, 19.0);
      if (uMaterial > 1.5 && uMaterial < 2.5) tileSize = vec2(15.0, 13.0);
      if (uMaterial > 2.5 && uMaterial < 3.5) tileSize = vec2(25.0, 11.0);
      if (uMaterial > 3.5 && uMaterial < 4.5) tileSize = vec2(66.0, 12.0);
      if (uMaterial > 4.5) tileSize = vec2(12.0);
      float row = floor(p.y / tileSize.y);
      vec2 q = p;
      if (uMaterial < 4.5) q.x += mod(row, 2.0) * tileSize.x * 0.5;
      if (uMaterial > 1.5 && uMaterial < 2.5) {
        q += vec2(sin(p.y * 0.42), sin(p.x * 0.38)) * 1.1;
      }
      vec2 cell = floor(q / tileSize);
      vec2 f = fract(q / tileSize) * tileSize;
      vec2 edge = min(f, tileSize - f);
      float seam = 1.0 - smoothstep(0.4, 1.2, min(edge.x, edge.y));
      float variation = hash21(cell + uSeed);
      color = base * (0.87 + variation * 0.20 + grainFine * 0.055);
      if (uMaterial > 3.5 && uMaterial < 4.5) {
        float woodGrain = sin(p.y * 2.2 + sin(p.x * 0.06 + variation * 5.0) * 1.8);
        color *= 0.95 + woodGrain * 0.055;
      }
      color = mix(color, detail, seam * 0.8);
      color += (1.0 - smoothstep(1.0, 2.2, f.y)) * (1.0 - seam) * 0.035;
    }
    // The writing is part of the pond floor: water, shadows and fish render above it.
    vec4 writing = texture2D(uWriting, vec2(vUv.x, 1.0 - vUv.y));
    color = mix(color, writing.rgb, writing.a * 0.85);

    float edgeDepth = smoothstep(0.48, 0.82, length((vUv - 0.5) * vec2(1.0, 1.25)));
    color *= 1.0 - edgeDepth * uEdgeDarkening * (uMaterial > 5.5 ? 1.0 : 0.45);

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface RuntimePondBedAppearance {
  deepColor: THREE.Color;
  shallowColor: THREE.Color;
  speckColor: THREE.Color;
  verticalTone: number;
  grainScale: number;
  edgeDarkening: number;
}

function pondBedAppearanceFromConfig(): RuntimePondBedAppearance {
  return {
    deepColor: new THREE.Color().setRGB(...POND_BED.deepColor),
    shallowColor: new THREE.Color().setRGB(...POND_BED.shallowColor),
    speckColor: new THREE.Color().setRGB(...POND_BED.speckColor),
    verticalTone: POND_BED.verticalTone,
    grainScale: POND_BED.grainScale,
    edgeDarkening: POND_BED.edgeDarkening,
  };
}

export class PondBedPass {
  public readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private readonly material: THREE.ShaderMaterial;
  private readonly currentAppearance = pondBedAppearanceFromConfig();
  private targetAppearance = pondBedAppearanceFromConfig();
  private previousTime = -1;
  private readonly writing = new SandWriting();
  private readonly writingCanvas = document.createElement("canvas");
  private readonly writingContext = this.writingCanvas.getContext("2d")!;
  private readonly writingTexture = new THREE.CanvasTexture(this.writingCanvas);
  private writingRevision = -1;

  public beginWriting(point: SandPoint): void { this.writing.begin(point, performance.now() / 1000); }
  public continueWriting(point: SandPoint): void { this.writing.append(point, performance.now() / 1000); }
  public endWriting(): void { this.writing.end(); }
  public clearWriting(): void { this.writing.clear(); }

  public dispose(): void {
    this.writingTexture.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }

  private updateWriting(): void {
    this.writing.expire(performance.now() / 1000);
    if (this.writingRevision === this.writing.revision) return;
    this.writingRevision = this.writing.revision;
    const ctx = this.writingContext;
    const { width, height } = this.writingCanvas;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of this.writing.strokes) {
      for (const highlight of [true, false]) {
        ctx.strokeStyle = highlight ? "rgba(245,228,185,0.65)" : "rgba(76,60,39,0.85)";
        ctx.lineWidth = highlight ? 4 : 2.5;
        const offset = highlight ? 1.4 : 0;
        ctx.beginPath();
        stroke.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height + offset;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        if (stroke.length === 1) ctx.lineTo(stroke[0].x * width + 0.1, stroke[0].y * height + offset);
        ctx.stroke();
      }
    }
    this.writingTexture.needsUpdate = true;
  }

  public constructor() {
    this.writingCanvas.width = CANVAS_WIDTH * 2;
    this.writingCanvas.height = CANVAS_HEIGHT * 2;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMaterial: { value: 0 },
        uSeed: { value: 0 },
        uMaterialBase: { value: new THREE.Color() },
        uMaterialDetail: { value: new THREE.Color() },
        uWriting: { value: this.writingTexture },
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uDeepColor: { value: new THREE.Color() },
        uShallowColor: { value: new THREE.Color() },
        uSpeckColor: { value: new THREE.Color() },
        uVerticalTone: { value: 0 },
        uGrainScale: { value: 0 },
        uEdgeDarkening: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CANVAS_WIDTH, CANVAS_HEIGHT),
      this.material,
    );
    this.mesh.position.set(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, -1);
    this.mesh.renderOrder = 0;
    this.mesh.frustumCulled = false;
    this.applyUniforms();
  }

  public refreshConfig(): void {
    this.targetAppearance = pondBedAppearanceFromConfig();
  }

  public resize(width: number, height: number): void {
    this.writingCanvas.width = width * 2;
    this.writingCanvas.height = height * 2;
    this.writingRevision = -1;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.PlaneGeometry(width, height);
    this.mesh.position.set(width * 0.5, height * 0.5, -1);
    this.material.uniforms.uResolution.value.set(width, height);
  }

  public update(time: number): void {
    this.updateWriting();
    if (this.previousTime >= 0) {
      const deltaTime = Math.min(0.1, Math.max(0, time - this.previousTime));
      const blend = 1 - Math.exp(-deltaTime * 2.25);
      const current = this.currentAppearance;
      const target = this.targetAppearance;
      current.deepColor.lerp(target.deepColor, blend);
      current.shallowColor.lerp(target.shallowColor, blend);
      current.speckColor.lerp(target.speckColor, blend);
      current.verticalTone +=
        (target.verticalTone - current.verticalTone) * blend;
      current.grainScale += (target.grainScale - current.grainScale) * blend;
      current.edgeDarkening +=
        (target.edgeDarkening - current.edgeDarkening) * blend;
    }
    this.previousTime = time;
    this.applyUniforms();
  }

  private applyUniforms(): void {
    const current = this.currentAppearance;
    const index = POND_MATERIALS.findIndex(({ value }) => value === POND_BED.material);
    const preset = POND_MATERIALS[Math.max(0, index)];
    this.material.uniforms.uMaterial.value = Math.max(0, index);
    this.material.uniforms.uSeed.value = POND_BED.materialSeed;
    this.material.uniforms.uMaterialBase.value.set(POND_BED.customPalette ? POND_BED.materialBase : preset.base);
    this.material.uniforms.uMaterialDetail.value.set(POND_BED.customPalette ? POND_BED.materialDetail : preset.detail);
    this.material.uniforms.uDeepColor.value.copy(current.deepColor);
    this.material.uniforms.uShallowColor.value.copy(current.shallowColor);
    this.material.uniforms.uSpeckColor.value.copy(current.speckColor);
    this.material.uniforms.uVerticalTone.value = current.verticalTone;
    this.material.uniforms.uGrainScale.value = current.grainScale;
    this.material.uniforms.uEdgeDarkening.value = current.edgeDarkening;
  }
}
