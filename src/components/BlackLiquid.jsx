import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// 1. CONFIG
// ============================================================================

const SURFACE = {
  WIDTH: 18,
  HEIGHT: 10,
  SEGMENTS_X: 200,
  SEGMENTS_Y: 72,
};

const WATER = {
  COLOR: "#050505",
  HIGHLIGHT_COLOR: "#ffffff",
  DEEP_COLOR: "#000000",

  METALNESS: 0,
  ROUGHNESS: 0.25,

  REFLECTION_INTENSITY: 0.5,

  EDGE_BLEND_START: 0.2,
  EDGE_BLEND_END: 1.1,
  EDGE_BLEND_STRENGTH: 1,
};

const LIGHTING = {
  AMBIENT_INTENSITY: 1.6,

  KEY_INTENSITY: 1.5,
  RIM_INTENSITY: 0.6,

  KEY_POSITION: [0.3, 5.5, -10],
  RIM_POSITION: [-2.7, 3.5, -4.5],
  FILL_POSITION: [0, 1.8, 4.2],

  SHOW_CONTROLS: false,
  SHOW_HELPERS: true,
};

const WAVES = {
  AMPLITUDE: 0.12,
  SPEED: 0.55,

  LARGE_WAVE_SCALE: 0.25,
  SMALL_WAVE_SCALE: 1,

  LARGE_WAVE_STRENGTH: 1,
  SMALL_WAVE_STRENGTH: 0.3,

  WAVE_COUNT: 8,
};

const INTERACTION = {
  ENABLED: true,

  RIPPLE_STRENGTH: 0.6,
  RIPPLE_RADIUS: 1.5,

  DAMPING: 0.08,

  HOVER_BOOST: 1.5,
};

const DEBUG = {
  SHOW_GRID: false,
  SHOW_BOUNDS: false,
  SHOW_MOUSE_RADIUS: false,
};

const POSITION = {
  X: 0,
  Y: -2,
  Z: 0,

  SCALE: 1,

  ROTATION_X: -90,
  ROTATION_Y: 0,
  ROTATION_Z: 0,
};

const CAMERA_SETTINGS = {
  X: 0,
  Y: 2,
  Z: 8,

  FOV: 40,
};

const AXES = ["X", "Y", "Z"];
const LIGHTING_STORAGE_KEY = "viel-black-water-lighting";

const createLightingState = () => ({
  AMBIENT_INTENSITY: LIGHTING.AMBIENT_INTENSITY,
  KEY_INTENSITY: LIGHTING.KEY_INTENSITY,
  RIM_INTENSITY: LIGHTING.RIM_INTENSITY,
  KEY_POSITION: [...LIGHTING.KEY_POSITION],
  RIM_POSITION: [...LIGHTING.RIM_POSITION],
  FILL_POSITION: [...LIGHTING.FILL_POSITION],
  SHOW_CONTROLS: LIGHTING.SHOW_CONTROLS,
  SHOW_HELPERS: LIGHTING.SHOW_HELPERS,
});

const isVector3 = (value) =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((entry) => Number.isFinite(entry));

const loadLightingState = () => {
  const defaults = createLightingState();

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(LIGHTING_STORAGE_KEY);
    if (!raw) return defaults;

    const saved = JSON.parse(raw);

    return {
      ...defaults,
      AMBIENT_INTENSITY: Number.isFinite(saved.AMBIENT_INTENSITY)
        ? saved.AMBIENT_INTENSITY
        : defaults.AMBIENT_INTENSITY,
      KEY_INTENSITY: Number.isFinite(saved.KEY_INTENSITY)
        ? saved.KEY_INTENSITY
        : defaults.KEY_INTENSITY,
      RIM_INTENSITY: Number.isFinite(saved.RIM_INTENSITY)
        ? saved.RIM_INTENSITY
        : defaults.RIM_INTENSITY,
      KEY_POSITION: isVector3(saved.KEY_POSITION)
        ? saved.KEY_POSITION
        : defaults.KEY_POSITION,
      RIM_POSITION: isVector3(saved.RIM_POSITION)
        ? saved.RIM_POSITION
        : defaults.RIM_POSITION,
      FILL_POSITION: isVector3(saved.FILL_POSITION)
        ? saved.FILL_POSITION
        : defaults.FILL_POSITION,
    };
  } catch {
    return defaults;
  }
};

