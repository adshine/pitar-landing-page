# Pitar black-glass orb — image analysis

## 1. Identification and classification

- Observable target: one isolated, near-spherical black glass orb on a black field.
- Primary domain: `object`; primary type: decorative interface orb / optical sphere.
- Confidence: 0.98. The target silhouette and material response are unambiguous.
- Intended use: real-time browser hero object with a fixed silhouette and a seamless three-second looping light animation.

## 2. Overall form and silhouette

- Bounding volume: sphere, approximately 0.72 of the image width and height.
- Symmetry: underlying geometry is radial; the visible lighting pattern is asymmetric.
- Silhouette: circular and invariant. Animation must not scale, stretch, pulse, or deform the outer edge.
- Camera: nearly orthographic/frontal presentation with the sphere centered slightly above the image midpoint.

## 3. Macro, meso, and micro decomposition

- Macro: continuous spherical glass shell; dark absorptive interior volume.
- Meso: bright outer rim reflection; broad upper-right reflection lobe; left interior caustic lobe; lower-left cyan rim segment.
- Micro: narrow white crest across the upper arc; secondary grey inner arc; pinpoint caustic near the left-center; faint concentric dark bands at the lower rim.

## 4. Spatial relationships

- The shell encloses and overlaps the dark interior volume.
- The white rim is flush with the sphere silhouette and strongest on the upper and left perimeter.
- The broad reflection lobe lies on the front-facing upper-right quadrant.
- The concave-looking caustic lobe is visible inside the left hemisphere and converges on a small bright point.
- The cyan accent follows the lower-left circumference and remains attached to the rim.

## 5. Materials and surface

- Shell: transparent or semi-transparent dielectric, low roughness, IOR approximately 1.45–1.52, high clearcoat/specular response.
- Interior: very low-value near-black absorption; not a flat opaque disk.
- Reflections: high dynamic-range white/grey environment response with soft gradients.
- Cyan accent: emissive-looking reflected band; inference only, not evidence of cyan base color.

## 6. Color and finish

- Base value: near black with subtle cool grey variation.
- Main highlights: neutral white through cool grey.
- Accent: vivid cyan-to-blue segment at the lower-left perimeter.
- Finish: polished gloss with distinct sharp and broad reflection frequencies.

## 7. Identity-defining features

1. Perfectly stable circular silhouette.
2. Double-layered bright upper rim.
3. Broad translucent upper-right reflection lobe.
4. Left interior concave caustic terminating in a pinpoint highlight.
5. Short cyan lower-left rim accent.
6. Nearly black but visibly volumetric interior.
7. Several faint nested lower/perimeter reflection bands.
8. Moving illumination rather than moving or deforming geometry.

## 8. Uncertainty and single-image limits

- The rear hemisphere and exact environment are hidden.
- The left caustic may be a reflected environment shape rather than physical interior geometry.
- Exact transmission thickness and absorption distance cannot be measured from one image.
- The reference supports a faithful frontal hero presentation and plausible orbital views, but not an exact reconstruction of hidden reflections.
- The procedural solution should preserve the observed frontal lighting composition while rotating light/reflection fields around a fixed sphere during the loop.

## Suitability verdict

Conditional pass. The macro geometry is rotationally symmetric and fully visible. Exact glass caustics cannot be recovered from one frame, but the requested browser hero effect is feasible with a layered sphere, physically based shell, and procedural reflection/caustic shaders. No geometry deformation is permitted during animation.
