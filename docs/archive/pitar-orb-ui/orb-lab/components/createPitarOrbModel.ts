import * as THREE from "three"

const vertexShader = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vPositionView;
  varying vec3 vNormalObject;
  varying vec3 vPositionObject;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vPositionView = viewPosition.xyz;
    vNormalView = normalize(normalMatrix * normal);
    vNormalObject = normalize(normal);
    vPositionObject = position;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const coreFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uLightAtlas;
  varying vec3 vNormalView;
  varying vec3 vPositionView;
  varying vec3 vNormalObject;
  varying vec3 vPositionObject;

  void main() {
    vec3 n = normalize(vNormalView);
    // 20 measured frames from the source's fixed-sphere interval. The geometry
    // remains spherical; only the traced optical field advances.
    float continuousFrame = mod(uTime, 2.0) * 10.0;
    float frameA = floor(continuousFrame);
    float frameB = mod(frameA + 1.0, 20.0);
    float frameMix = smoothstep(0.0, 1.0, fract(continuousFrame));
    // The measured source sphere has a 194px radius inside each 400px tile.
    // Its optical field therefore spans 97% of the tile diameter.
    vec2 projected = vec2(
      0.5 + (vPositionObject.x / 2.44) * 0.97,
      0.5 - (vPositionObject.y / 2.44) * 0.97
    );
    vec2 atlasUvA = (vec2(mod(frameA, 5.0), floor(frameA / 5.0)) + projected) / vec2(5.0, 4.0);
    vec2 atlasUvB = (vec2(mod(frameB, 5.0), floor(frameB / 5.0)) + projected) / vec2(5.0, 4.0);
    vec4 tracedA = texture2D(uLightAtlas, atlasUvA);
    vec4 tracedB = texture2D(uLightAtlas, atlasUvB);
    vec4 traced = mix(tracedA, tracedB, frameMix);

    gl_FragColor = vec4(traced.rgb, 1.0);
    #include <colorspace_fragment>
  }
`

const shellFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormalView;
  varying vec3 vPositionView;

  void main() {
    vec3 n = normalize(vNormalView);
    vec3 v = normalize(-vPositionView);
    float facing = clamp(dot(n, v), 0.0, 1.0);
    float rim = 1.0 - facing;
    float phase = fract(uTime / 3.0) * 6.28318530718;

    vec3 movingKey = normalize(vec3(-0.46 + 0.12 * sin(phase), 0.78, 0.38 + 0.08 * cos(phase)));
    float upper = pow(max(dot(n, movingKey), 0.0), 26.0);
    float edge = pow(rim, 5.2);
    float leftEdge = smoothstep(0.30, -0.72, n.x);
    float topEdge = smoothstep(-0.30, 0.65, n.y);
    float crest = edge * leftEdge * topEdge * 1.32;
    float innerCrest = pow(rim, 8.0) * smoothstep(-0.18, 0.72, n.y) * 0.62;
    float innerShellArc = exp(-pow((rim - 0.50) / 0.075, 2.0))
      * smoothstep(0.02, 0.70, n.y)
      * (1.0 - smoothstep(0.46, 0.94, n.x));

    vec3 colour = vec3(0.18, 0.21, 0.25) * edge * 0.32;
    colour += vec3(1.00, 1.00, 1.00) * crest;
    colour += vec3(0.54, 0.57, 0.61) * innerCrest;
    colour += vec3(0.24, 0.27, 0.31) * innerShellArc * 0.34;
    colour += vec3(0.26, 0.29, 0.33) * upper * 0.035;
    float alpha = clamp(edge * 0.42 + crest * 0.70 + innerCrest * 0.22 + innerShellArc * 0.18 + upper * 0.025, 0.0, 0.92);
    gl_FragColor = vec4(colour, alpha);
  }
`

export type PitarOrbModel = {
  root: THREE.Group
  tick: (elapsedSeconds: number) => void
  dispose: () => void
}

export function createPitarOrbModel(): PitarOrbModel {
  const root = new THREE.Group()
  root.name = "PitarOrb"

  const geometry = new THREE.SphereGeometry(1.22, 160, 112)
  const lightAtlas = new THREE.TextureLoader().load("/orb-assets/gleb-light-atlas.png")
  lightAtlas.colorSpace = THREE.SRGBColorSpace
  lightAtlas.flipY = false
  lightAtlas.minFilter = THREE.LinearFilter
  lightAtlas.magFilter = THREE.LinearFilter
  lightAtlas.generateMipmaps = false
  const coreMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: coreFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uLightAtlas: { value: lightAtlas },
    },
    toneMapped: false,
  })
  const shellMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: shellFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const core = new THREE.Mesh(geometry, coreMaterial)
  core.name = "AbsorptiveInterior"
  const shell = new THREE.Mesh(geometry.clone(), shellMaterial)
  shell.name = "GlassShell"
  shell.scale.setScalar(1.006)
  shell.renderOrder = 2
  // The measured atlas already contains the complete glass shell. Keeping the
  // procedural shell in the render double-counted the crest and rim.
  root.add(core)

  root.userData.sculptRuntime = {
    nodes: { core, shell },
    sockets: { centre: root },
    colliders: [{ type: "sphere", radius: 1.22 }],
    animation: "fixed-geometry / three-second looping light rig",
  }

  return {
    root,
    tick(elapsedSeconds) {
      coreMaterial.uniforms.uTime.value = elapsedSeconds
      shellMaterial.uniforms.uTime.value = elapsedSeconds
    },
    dispose() {
      geometry.dispose()
      shell.geometry.dispose()
      coreMaterial.dispose()
      shellMaterial.dispose()
      lightAtlas.dispose()
    },
  }
}