// ============================================================================
// 2. MATERIAL
// ============================================================================

const createWaterMaterial = () => {
  const surfaceColor = new THREE.Color(WATER.COLOR);
  const deepColor = new THREE.Color(WATER.DEEP_COLOR);
  const highlightColor = new THREE.Color(WATER.HIGHLIGHT_COLOR);
  const reflectionStrength = THREE.MathUtils.clamp(
    WATER.REFLECTION_INTENSITY,
    0,
    1,
  );
  const edgeBlendStart = THREE.MathUtils.clamp(WATER.EDGE_BLEND_START, 0, 1);
  const edgeBlendEnd = THREE.MathUtils.clamp(WATER.EDGE_BLEND_END, 0, 1);
  const edgeBlendStrength = Math.max(WATER.EDGE_BLEND_STRENGTH, 0.001);

  const material = new THREE.MeshPhysicalMaterial({
    color: surfaceColor,
    emissive: deepColor.clone().lerp(surfaceColor, 0.35),
    emissiveIntensity: 0.2,
    metalness: WATER.METALNESS,
    roughness: WATER.ROUGHNESS,
    reflectivity: 0.14 + reflectionStrength * 0.18,
    specularIntensity: 0.18 + reflectionStrength * 0.42,
    specularColor: highlightColor.clone().multiplyScalar(0.5),
    clearcoat: 0.18 + reflectionStrength * 0.22,
    clearcoatRoughness: 0.55,
    sheen: 0.08 + reflectionStrength * 0.18,
    sheenColor: highlightColor,
    sheenRoughness: 0.95,
    side: THREE.DoubleSide,
    transparent: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vWaterUv;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vWaterUv = uv;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vWaterUv;`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
float waterEdgeBlend = 1.0 - smoothstep(${edgeBlendStart.toFixed(3)}, ${edgeBlendEnd.toFixed(3)}, vWaterUv.y);
waterEdgeBlend = pow(clamp(waterEdgeBlend, 0.0, 1.0), ${edgeBlendStrength.toFixed(3)});
diffuseColor.a *= waterEdgeBlend;`,
      );
  };

  material.customProgramCacheKey = () =>
    [
      WATER.EDGE_BLEND_START,
      WATER.EDGE_BLEND_END,
      WATER.EDGE_BLEND_STRENGTH,
    ].join("|");

  return material;
};

const createWaterGeometry = () => {
  const geometry = new THREE.PlaneGeometry(
    SURFACE.WIDTH,
    SURFACE.HEIGHT,
    SURFACE.SEGMENTS_X,
    SURFACE.SEGMENTS_Y,
  );

  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.userData.originalPositions = Float32Array.from(
    geometry.attributes.position.array,
  );
  geometry.userData.vertexCount = geometry.attributes.position.count;
  geometry.computeVertexNormals();

  return geometry;
};

// ============================================================================
// 3. LIGHTING
// ============================================================================

const WaterLighting = ({ lighting }) => {
  const keyLightRef = useRef();
  const rimLightRef = useRef();
  const fillLightRef = useRef();

  return (
    <>
      <ambientLight intensity={lighting.AMBIENT_INTENSITY} color="#ffffff" />

      <directionalLight
        ref={keyLightRef}
        position={lighting.KEY_POSITION}
        intensity={lighting.KEY_INTENSITY}
        color="#ffffff"
      />

      <directionalLight
        ref={rimLightRef}
        position={lighting.RIM_POSITION}
        intensity={lighting.RIM_INTENSITY}
        color="#dfe7ff"
      />

      <pointLight
        ref={fillLightRef}
        position={lighting.FILL_POSITION}
        intensity={lighting.KEY_INTENSITY * 0.14}
        color="#ffffff"
      />
    </>
  );
};

