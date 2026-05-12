<!-- source: https://json-render.dev/docs/api/react-three-fiber -->
# @json-render/react-three-fiber

## Installation

```
npm install @json-render/react-three-fiber @json-render/core @json-render/react @react-three/fiber @react-three/drei three zod
```

## Entry Points

| Entry Point | Exports | Use For |
|---|---|---|
| `@json-render/react-three-fiber` | `threeComponents`, `ThreeRenderer`, `ThreeCanvas`, schemas | React Three Fiber implementations and renderer |
| `@json-render/react-three-fiber/catalog` | `threeComponentDefinitions` | Catalog schemas (no R3F dependency, safe for server) |

## Usage

```javascript
import { defineCatalog } from "@json-render/core";
import { schema, defineRegistry } from "@json-render/react";
import {
  threeComponentDefinitions,
  threeComponents,
  ThreeCanvas,
} from "@json-render/react-three-fiber";

const catalog = defineCatalog(schema, {
  components: {
    Box: threeComponentDefinitions.Box,
    Sphere: threeComponentDefinitions.Sphere,
    AmbientLight: threeComponentDefinitions.AmbientLight,
    DirectionalLight: threeComponentDefinitions.DirectionalLight,
    OrbitControls: threeComponentDefinitions.OrbitControls,
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Box: threeComponents.Box,
    Sphere: threeComponents.Sphere,
    AmbientLight: threeComponents.AmbientLight,
    DirectionalLight: threeComponents.DirectionalLight,
    OrbitControls: threeComponents.OrbitControls,
  },
});
```

### ThreeCanvas (convenience)

```javascript
<ThreeCanvas
  spec={spec}
  registry={registry}
  shadows
  camera={{ position: [5, 5, 5], fov: 50 }}
  style={{ width: "100%", height: "100vh" }}
/>
```

### Manual Canvas Setup

```javascript
import { Canvas } from "@react-three/fiber";
import { ThreeRenderer } from "@json-render/react-three-fiber";

<Canvas shadows>
  <ThreeRenderer spec={spec} registry={registry} />
</Canvas>
```

## Components

### Primitives

| Component | Description | Key Props |
|---|---|---|
| `Box` | Box mesh (default 1x1x1) | `width`, `height`, `depth`, `material` |
| `Sphere` | Sphere mesh | `radius`, `widthSegments`, `heightSegments`, `material` |
| `Cylinder` | Cylinder mesh | `radiusTop`, `radiusBottom`, `height`, `material` |
| `Cone` | Cone mesh | `radius`, `height`, `material` |
| `Torus` | Torus (donut) mesh | `radius`, `tube`, `material` |
| `Plane` | Flat plane mesh | `width`, `height`, `material` |
| `Capsule` | Capsule mesh | `radius`, `length`, `material` |

All primitives share: `position`, `rotation`, `scale`, `castShadow`, `receiveShadow`, `material`.

### Material Schema

| Property | Type | Default |
|---|---|---|
| `color` | `string` | `"#ffffff"` |
| `metalness` | `number` | `0` |
| `roughness` | `number` | `1` |
| `emissive` | `string` | `"#000000"` |
| `emissiveIntensity` | `number` | `1` |
| `opacity` | `number` | `1` |
| `transparent` | `boolean` | `false` |
| `wireframe` | `boolean` | `false` |

### Lights

| Component | Description | Key Props |
|---|---|---|
| `AmbientLight` | Uniform illumination | `color`, `intensity` |
| `DirectionalLight` | Sunlight-style | `position`, `color`, `intensity`, `castShadow` |
| `PointLight` | Radiates from a point | `position`, `color`, `intensity`, `distance`, `decay` |
| `SpotLight` | Cone of light | `position`, `color`, `intensity`, `angle`, `penumbra` |

### Other Components

| Component | Description | Key Props |
|---|---|---|
| `Group` | Container for children | `position`, `rotation`, `scale` |
| `Model` | GLTF/GLB model loader | `url`, `position`, `rotation`, `scale` |
| `Environment` | HDRI environment map | `preset`, `background`, `blur`, `intensity` |
| `Fog` | Linear fog effect | `color`, `near`, `far` |
| `GridHelper` | Reference grid | `size`, `divisions`, `color` |
| `Text3D` | 3D text (SDF) | `text`, `fontSize`, `color`, `anchorX`, `anchorY` |
| `PerspectiveCamera` | Camera | `position`, `fov`, `near`, `far`, `makeDefault` |
| `OrbitControls` | Camera controls | `enableDamping`, `enableZoom`, `autoRotate` |
| `GaussianSplat` | Gaussian splat loader | `src`, `position`, `rotation`, `scale`, `alphaHash`, `toneMapped` |

## Shared Schemas

```javascript
import {
  vector3Schema,
  materialSchema,
  transformProps,
  shadowProps,
} from "@json-render/react-three-fiber";
```

| Export | Description |
|---|---|
| `vector3Schema` | `z.tuple([z.number(), z.number(), z.number()])` |
| `materialSchema` | Standard material props (color, metalness, roughness, etc.) |
| `transformProps` | `{ position, rotation, scale }` schema fields |
| `shadowProps` | `{ castShadow, receiveShadow }` schema fields |

## ThreeRenderer

| Prop | Type | Description |
|---|---|---|
| `spec` | `Spec \| null` | The spec to render as a 3D scene |
| `registry` | `ComponentRegistry` | Component registry from `defineRegistry` |
| `store` | `StateStore` | External state store (controlled mode) |
| `initialState` | `Record<string, unknown>` | Initial state (uncontrolled mode) |
| `handlers` | `Record<string, Function>` | Action handlers |
| `loading` | `boolean` | Whether the spec is streaming |
| `children` | `ReactNode` | Additional R3F elements alongside the spec |

## ThreeCanvas

Extends `ThreeRendererProps` with Canvas options:

| Prop | Type | Description |
|---|---|---|
| `shadows` | `boolean` | Enable shadow maps |
| `camera` | `object` | Default camera config (position, fov, etc.) |
| `className` | `string` | CSS class for the canvas container |
| `style` | `CSSProperties` | Inline styles for the canvas container |

## Type Helpers

```typescript
import type { ThreeProps } from "@json-render/react-three-fiber";

type BoxProps = ThreeProps<"Box">;
type SphereProps = ThreeProps<"Sphere">;
```
