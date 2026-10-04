import * as THREE from "three";

/** Frees every geometry, material, texture and instance buffer under `root`. */
export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    const { geometry, material } = object as Partial<THREE.Mesh>;
    if (geometry) geometries.add(geometry);
    if (material) for (const m of Array.isArray(material) ? material : [material]) materials.add(m);
  });
  for (const material of materials) {
    for (const value of Object.values(material))
      if (value instanceof THREE.Texture) textures.add(value);
    if (material instanceof THREE.ShaderMaterial) {
      for (const uniform of Object.values(material.uniforms)) {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
      }
    }
    material.dispose();
  }
  textures.forEach((t) => t.dispose());
  geometries.forEach((g) => g.dispose());
}