// ============================================================================
// 4. WAVES
// ============================================================================

const WAVE_ANGLES = [-0.8, 0.3, 1.05, -1.35, 0.82, -0.18];

const buildWaveLayers = () => {
  const safeCount = Math.max(1, WAVES.WAVE_COUNT);

  return Array.from({ length: safeCount }, (_, index) => {
    const angle = WAVE_ANGLES[index % WAVE_ANGLES.length] + index * 0.11;
    const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));

    return {
      direction,
      phase: index * 1.731,
      largeFrequency:
        WAVES.LARGE_WAVE_SCALE * (0.85 + index * 0.28) * Math.PI * 2,
      smallFrequency:
        WAVES.SMALL_WAVE_SCALE * (0.9 + index * 0.24) * Math.PI * 2,
      drift: 0.75 + index * 0.17,
      weight: 1 / (1 + index * 0.35),
    };
  });
};

const sampleBaseWaves = (x, y, time, waveLayers) => {
  let largeWave = 0;
  let smallWave = 0;
  let weightTotal = 0;

  for (const layer of waveLayers) {
    const directionalSample = x * layer.direction.x + y * layer.direction.y;
    const crossSample = x * layer.direction.y - y * layer.direction.x;
    const driftTime = time * WAVES.SPEED * layer.drift;

    largeWave +=
      Math.sin(
        directionalSample * layer.largeFrequency + driftTime + layer.phase,
      ) * layer.weight;

    smallWave +=
      Math.cos(
        crossSample * layer.smallFrequency - driftTime * 1.6 + layer.phase,
      ) * layer.weight;

    weightTotal += layer.weight;
  }

  const normalizedLarge = largeWave / weightTotal;
  const normalizedSmall = smallWave / weightTotal;

  return (
    WAVES.AMPLITUDE *
    (normalizedLarge * WAVES.LARGE_WAVE_STRENGTH +
      normalizedSmall * WAVES.SMALL_WAVE_STRENGTH * 0.35)
  );
};

// ============================================================================
// 5. INTERACTION
// ============================================================================

const createInteractionState = () => ({
  active: false,
  initialized: false,
  hoverMix: 0,
  timeSinceLastRipple: 0,
  target: new THREE.Vector2(),
  current: new THREE.Vector2(),
  lastRippleOrigin: new THREE.Vector2(),
  ripples: [],
});

const emitRipple = (interactionState, point, strength) => {
  interactionState.ripples.push({
    center: point.clone(),
    age: 0,
    strength,
  });
};

const sampleRippleField = (x, y, interactionState) => {
  let rippleHeight = 0;

  for (const ripple of interactionState.ripples) {
    const distance = Math.hypot(x - ripple.center.x, y - ripple.center.y);
    const travel = ripple.age * (2.1 + WAVES.SPEED * 2.2);
    const radius = Math.max(0.35, INTERACTION.RIPPLE_RADIUS * 0.22);
    const shell = Math.exp(-((distance - travel) ** 2) / (2 * radius * radius));
    const fade = Math.exp(-ripple.age * 1.65);
    const ring = Math.sin(distance * 3.2 - ripple.age * 6.4);

    rippleHeight += shell * ring * fade * ripple.strength * 0.2;
  }

  if (interactionState.hoverMix > 0.001) {
    const hoverDistance = Math.hypot(
      x - interactionState.current.x,
      y - interactionState.current.y,
    );
    const hoverFalloff = Math.max(
      0,
      1 - hoverDistance / INTERACTION.RIPPLE_RADIUS,
    );

    rippleHeight -=
      hoverFalloff *
      hoverFalloff *
      INTERACTION.RIPPLE_STRENGTH *
      0.035 *
      interactionState.hoverMix;
  }

  return rippleHeight;
};

