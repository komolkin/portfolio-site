import { Color, Vector3, type MeshPhysicalMaterial } from "three";

const RIM_COLOR = new Color("#a855f7");
const RIM_BIAS = new Vector3(-0.42, 0.58, 0.7).normalize();

export type PurpleRimGlowUniforms = {
  uRimIntensity: { value: number };
  uRimPower: { value: number };
};

/** View-dependent purple rim emissive — strongest at silhouette edges, biased top-left.
 * `onReady` fires once `onBeforeCompile` runs so callers can animate the uniforms. */
export function applyPurpleRimGlow(
  material: MeshPhysicalMaterial,
  onReady?: (uniforms: PurpleRimGlowUniforms) => void,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: RIM_COLOR };
    shader.uniforms.uRimPower = { value: 2.35 };
    shader.uniforms.uRimIntensity = { value: 1.05 };
    shader.uniforms.uRimBias = { value: RIM_BIAS };

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimIntensity;
uniform vec3 uRimBias;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
vec3 rimViewDir = normalize(vViewPosition);
vec3 rimNormal = normalize(normal);
float rimFresnel = pow(clamp(1.0 - abs(dot(rimNormal, rimViewDir)), 0.0, 1.0), uRimPower);
float rimBias = 0.18 + 0.82 * clamp(dot(rimNormal, normalize(uRimBias)), 0.0, 1.0);
totalEmissiveRadiance += uRimColor * rimFresnel * rimBias * uRimIntensity;`,
    );

    onReady?.({
      uRimIntensity: shader.uniforms.uRimIntensity as { value: number },
      uRimPower: shader.uniforms.uRimPower as { value: number },
    });
  };

  material.customProgramCacheKey = () => "thinking-purple-rim-glow";
  material.needsUpdate = true;
}
