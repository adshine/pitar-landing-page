/**
 * Disc-wave reconstruction: dense circular plates on an S-curve,
 * each plate spins gently forever (true infinite loop).
 */
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const SHOW_ASCII = false;
const plateDataPromise = fetch(new URL("./plate-data.json", import.meta.url)).then((response) => {
  if (!response.ok) throw new Error(`Unable to load measured plate data: ${response.status}`);
  return response.json();
});

function createAsciiMaterial(sourceTexture, cellSize) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: sourceTexture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCell: { value: cellSize },
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(0xff5a45) },
      uBg: { value: new THREE.Color(0x050505) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uCell;
      uniform float uTime;
      uniform vec3 uTint;
      uniform vec3 uBg;
      varying vec2 vUv;

      float luminance(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      float glyph(vec2 p, float level) {
        p = fract(p) - 0.5;
        float d = length(p);
        float ring = abs(d - 0.22) - 0.045;
        float bar = min(abs(p.x), abs(p.y)) - 0.035;
        float diag = abs(p.x + p.y) - 0.03;
        float fill = d - 0.18;
        float g =
          level < 0.12 ? 1.0 :
          level < 0.28 ? max(bar, 0.0) :
          level < 0.45 ? max(diag, 0.0) :
          level < 0.62 ? max(ring, 0.0) :
          level < 0.8  ? max(min(bar, ring), 0.0) :
                         max(fill, 0.0);
        return 1.0 - smoothstep(0.0, 0.04, g);
      }

      void main() {
        vec2 frag = vUv * uResolution;
        vec2 cell = floor(frag / uCell);
        vec2 cellUv = (cell + 0.5) * uCell / uResolution;
        vec3 sampleCol = texture2D(tDiffuse, cellUv).rgb;
        float lum = luminance(sampleCol);
        float level = clamp(lum * 1.15 + 0.03 * sin(uTime * 1.4 + cell.x * 0.3), 0.0, 1.0);
        float g = glyph(frag / uCell, level);
        vec3 ink = mix(uTint, sampleCol * 1.35, 0.55);
        vec3 col = mix(uBg, ink, g * smoothstep(0.02, 0.18, lum));
        col += sampleCol * g * lum * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/** Tight S-curve matching the reference ribbon. */
function curvePoint(t, target = new THREE.Vector3()) {
  const x = THREE.MathUtils.lerp(-3.55, 3.65, t);
  const centered = t - 0.5;
  // Measured cubic centreline from the supplied 735x413 reference.
  const imageY = ((1.13459674 * t - 1.36736181) * t + 0.13746931) * t + 0.56379308;
  const y = (0.46 - imageY) * 3.6;
  // Cubic depth swings the end plates toward camera while keeping the waist edge-on.
  const z = 7.0 * centered * centered * centered;
  return target.set(x, y, z);
}

function curveTangent(t, target = new THREE.Vector3()) {
  const eps = 0.0015;
  const a = curvePoint(Math.max(0, t - eps));
  const b = curvePoint(Math.min(1, t + eps));
  return target.copy(b).sub(a).normalize();
}

function buildDiscs(group, records) {
  // A flattened sphere gives each plate the reference's soft lenticular edge.
  const geometry = new THREE.SphereGeometry(0.5, 40, 20);

  const discs = [];
  const p = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  let prevNormal = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const t = i / Math.max(1, records.length - 1);
    const color = new THREE.Color().setRGB(
      record.sampled_srgb[0] / 255,
      record.sampled_srgb[1] / 255,
      record.sampled_srgb[2] / 255,
      THREE.SRGBColorSpace,
    );

    const material = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color.clone(),
      emissiveIntensity: 0.46,
      metalness: 0.06,
      roughness: THREE.MathUtils.lerp(0.48, 0.22, t),
      clearcoat: 0.4,
      clearcoatRoughness: 0.35,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // 100 reference pixels equal one world unit. Every transform comes from the
    // detector output; no procedural centre curve or radius function is used.
    mesh.position.set(
      (record.center_px[0] - 367.5) / 100,
      (206.5 - record.center_px[1]) / 100,
      i * 0.006,
    );
    mesh.scale.set(
      record.minor_axis_px / 100,
      record.major_axis_px / 100,
      0.16,
    );
    mesh.rotation.z = THREE.MathUtils.degToRad(record.orientation_deg - 90);

    group.add(mesh);
    discs.push(mesh);
  }

  return discs;
}

export async function mountWaveAscii(container) {
  if (!container) return () => {};
  const plateData = await plateDataPromise;

  const width = () => Math.max(1, container.clientWidth);
  const height = () => Math.max(1, container.clientHeight);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width(), height());
  renderer.setClearColor(0x110302, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x110302);
  scene.fog = new THREE.FogExp2(0x110302, 0.004);

  const camera = new THREE.OrthographicCamera(-3.675, 3.675, 2.065, -2.065, 0.1, 100);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xffb09a, 2.15);
  key.position.set(1.8, -0.8, 4.8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x674047, 0.72);
  fill.position.set(-5, 1, 2);
  scene.add(fill);

  const rim = new THREE.PointLight(0xff4a2e, 17, 11, 2.15);
  rim.position.set(2.0, -0.2, 1.35);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0x3a2020, 0.72));
  scene.add(new THREE.HemisphereLight(0xff765f, 0x090202, 0.52));

  const root = new THREE.Group();
  scene.add(root);

  const discs = buildDiscs(root, plateData.records);

  const rt = new THREE.WebGLRenderTarget(width(), height(), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const asciiScene = new THREE.Scene();
  const asciiCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const asciiMat = createAsciiMaterial(rt.texture, 7);
  const asciiQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), asciiMat);
  asciiScene.add(asciiQuad);

  const setSize = () => {
    const w = width();
    const h = height();
    const halfHeight = 2.065;
    const halfWidth = halfHeight * (w / h);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    rt.setSize(w * dpr, h * dpr);
    asciiMat.uniforms.uResolution.value.set(w, h);
    asciiMat.uniforms.uCell.value = Math.max(5, Math.round(Math.min(w, h) / 90));
  };
  setSize();

  const ro = new ResizeObserver(setSize);
  ro.observe(container);

  let frame = 0;
  let running = true;
  const tick = () => {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    // Deliberately static: a stable pose makes the reconstruction measurable.
    asciiMat.uniforms.uTime.value = 0;

    if (SHOW_ASCII) {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(asciiScene, asciiCamera);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  };

  tick();

  return () => {
    running = false;
    cancelAnimationFrame(frame);
    ro.disconnect();
    geometryDispose(discs, root, asciiQuad, rt, renderer);
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}

function geometryDispose(discs, root, asciiQuad, rt, renderer) {
  const seenGeo = new Set();
  for (const disc of discs) {
    if (disc.geometry && !seenGeo.has(disc.geometry)) {
      seenGeo.add(disc.geometry);
      disc.geometry.dispose();
    }
    disc.material?.dispose?.();
  }
  asciiQuad.geometry.dispose();
  asciiQuad.material.dispose();
  rt.dispose();
  renderer.dispose();
  root.clear();
}

const host = document.getElementById("work");
if (host) {
  mountWaveAscii(host);
}