const WaterSurface = ({ pointerStateRef }) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const material = useMemo(() => createWaterMaterial(), []);
  const geometry = useMemo(() => createWaterGeometry(), []);
  const waveLayers = useMemo(() => buildWaveLayers(), []);
  const interactionStateRef = useRef(createInteractionState());

  const surfacePlane = useRef(new THREE.Plane());
  const worldQuaternion = useRef(new THREE.Quaternion());
  const worldNormal = useRef(new THREE.Vector3());
  const worldPoint = useRef(new THREE.Vector3());
  const intersection = useRef(new THREE.Vector3());
  const localPoint = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    const interactionState = interactionStateRef.current;
    const smoothing = 1 - Math.pow(1 - INTERACTION.DAMPING, delta * 60);

    interactionState.hoverMix = THREE.MathUtils.lerp(
      interactionState.hoverMix,
      pointerStateRef.current.active && INTERACTION.ENABLED ? 1 : 0,
      smoothing,
    );

    if (INTERACTION.ENABLED && pointerStateRef.current.active) {
      mesh.getWorldQuaternion(worldQuaternion.current);
      worldNormal.current
        .set(0, 0, 1)
        .applyQuaternion(worldQuaternion.current)
        .normalize();
      mesh.getWorldPosition(worldPoint.current);
      surfacePlane.current.setFromNormalAndCoplanarPoint(
        worldNormal.current,
        worldPoint.current,
      );

      state.raycaster.setFromCamera(state.pointer, state.camera);

      if (
        state.raycaster.ray.intersectPlane(
          surfacePlane.current,
          intersection.current,
        )
      ) {
        localPoint.current.copy(intersection.current);
        mesh.worldToLocal(localPoint.current);

        interactionState.target.set(localPoint.current.x, localPoint.current.y);

        if (!interactionState.initialized) {
          interactionState.current.copy(interactionState.target);
          interactionState.lastRippleOrigin.copy(interactionState.target);
          emitRipple(
            interactionState,
            interactionState.target,
            INTERACTION.RIPPLE_STRENGTH * 0.32,
          );
          interactionState.initialized = true;
        }
      }
    }

    interactionState.current.lerp(interactionState.target, smoothing * 0.9);
    interactionState.timeSinceLastRipple += delta;

    const movementSinceRipple = interactionState.current.distanceTo(
      interactionState.lastRippleOrigin,
    );
    const rippleStep = Math.max(0.2, INTERACTION.RIPPLE_RADIUS * 0.16);

    if (
      INTERACTION.ENABLED &&
      pointerStateRef.current.active &&
      (movementSinceRipple > rippleStep ||
        interactionState.timeSinceLastRipple > 0.24)
    ) {
      const motionBoost = THREE.MathUtils.clamp(
        movementSinceRipple / rippleStep,
        0.6,
        INTERACTION.HOVER_BOOST,
      );

      emitRipple(
        interactionState,
        interactionState.current,
        INTERACTION.RIPPLE_STRENGTH * 0.5 * motionBoost,
      );

      interactionState.lastRippleOrigin.copy(interactionState.current);
      interactionState.timeSinceLastRipple = 0;
    }

    interactionState.ripples = interactionState.ripples.filter((ripple) => {
      ripple.age += delta;
      return ripple.age < 2.4;
    });

    const positions = mesh.geometry.attributes.position.array;
    const originalPositions = mesh.geometry.userData.originalPositions;
    const vertexCount = mesh.geometry.userData.vertexCount;
    const elapsedTime = state.clock.elapsedTime;

    for (let index = 0; index < vertexCount; index += 1) {
      const positionIndex = index * 3;
      const x = originalPositions[positionIndex];
      const y = originalPositions[positionIndex + 1];
      const currentZ = positions[positionIndex + 2];

      const baseWave = sampleBaseWaves(x, y, elapsedTime, waveLayers);
      const rippleWave = sampleRippleField(x, y, interactionState);
      const targetZ = baseWave + rippleWave;

      positions[positionIndex + 2] = THREE.MathUtils.lerp(
        currentZ,
        targetZ,
        smoothing,
      );
    }

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  return (
    <group
      ref={groupRef}
      position={[POSITION.X, POSITION.Y, POSITION.Z]}
      scale={POSITION.SCALE}
      rotation={[
        THREE.MathUtils.degToRad(POSITION.ROTATION_X),
        THREE.MathUtils.degToRad(POSITION.ROTATION_Y),
        THREE.MathUtils.degToRad(POSITION.ROTATION_Z),
      ]}
    >
      <mesh ref={meshRef} geometry={geometry} material={material} />
      <WaterGridHelper />
      <WaterBoundsHelper />
      <MouseRadiusHelper interactionStateRef={interactionStateRef} />
    </group>
  );
};

