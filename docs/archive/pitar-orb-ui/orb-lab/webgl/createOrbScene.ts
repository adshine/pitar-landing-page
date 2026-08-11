import * as THREE from "three";

import { orbFragmentShader, orbVertexShader } from "./orbShaders";

export type OrbUniforms = {
  uTime: { value: number };
  uMorph: { value: number };
  uEnergy: { value: number };
  uFocus: { value: number };
};

export type OrbScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  orbGroup: THREE.Group;
  shellMaterial: THREE.ShaderMaterial;
  ribbonMaterials: THREE.MeshBasicMaterial[];
  ribbons: THREE.Mesh[];
  uniforms: OrbUniforms;
  render: (time: number, morph: number, energy: number, focus: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const CYAN = new THREE.Color("#22f1ff");
const CORAL = new THREE.Color("#ff3d5e");
const YELLOW = new THREE.Color("#ffe22e");
const COBALT = new THREE.Color("#3449ff");

export function createOrbScene(renderer: THREE.WebGLRenderer): OrbScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  camera.position.set(0, 0, 5.5);

  const orbGroup = new THREE.Group();
  scene.add(orbGroup);

  const uniforms: OrbUniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uEnergy: { value: 0.7 },
    uFocus: { value: 0 },
  };

  const shellGeometry = new THREE.IcosahedronGeometry(1.16, 7);
  const shellMaterial = new THREE.ShaderMaterial({
    vertexShader: orbVertexShader,
    fragmentShader: orbFragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  shell.renderOrder = 0;
  orbGroup.add(shell);

  const coreGeometry = new THREE.IcosahedronGeometry(0.79, 5);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#11162d"),
    emissive: COBALT,
    emissiveIntensity: 0.52,
    roughness: 0.18,
    metalness: 0.04,
    transmission: 0.5,
    thickness: 1.35,
    ior: 1.36,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    depthTest: false,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.renderOrder = 1;
  orbGroup.add(core);

  const makeFilament = (phase: number, verticalScale: number, depthScale: number, radius: number) => {
    const points: THREE.Vector3[] = []
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2
      const wobble = 0.68 + Math.sin(angle * 3 + phase) * 0.13 + Math.sin(angle * 5 - phase) * 0.06
      points.push(new THREE.Vector3(
        Math.cos(angle) * wobble,
        Math.sin(angle) * wobble * verticalScale + Math.sin(angle * 2 + phase) * 0.12,
        Math.sin(angle * 3 + phase) * depthScale + Math.cos(angle * 2 - phase) * 0.08,
      ))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.42), 240, radius, 12, true)
  }

  const ribbonGeometryA = makeFilament(0.2, 0.92, 0.32, 0.047)
  const ribbonGeometryB = makeFilament(2.1, 0.78, 0.4, 0.038)
  const ribbonGeometryC = makeFilament(4.4, 1.08, 0.25, 0.028)

  const ribbonMaterials = [
    new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
    new THREE.MeshBasicMaterial({
      color: CORAL,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
    new THREE.MeshBasicMaterial({
      color: YELLOW,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  ];

  const ribbons = [
    new THREE.Mesh(ribbonGeometryA, ribbonMaterials[0]),
    new THREE.Mesh(ribbonGeometryB, ribbonMaterials[1]),
    new THREE.Mesh(ribbonGeometryC, ribbonMaterials[2]),
  ];
  ribbons[0].rotation.set(0.35, 0.1, -0.2);
  ribbons[1].rotation.set(-0.5, 0.65, 0.32);
  ribbons[2].rotation.set(0.6, -0.45, 0.5);
  ribbons.forEach((ribbon, index) => {
    ribbon.renderOrder = index + 2;
    orbGroup.add(ribbon);
  });

  scene.add(new THREE.AmbientLight("#3040ff", 1.1));
  const cyanLight = new THREE.PointLight(CYAN, 14, 9, 1.6);
  cyanLight.position.set(-2.4, 1.9, 2.8);
  scene.add(cyanLight);
  const coralLight = new THREE.PointLight(CORAL, 12, 8, 1.7);
  coralLight.position.set(2.3, -1.6, 2.0);
  scene.add(coralLight);
  const yellowLight = new THREE.PointLight(YELLOW, 8, 7, 1.6);
  yellowLight.position.set(0.4, 2.3, -1.2);
  scene.add(yellowLight);

  const render = (time: number, morph: number, energy: number, focus: number) => {
    uniforms.uTime.value = time;
    uniforms.uMorph.value = morph;
    uniforms.uEnergy.value = energy;
    uniforms.uFocus.value = focus;

    const compactX = THREE.MathUtils.lerp(1, 0.48, morph);
    const compactY = THREE.MathUtils.lerp(1, 1.16, morph);
    const compactZ = THREE.MathUtils.lerp(1, 0.58, morph);
    core.scale.set(compactX, compactY, compactZ);
    ribbons.forEach((ribbon, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      const rate = (0.12 + index * 0.035) * (0.45 + energy * 0.85);
      ribbon.rotation.y = time * rate * direction + index * 0.55;
      ribbon.rotation.x = time * rate * -0.55 * direction + index * 0.3;
      ribbon.rotation.z = time * rate * 0.24 * direction + index * 0.42;
      ribbon.scale.set(compactX, compactY, compactZ);
      ribbonMaterials[index].opacity =
        Math.min(1, (0.58 + index * 0.08) * (0.72 + energy * 0.32 + focus * 0.08));
    });

    orbGroup.rotation.y = time * 0.075;
    orbGroup.rotation.z = Math.sin(time * 0.22) * 0.045 * (1 - morph * 0.55);
    core.rotation.y = -time * 0.11;
    core.rotation.x = time * 0.07;
    coreMaterial.emissiveIntensity = 0.35 + energy * 0.42 + focus * 0.12;
    renderer.render(scene, camera);
  };

  const resize = (width: number, height: number) => {
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const dispose = () => {
    shellGeometry.dispose();
    shellMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();
    ribbonGeometryA.dispose();
    ribbonGeometryB.dispose();
    ribbonGeometryC.dispose();
    ribbonMaterials.forEach((material) => material.dispose());
    scene.clear();
  };

  return {
    scene,
    camera,
    orbGroup,
    shellMaterial,
    ribbonMaterials,
    ribbons,
    uniforms,
    render,
    resize,
    dispose,
  };
}
