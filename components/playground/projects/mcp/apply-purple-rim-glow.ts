import { Color, Vector3, type MeshPhysicalMaterial } from "three";

const DEFAULT_RIM_COLOR = "#a855f7";
const RIM_BIAS = new Vector3(-0.42, 0.58, 0.7).normalize();

/** View-dependent rim emissive — strongest at silhouette edges, biased top-left. */
export function applyPurpleRimGlow(
  material: MeshPhysicalMaterial,
  rimColor = DEFAULT_RIM_COLOR,
  rimIntensity = 1.05,
) {
  const rimColorValue = new Color(rimColor);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColorValue };
    shader.uniforms.uRimPower = { value: 2.35 };
    shader.uniforms.uRimIntensity = { value: rimIntensity };
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
  };

  material.customProgramCacheKey = () => `mcp-rim-glow-${rimColor}-${rimIntensity}`;
  material.needsUpdate = true;
}
