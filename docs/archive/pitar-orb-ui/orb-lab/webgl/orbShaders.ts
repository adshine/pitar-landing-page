export const orbVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uEnergy;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vWave;

  float waveField(vec3 p, float time) {
    float broad = sin(p.y * 4.2 + time * 0.62) * 0.038;
    float cross = sin((p.x - p.z) * 5.1 - time * 0.48) * 0.026;
    float detail = sin((p.x + p.y + p.z) * 9.0 + time * 0.83) * 0.012;
    return (broad + cross + detail) * (0.45 + uEnergy * 0.75);
  }

  void main() {
    float wave = waveField(position, uTime);
    vec3 sphere = position + normal * wave;

    // The target preserves a substantial vertical glass capsule beside the input.
    vec3 pill = vec3(
      position.x * 0.44,
      position.y * 1.22,
      position.z * 0.46
    );
    pill += normal * wave * vec3(0.5, 1.0, 0.5);
    pill.x += sin(position.y * 3.4 + uTime * 0.45) * 0.035 * uEnergy;

    float morph = smoothstep(0.0, 1.0, uMorph);
    vec3 transformed = mix(sphere, pill, morph);
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);

    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = worldPosition.xyz;
    vWave = wave;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const orbFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uFocus;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vWave;

  vec3 spectral(float t) {
    vec3 cyan = vec3(0.13, 0.96, 1.0);
    vec3 cobalt = vec3(0.20, 0.29, 1.0);
    vec3 coral = vec3(1.0, 0.24, 0.34);
    vec3 yellow = vec3(1.0, 0.88, 0.17);

    vec3 cool = mix(cyan, cobalt, smoothstep(0.05, 0.48, t));
    vec3 warm = mix(coral, yellow, smoothstep(0.54, 0.94, t));
    return mix(cool, warm, smoothstep(0.43, 0.64, t));
  }

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vNormal)), 0.0), 2.15);
    float bands = 0.5 + 0.5 * sin(
      vWorldPosition.y * 5.0 +
      vWorldPosition.x * 2.7 -
      uTime * 0.38 +
      vWave * 18.0
    );
    float hue = fract(bands * 0.62 + vWorldPosition.z * 0.12 + uTime * 0.016);
    vec3 color = spectral(hue);
    color += vec3(0.28, 0.35, 0.52) * fresnel;
    color *= 0.64 + uEnergy * 0.42 + uFocus * 0.18;

    float alpha = 0.018 + fresnel * 0.14 + bands * 0.018 + uFocus * 0.012;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.2));
  }
`;