// ============================================================================
// 6. HELPERS
// ============================================================================

const WaterGridHelper = () => {
  if (!DEBUG.SHOW_GRID) return null;

  return (
    <gridHelper
      args={[SURFACE.WIDTH, 24, "#222222", "#101010"]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -0.03]}
    />
  );
};

const WaterBoundsHelper = () => {
  if (!DEBUG.SHOW_BOUNDS) return null;

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry
        args={[
          SURFACE.WIDTH,
          SURFACE.HEIGHT,
          Math.max(0.16, WAVES.AMPLITUDE * 4),
        ]}
      />
      <meshBasicMaterial color="#1f1f1f" wireframe transparent opacity={0.35} />
    </mesh>
  );
};

const MouseRadiusHelper = ({ interactionStateRef }) => {
  const ringRef = useRef();

  useFrame(() => {
    const ring = ringRef.current;
    if (!ring) return;

    const interactionState = interactionStateRef.current;
    const visible = DEBUG.SHOW_MOUSE_RADIUS && interactionState.hoverMix > 0.01;

    ring.visible = visible;
    if (!visible) return;

    ring.position.set(
      interactionState.current.x,
      interactionState.current.y,
      0.025,
    );
    ring.material.opacity = 0.16 * interactionState.hoverMix;
  });

  if (!DEBUG.SHOW_MOUSE_RADIUS) return null;

  return (
    <mesh ref={ringRef} visible={false}>
      <ringGeometry
        args={[INTERACTION.RIPPLE_RADIUS * 0.9, INTERACTION.RIPPLE_RADIUS, 64]}
      />
      <meshBasicMaterial color="#6a6a6a" transparent opacity={0.16} />
    </mesh>
  );
};

// ============================================================================
// 7. CAMERA
// ============================================================================

const createCameraProps = () => ({
  position: [CAMERA_SETTINGS.X, CAMERA_SETTINGS.Y, CAMERA_SETTINGS.Z],
  fov: CAMERA_SETTINGS.FOV,
  near: 0.1,
  far: 100,
});

// ============================================================================
// 8. COMPONENT
// ============================================================================

const SliderField = ({ label, value, min, max, step, onChange }) => {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr 48px",
        alignItems: "center",
        gap: "10px",
        fontSize: "11px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#d5d1cb",
      }}
    >
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", accentColor: "#f1ede4" }}
      />
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value.toFixed(2)}
      </span>
    </label>
  );
};

const LightVectorControl = ({ label, value, min, max, step, onChange }) => {
  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
        paddingTop: "10px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#f4f1ea",
        }}
      >
        {label}
      </div>
      {AXES.map((axis, index) => (
        <SliderField
          key={`${label}-${axis}`}
          label={`${label} ${axis}`}
          value={value[index]}
          min={min}
          max={max}
          step={step}
          onChange={(nextValue) => onChange(index, nextValue)}
        />
      ))}
    </div>
  );
};

const LightingControlPanel = ({ lighting, setLighting }) => {
  const updateScalar = (key, value) => {
    setLighting((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateVector = (key, axisIndex, axisValue) => {
    setLighting((current) => ({
      ...current,
      [key]: current[key].map((value, index) =>
        index === axisIndex ? axisValue : value,
      ),
    }));
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        width: "min(360px, calc(100vw - 40px))",
        padding: "18px 18px 16px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        background:
          "linear-gradient(180deg, rgba(18, 18, 18, 0.9), rgba(8, 8, 8, 0.82))",
        boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(14px)",
        color: "#f4f1ea",
        zIndex: 2,
      }}
    >
      <div
        style={{
          marginBottom: "12px",
          fontSize: "12px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        Light Controls
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        <SliderField
          label="Ambient"
          value={lighting.AMBIENT_INTENSITY}
          min={0}
          max={2}
          step={0.01}
          onChange={(value) => updateScalar("AMBIENT_INTENSITY", value)}
        />
        <SliderField
          label="Key"
          value={lighting.KEY_INTENSITY}
          min={0}
          max={3}
          step={0.01}
          onChange={(value) => updateScalar("KEY_INTENSITY", value)}
        />
        <SliderField
          label="Rim"
          value={lighting.RIM_INTENSITY}
          min={0}
          max={3}
          step={0.01}
          onChange={(value) => updateScalar("RIM_INTENSITY", value)}
        />
      </div>

      <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
        <LightVectorControl
          label="Key Pos"
          value={lighting.KEY_POSITION}
          min={-10}
          max={10}
          step={0.1}
          onChange={(axisIndex, value) =>
            updateVector("KEY_POSITION", axisIndex, value)
          }
        />
        <LightVectorControl
          label="Rim Pos"
          value={lighting.RIM_POSITION}
          min={-10}
          max={10}
          step={0.1}
          onChange={(axisIndex, value) =>
            updateVector("RIM_POSITION", axisIndex, value)
          }
        />
        <LightVectorControl
          label="Fill Pos"
          value={lighting.FILL_POSITION}
          min={-10}
          max={10}
          step={0.1}
          onChange={(axisIndex, value) =>
            updateVector("FILL_POSITION", axisIndex, value)
          }
        />
      </div>
    </div>
  );
};

const BlackLiquidScene = ({ lighting, pointerStateRef }) => {
  return (
    <>
      <color attach="background" args={["#010101"]} />
      <fog attach="fog" args={["#010101", 12, 28]} />
      <WaterLighting lighting={lighting} />
      <WaterSurface pointerStateRef={pointerStateRef} />
    </>
  );
};

function BlackLiquid() {
  const pointerStateRef = useRef({ active: false });
  const camera = useMemo(() => createCameraProps(), []);
  const [lighting, setLighting] = useState(() => loadLightingState());

  useEffect(() => {
    window.localStorage.setItem(
      LIGHTING_STORAGE_KEY,
      JSON.stringify({
        AMBIENT_INTENSITY: lighting.AMBIENT_INTENSITY,
        KEY_INTENSITY: lighting.KEY_INTENSITY,
        RIM_INTENSITY: lighting.RIM_INTENSITY,
        KEY_POSITION: lighting.KEY_POSITION,
        RIM_POSITION: lighting.RIM_POSITION,
        FILL_POSITION: lighting.FILL_POSITION,
      }),
    );
  }, [lighting]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {lighting.SHOW_CONTROLS ? (
        <LightingControlPanel lighting={lighting} setLighting={setLighting} />
      ) : null}
      <Canvas
        camera={camera}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ width: "100%", height: "100%", display: "block" }}
        onPointerMove={() => {
          pointerStateRef.current.active = true;
        }}
        onPointerLeave={() => {
          pointerStateRef.current.active = false;
        }}
      >
        <BlackLiquidScene
          lighting={lighting}
          pointerStateRef={pointerStateRef}
        />
      </Canvas>
    </div>
  );
}

export default BlackLiquid;
