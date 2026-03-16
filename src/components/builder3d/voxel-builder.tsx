"use client";

import Link from "next/link";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type InstancedMesh, Matrix4, Object3D, Plane, Vector3 } from "three";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BlockMaterialDropdown } from "@/components/builder3d/material-dropdown";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { HelperPanel } from "@/components/pokemon/helper-panel";
import { SectionCard } from "@/components/ui/section-card";
import { sampleBuildings } from "@/data/buildings";
import { blockMaterialLookup, blockMaterials } from "@/data/materials";
import { summarizeMaterials } from "@/lib/materials";
import type {
  BlockMaterialId,
  BuildingData,
  StorageMode,
  VoxelBlock,
} from "@/lib/types";
import { type BuilderMode, useBuilderStore } from "@/store/use-builder-store";

const gridSize = 24;
const maxBuildHeight = 13;
const blockColorSwatches = [
  "#8c99b5",
  "#b97a45",
  "#5e6e8a",
  "#7fd0df",
  "#d36f4c",
  "#8f5f3f",
  "#9ddbf1",
  "#64798f",
  "#a1a7b6",
  "#f0544f",
  "#f5c15f",
  "#f6d46b",
  "#f2a027",
  "#6fc28e",
  "#8f74ff",
];

type CameraPreset = "iso" | "front" | "back" | "left" | "right" | "top";
type VoxelPoint = { x: number; y: number; z: number };
const cameraPresets: readonly CameraPreset[] = [
  "iso",
  "front",
  "back",
  "left",
  "right",
  "top",
];

type BuilderMaterialSlotId =
  | "foundation"
  | "wall"
  | "trim"
  | "roof"
  | "door"
  | "window"
  | "beam"
  | "pillar"
  | "light"
  | "decor";

const builderMaterialSlots: ReadonlyArray<{
  id: BuilderMaterialSlotId;
  label: string;
  description: string;
  defaultMaterial: BlockMaterialId;
}> = [
  {
    id: "foundation",
    label: "Foundation",
    description: "Heavy base material for floors and ground structure.",
    defaultMaterial: "stone",
  },
  {
    id: "wall",
    label: "Wall",
    description: "Main wall block you will place most often.",
    defaultMaterial: "brick",
  },
  {
    id: "trim",
    label: "Trim",
    description: "Accent piece for edges, floors, and frame changes.",
    defaultMaterial: "wood",
  },
  {
    id: "roof",
    label: "Roof",
    description: "Top layer block for caps and sloped roofs.",
    defaultMaterial: "roof",
  },
  {
    id: "door",
    label: "Door",
    description: "Entry piece for fronts, gates, and larger openings.",
    defaultMaterial: "door",
  },
  {
    id: "window",
    label: "Window",
    description: "Window piece for light wells and outer walls.",
    defaultMaterial: "window",
  },
  {
    id: "beam",
    label: "Beam",
    description: "Structural support for workshop and roof framing.",
    defaultMaterial: "beam",
  },
  {
    id: "pillar",
    label: "Pillar",
    description: "Vertical support and facade accent piece.",
    defaultMaterial: "pillar",
  },
  {
    id: "light",
    label: "Light",
    description: "Lantern and lit accent placement piece.",
    defaultMaterial: "light",
  },
  {
    id: "decor",
    label: "Decor",
    description: "Signage, trim, and finishing details.",
    defaultMaterial: "decor",
  },
];

const toolDefinitions: ReadonlyArray<{
  mode: BuilderMode;
  label: string;
  shortcut: string;
  description: string;
}> = [
  {
    mode: "hand",
    label: "Hand",
    shortcut: "H",
    description: "Inspect existing blocks and unlock camera orbit, pan, and zoom.",
  },
  {
    mode: "add",
    label: "Add",
    shortcut: "A",
    description: "Place new blocks with the active material on the current layer.",
  },
  {
    mode: "paint",
    label: "Paint",
    shortcut: "P",
    description: "Recolor or rematerial existing blocks without changing their position.",
  },
  {
    mode: "remove",
    label: "Remove",
    shortcut: "X",
    description: "Delete existing blocks quickly from the current structure.",
  },
  {
    mode: "box",
    label: "Box",
    shortcut: "B",
    description: "Pick two corners to fill a full rectangular volume at once.",
  },
  {
    mode: "wall",
    label: "Wall",
    shortcut: "W",
    description: "Click and drag a wall line, then stack it to the chosen height automatically.",
  },
  {
    mode: "eyedropper",
    label: "Eyedropper",
    shortcut: "E",
    description: "Sample a placed block's material and color back into the active brush.",
  },
];

const toolShortcutLookup: Partial<Record<string, BuilderMode>> = {
  h: "hand",
  a: "add",
  p: "paint",
  x: "remove",
  b: "box",
  w: "wall",
  e: "eyedropper",
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function ToolIcon({
  mode,
  className = "h-5 w-5",
}: {
  mode: BuilderMode;
  className?: string;
}) {
  const sharedProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (mode) {
    case "hand":
      return (
        <svg {...sharedProps}>
          <path d="M7 11.5V5.5a1.5 1.5 0 0 1 3 0v4" />
          <path d="M10 9.5V4.5a1.5 1.5 0 0 1 3 0v5" />
          <path d="M13 9V5.5a1.5 1.5 0 0 1 3 0v6" />
          <path d="M16 10.5V7.5a1.5 1.5 0 0 1 3 0v6.5a6 6 0 0 1-6 6H12a5 5 0 0 1-4.7-3.3L5.6 12A1.5 1.5 0 0 1 8.4 11l1.1 2.2" />
        </svg>
      );
    case "add":
      return (
        <svg {...sharedProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <path d="m6.5 6.5 5.5-3 5.5 3v11l-5.5 3-5.5-3z" />
        </svg>
      );
    case "paint":
      return (
        <svg {...sharedProps}>
          <path d="m14 4 6 6" />
          <path d="m11 7 6 6" />
          <path d="m7 11 6 6" />
          <path d="M5 19c0-1.7 1.3-3 3-3 1.1 0 2 .9 2 2 0 1.7-1.3 3-3 3H5v-2Z" />
          <path d="m10 8 4-4 6 6-4 4" />
        </svg>
      );
    case "remove":
      return (
        <svg {...sharedProps}>
          <path d="M6 12h12" />
          <path d="m6.5 6.5 5.5-3 5.5 3v11l-5.5 3-5.5-3z" />
        </svg>
      );
    case "box":
      return (
        <svg {...sharedProps}>
          <path d="M5 9V5h4" />
          <path d="M15 5h4v4" />
          <path d="M19 15v4h-4" />
          <path d="M9 19H5v-4" />
          <path d="M8 8h8v8H8z" />
        </svg>
      );
    case "wall":
      return (
        <svg {...sharedProps}>
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M7 9V5" />
          <path d="M14 9V5" />
          <path d="M10 15V9" />
          <path d="M17 15V9" />
          <path d="M7 19v-4" />
          <path d="M14 19v-4" />
        </svg>
      );
    case "eyedropper":
      return (
        <svg {...sharedProps}>
          <path d="m14 4 6 6" />
          <path d="m10 8 6 6" />
          <path d="m8 10-4 10 10-4" />
          <path d="M15 5 5 15" />
        </svg>
      );
    default:
      return null;
  }
}

function ToolbarToolButton({
  active,
  description,
  label,
  mode,
  onClick,
  shortcut,
}: {
  active: boolean;
  description: string;
  label: string;
  mode: BuilderMode;
  onClick: () => void;
  shortcut: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (${shortcut})`}
      aria-label={`${label} tool (${shortcut})`}
      className={`group relative flex h-16 w-16 items-center justify-center rounded-[22px] border transition ${
        active
          ? "border-[color:var(--accent)]/70 bg-[color:var(--accent)]/16 text-[color:var(--foreground)] shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
          : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--accent)]/45 hover:bg-[color:var(--accent)]/8"
      }`}
    >
      <ToolIcon mode={mode} className="h-6 w-6" />
      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-bold leading-none text-[color:var(--muted)]">
        {shortcut}
      </span>
      <span className="sr-only">
        {label}: {description}
      </span>
    </button>
  );
}

function buildPreviewBlueprint(building: BuildingData) {
  return {
    ...building,
    blocks: building.blocks.slice(0, 24),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapPointerToLayer(
  event: ThreeEvent<PointerEvent | MouseEvent>,
  layer: number,
) {
  const interactionPlane = new Plane(new Vector3(0, 1, 0), -layer);
  const intersection = new Vector3();
  const point = event.ray.intersectPlane(interactionPlane, intersection);

  if (!point) {
    return null;
  }

  return {
    x: clamp(Math.floor(point.x), 0, gridSize - 1),
    y: layer,
    z: clamp(Math.floor(point.z), 0, gridSize - 1),
  };
}

function getWallLinePoints(start: VoxelPoint, end: VoxelPoint) {
  const points: Array<{ x: number; z: number }> = [];
  const deltaX = Math.abs(end.x - start.x);
  const deltaZ = Math.abs(end.z - start.z);
  const stepX = start.x < end.x ? 1 : -1;
  const stepZ = start.z < end.z ? 1 : -1;
  let error = deltaX - deltaZ;
  let x = start.x;
  let z = start.z;

  while (true) {
    points.push({ x, z });

    if (x === end.x && z === end.z) {
      break;
    }

    const doubled = error * 2;

    if (doubled > -deltaZ) {
      error -= deltaZ;
      x += stepX;
    }

    if (doubled < deltaX) {
      error += deltaX;
      z += stepZ;
    }
  }

  return points;
}

function buildWallPreviewBlocks(
  start: VoxelPoint | null,
  end: VoxelPoint | null,
  height: number,
) {
  if (!start || !end) {
    return [];
  }

  const baseY = clamp(start.y, 0, maxBuildHeight - 1);
  const cappedHeight = Math.max(1, Math.min(maxBuildHeight - baseY, Math.round(height)));
  const topY = baseY + cappedHeight - 1;

  return getWallLinePoints(start, end).flatMap((point) => {
    const previewBlocks: VoxelPoint[] = [];

    for (let y = baseY; y <= topY; y += 1) {
      previewBlocks.push({ x: point.x, y, z: point.z });
    }

    return previewBlocks;
  });
}

function getMajorGuidePositions(size: number, step: number) {
  const positions: number[] = [];

  for (let position = 0; position <= size; position += step) {
    positions.push(position);
  }

  if (positions[positions.length - 1] !== size) {
    positions.push(size);
  }

  return positions;
}

function deriveSceneFocus(blocks: VoxelBlock[]) {
  if (blocks.length === 0) {
    return {
      centerX: gridSize / 2,
      centerY: 2.2,
      centerZ: gridSize / 2,
      footprintSpan: 7,
      heightSpan: 4,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  blocks.forEach((block) => {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    minZ = Math.min(minZ, block.z);
    maxX = Math.max(maxX, block.x);
    maxY = Math.max(maxY, block.y);
    maxZ = Math.max(maxZ, block.z);
  });

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;

  return {
    centerX: (minX + maxX + 1) / 2,
    centerY: (minY + maxY + 1) / 2,
    centerZ: (minZ + maxZ + 1) / 2,
    footprintSpan: Math.max(width, depth, 5),
    heightSpan: Math.max(height, 3),
  };
}

function ColorBlockInstances({
  blocks,
  color,
  mode,
  onInteract,
}: {
  blocks: VoxelBlock[];
  color: string;
  mode: BuilderMode;
  onInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: BuilderMode,
  ) => void;
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const helper = new Object3D();
    const matrix = new Matrix4();

    blocks.forEach((block, index) => {
      helper.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
      helper.updateMatrix();
      matrix.copy(helper.matrix);
      mesh.setMatrixAt(index, matrix);
    });

    mesh.count = blocks.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [blocks]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, blocks.length]}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        const index = event.instanceId;

        if (index === undefined) {
          return;
        }

        const block = blocks[index];

        if (!block) {
          return;
        }

        onInteract(block, event, mode);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} metalness={0.12} roughness={0.78} />
    </instancedMesh>
  );
}

function BlockInstances({
  blocks,
  mode,
  onInteract,
}: {
  blocks: VoxelBlock[];
  mode: BuilderMode;
  onInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: BuilderMode,
  ) => void;
}) {
  const blocksByColor = blocks.reduce<Map<string, VoxelBlock[]>>((lookup, block) => {
    const resolvedColor = block.color || blockMaterialLookup[block.material].color;
    const existing = lookup.get(resolvedColor);

    if (existing) {
      existing.push(block);
      return lookup;
    }

    lookup.set(resolvedColor, [block]);
    return lookup;
  }, new Map<string, VoxelBlock[]>());

  return (
    <>
      {[...blocksByColor.entries()].map(([color, colorBlocks]) => (
        <ColorBlockInstances
          key={`${color}:${colorBlocks.length}`}
          blocks={colorBlocks}
          color={color}
          mode={mode}
          onInteract={onInteract}
        />
      ))}
    </>
  );
}

function SelectedBlockOutline({ block }: { block: VoxelBlock | null }) {
  if (!block) {
    return null;
  }

  return (
    <mesh position={[block.x + 0.5, block.y + 0.5, block.z + 0.5]}>
      <boxGeometry args={[1.08, 1.08, 1.08]} />
      <meshBasicMaterial color="#ff8a3d" wireframe />
    </mesh>
  );
}

function BoxStartMarker({ point }: { point: VoxelPoint | null }) {
  if (!point) {
    return null;
  }

  return (
    <mesh position={[point.x + 0.5, point.y + 0.5, point.z + 0.5]}>
      <boxGeometry args={[1.14, 1.14, 1.14]} />
      <meshBasicMaterial color="#42d3bd" wireframe />
    </mesh>
  );
}

function PreviewBlocks({
  color,
  points,
}: {
  color: string;
  points: VoxelPoint[];
}) {
  if (points.length === 0) {
    return null;
  }

  return (
    <group>
      {points.map((point) => (
        <mesh
          key={`${point.x}:${point.y}:${point.z}`}
          position={[point.x + 0.5, point.y + 0.5, point.z + 0.5]}
        >
          <boxGeometry args={[0.96, 0.96, 0.96]} />
          <meshStandardMaterial color={color} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function MajorGridGuides({ y }: { y: number }) {
  const guidePositions = getMajorGuidePositions(gridSize, 10);

  return (
    <group>
      {guidePositions.map((position) => (
        <mesh
          key={`vertical-${position}`}
          position={[position, y, gridSize / 2]}
          renderOrder={1}
        >
          <boxGeometry args={[0.1, 0.03, gridSize]} />
          <meshBasicMaterial color="#c0d5ff" transparent opacity={0.42} />
        </mesh>
      ))}
      {guidePositions.map((position) => (
        <mesh
          key={`horizontal-${position}`}
          position={[gridSize / 2, y, position]}
          renderOrder={1}
        >
          <boxGeometry args={[gridSize, 0.03, 0.1]} />
          <meshBasicMaterial color="#c0d5ff" transparent opacity={0.42} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({
  centerX,
  centerY,
  centerZ,
  controlsRef,
  footprintSpan,
  heightSpan,
  preset,
}: {
  centerX: number;
  centerY: number;
  centerZ: number;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  footprintSpan: number;
  heightSpan: number;
  preset: CameraPreset;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const diagonalDistance = footprintSpan * 0.9 + 2.8;
    const forwardDistance = footprintSpan * 1.08 + 3.2;
    const verticalLift = Math.max(3.9, heightSpan * 0.76 + 1.9);
    const focusY = centerY + Math.max(0.25, heightSpan * 0.08);
    const viewHeight = Math.max(2.4, centerY + heightSpan * 0.12);

    const presets: Record<CameraPreset, [number, number, number]> = {
      iso: [centerX + diagonalDistance, viewHeight + verticalLift, centerZ + diagonalDistance],
      front: [centerX, viewHeight + verticalLift * 0.4, centerZ + forwardDistance],
      back: [centerX, viewHeight + verticalLift * 0.4, centerZ - forwardDistance],
      left: [centerX - forwardDistance, viewHeight + verticalLift * 0.4, centerZ],
      right: [centerX + forwardDistance, viewHeight + verticalLift * 0.4, centerZ],
      top: [centerX, viewHeight + Math.max(12, heightSpan * 1.85 + 5), centerZ],
    };

    const [x, y, z] = presets[preset];
    camera.position.set(x, y, z);
    camera.lookAt(centerX, focusY, centerZ);
    controlsRef.current?.target.set(centerX, focusY, centerZ);
    controlsRef.current?.update();
  }, [
    camera,
    centerX,
    centerY,
    centerZ,
    controlsRef,
    footprintSpan,
    heightSpan,
    preset,
  ]);

  return null;
}

function BuildScene({
  activeBlockColor,
  activeLayer,
  blocks,
  boxStart,
  cameraPreset,
  mode,
  onBlockInteract,
  onSelectBlock,
  onSurfaceInteract,
  onWallDragEnd,
  onWallDragMove,
  onWallDragStart,
  selectedBlock,
  wallHeight,
  wallPreviewEnd,
  wallPreviewStart,
}: {
  activeBlockColor: string;
  activeLayer: number;
  blocks: VoxelBlock[];
  boxStart: VoxelPoint | null;
  cameraPreset: CameraPreset;
  mode: BuilderMode;
  onBlockInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: BuilderMode,
  ) => void;
  onSelectBlock: (blockId: string | null) => void;
  onSurfaceInteract: (x: number, y: number, z: number) => void;
  onWallDragEnd: (x: number, y: number, z: number) => void;
  onWallDragMove: (x: number, y: number, z: number) => void;
  onWallDragStart: (x: number, y: number, z: number) => void;
  selectedBlock: VoxelBlock | null;
  wallHeight: number;
  wallPreviewEnd: VoxelPoint | null;
  wallPreviewStart: VoxelPoint | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const sceneFocus = deriveSceneFocus(blocks);
  const wallPreviewBlocks = buildWallPreviewBlocks(
    wallPreviewStart,
    wallPreviewEnd,
    wallHeight,
  );
  const cameraUnlocked = mode === "hand";

  return (
    <Canvas
      camera={{ position: [14, 10, 14], fov: 40 }}
      shadows
      className="h-full w-full"
      onPointerMissed={() => onSelectBlock(null)}
    >
      <color attach="background" args={["#09111f"]} />
      <ambientLight intensity={1} />
      <directionalLight
        castShadow
        intensity={1.25}
        position={[18, 22, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <CameraRig
        centerX={sceneFocus.centerX}
        centerY={sceneFocus.centerY}
        centerZ={sceneFocus.centerZ}
        controlsRef={controlsRef}
        footprintSpan={sceneFocus.footprintSpan}
        heightSpan={sceneFocus.heightSpan}
        preset={cameraPreset}
      />
      <gridHelper
        args={[gridSize, gridSize, "#6d87ae", "#22334f"]}
        position={[gridSize / 2, activeLayer, gridSize / 2]}
      />
      <MajorGridGuides y={activeLayer + 0.03} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[gridSize / 2, activeLayer + 0.01, gridSize / 2]}
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          const snappedPoint = snapPointerToLayer(event, activeLayer);

          if (!snappedPoint) {
            return;
          }

          onSurfaceInteract(snappedPoint.x, snappedPoint.y, snappedPoint.z);
        }}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color="#6c94d8" transparent opacity={0.16} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[gridSize / 2, -0.01, gridSize / 2]}
        receiveShadow
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color="#16243a" />
      </mesh>
      {mode === "wall" ? (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[gridSize / 2, maxBuildHeight + 0.35, gridSize / 2]}
          onPointerDown={(event) => {
            event.stopPropagation();
            const snappedPoint = snapPointerToLayer(event, activeLayer);

            if (!snappedPoint) {
              return;
            }

            onWallDragStart(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            const snappedPoint = snapPointerToLayer(event, activeLayer);

            if (!snappedPoint) {
              return;
            }

            onWallDragMove(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            const snappedPoint = snapPointerToLayer(event, activeLayer);

            if (!snappedPoint) {
              return;
            }

            onWallDragEnd(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
        >
          <planeGeometry args={[gridSize, gridSize]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      <BlockInstances blocks={blocks} mode={mode} onInteract={onBlockInteract} />
      <PreviewBlocks color={activeBlockColor} points={wallPreviewBlocks} />
      <SelectedBlockOutline block={selectedBlock} />
      <BoxStartMarker point={boxStart} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={cameraUnlocked}
        enableDamping
        enablePan={cameraUnlocked}
        enableRotate={cameraUnlocked}
        enableZoom={cameraUnlocked}
        maxDistance={72}
        minDistance={4}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

export function VoxelBuilder() {
  const wallDragActiveRef = useRef(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("iso");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [boxStart, setBoxStart] = useState<VoxelPoint | null>(null);
  const [wallPreviewStart, setWallPreviewStart] = useState<VoxelPoint | null>(null);
  const [wallPreviewEnd, setWallPreviewEnd] = useState<VoxelPoint | null>(null);
  const [wallHeight, setWallHeight] = useState(4);
  const [builderPalette, setBuilderPalette] = useState<
    Record<BuilderMaterialSlotId, BlockMaterialId>
  >(() =>
    builderMaterialSlots.reduce(
      (palette, slot) => {
        palette[slot.id] = slot.defaultMaterial;
        return palette;
      },
      {} as Record<BuilderMaterialSlotId, BlockMaterialId>,
    ),
  );
  const name = useBuilderStore((state) => state.name);
  const description = useBuilderStore((state) => state.description);
  const loadedTemplateId = useBuilderStore((state) => state.loadedTemplateId);
  const blocks = useBuilderStore((state) => state.blocks);
  const activeMaterial = useBuilderStore((state) => state.activeMaterial);
  const activeColor = useBuilderStore((state) => state.activeColor);
  const activeLayer = useBuilderStore((state) => state.activeLayer);
  const mode = useBuilderStore((state) => state.mode);
  const setName = useBuilderStore((state) => state.setName);
  const setDescription = useBuilderStore((state) => state.setDescription);
  const setActiveMaterial = useBuilderStore((state) => state.setActiveMaterial);
  const setActiveColor = useBuilderStore((state) => state.setActiveColor);
  const setActiveLayer = useBuilderStore((state) => state.setActiveLayer);
  const setMode = useBuilderStore((state) => state.setMode);
  const loadTemplate = useBuilderStore((state) => state.loadTemplate);
  const addBlock = useBuilderStore((state) => state.addBlock);
  const removeBlock = useBuilderStore((state) => state.removeBlock);
  const paintBlock = useBuilderStore((state) => state.paintBlock);
  const fillBox = useBuilderStore((state) => state.fillBox);
  const buildWall = useBuilderStore((state) => state.buildWall);
  const updateBlockMaterial = useBuilderStore((state) => state.updateBlockMaterial);
  const updateBlockColor = useBuilderStore((state) => state.updateBlockColor);
  const moveBlock = useBuilderStore((state) => state.moveBlock);
  const cloneBlock = useBuilderStore((state) => state.cloneBlock);
  const clearLayer = useBuilderStore((state) => state.clearLayer);
  const clear = useBuilderStore((state) => state.clear);
  const exportBuilding = useBuilderStore((state) => state.exportBuilding);
  const summary = summarizeMaterials(blocks);
  const blueprint = exportBuilding();
  const previewBlueprint = buildPreviewBlueprint(blueprint);
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;
  const maxWallHeight = Math.max(1, maxBuildHeight - activeLayer);
  const effectiveWallHeight = Math.min(wallHeight, maxWallHeight);
  const activeTool =
    toolDefinitions.find((tool) => tool.mode === mode) ?? toolDefinitions[0];

  function resetTransientToolState() {
    setBoxStart(null);
    setWallPreviewStart(null);
    setWallPreviewEnd(null);
    wallDragActiveRef.current = false;
  }

  function selectMode(nextMode: BuilderMode) {
    setMode(nextMode);
    resetTransientToolState();
  }

  function updateBuilderPalette(slotId: BuilderMaterialSlotId, material: BlockMaterialId) {
    setBuilderPalette((current) => ({
      ...current,
      [slotId]: material,
    }));
  }

  function applyPaletteMaterial(slotId: BuilderMaterialSlotId) {
    const material = builderPalette[slotId];
    setActiveMaterial(material);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }

      const nextMode = toolShortcutLookup[event.key.toLowerCase()];

      if (!nextMode) {
        return;
      }

      event.preventDefault();
      setMode(nextMode);
      setBoxStart(null);
      setWallPreviewStart(null);
      setWallPreviewEnd(null);
      wallDragActiveRef.current = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setMode]);

  function commitBoxPoint(point: VoxelPoint) {
    if (!boxStart) {
      setBoxStart(point);
      setActiveLayer(point.y);
      setSelectedBlockId(null);
      return;
    }

    fillBox(boxStart, point);
    setBoxStart(null);
    setSelectedBlockId(`${point.x}:${point.y}:${point.z}`);
  }

  function handleSurfaceAction(x: number, y: number, z: number) {
    if (mode === "hand") {
      setSelectedBlockId(null);
      return;
    }

    if (mode === "wall") {
      return;
    }

    if (mode === "box") {
      commitBoxPoint({ x, y, z });
      return;
    }

    if (mode === "eyedropper") {
      return;
    }

    if (mode === "remove") {
      removeBlock(x, y, z);
      return;
    }

    if (mode === "paint") {
      paintBlock(x, y, z);
      return;
    }

    addBlock(x, y, z);
  }

  function handleBlockInteraction(
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    interactionMode: BuilderMode,
  ) {
    if (interactionMode === "hand") {
      setSelectedBlockId(block.id);
      setActiveLayer(block.y);
      return;
    }

    if (interactionMode === "eyedropper") {
      setSelectedBlockId(block.id);
      setActiveMaterial(block.material);
      setActiveColor(block.color);
      setActiveLayer(block.y);
      return;
    }

    if (interactionMode === "wall") {
      return;
    }

    if (interactionMode === "box") {
      commitBoxPoint({ x: block.x, y: block.y, z: block.z });
      return;
    }

    if (interactionMode === "remove") {
      removeBlock(block.x, block.y, block.z);
      return;
    }

    if (interactionMode === "paint") {
      paintBlock(block.x, block.y, block.z);
      return;
    }

    const normal = event.face?.normal;

    if (!normal) {
      return;
    }

    const nextX = clamp(block.x + Math.round(normal.x), 0, gridSize - 1);
    const nextY = clamp(block.y + Math.round(normal.y), 0, 12);
    const nextZ = clamp(block.z + Math.round(normal.z), 0, gridSize - 1);
    addBlock(nextX, nextY, nextZ);
    setActiveLayer(nextY);
    setSelectedBlockId(`${nextX}:${nextY}:${nextZ}`);
  }

  async function handleSaveBuilding() {
    const response = await fetch("/api/buildings/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: blueprint.name,
        description: blueprint.description,
        data: blueprint,
      }),
    });
    const payload = (await response.json()) as {
      storageMode?: StorageMode;
      error?: string;
    };

    if (response.ok) {
      setSaveMessage(
        payload.storageMode === "database"
          ? "Blueprint saved to PostgreSQL through Prisma."
          : "Blueprint saved to local fallback storage.",
      );
      return;
    }

    setSaveMessage(payload.error ?? "Unable to save building right now.");
  }

  function moveSelected(dx: number, dy: number, dz: number) {
    if (!selectedBlock) {
      return;
    }

    const nextId = moveBlock(selectedBlock.x, selectedBlock.y, selectedBlock.z, dx, dy, dz);

    if (nextId) {
      setSelectedBlockId(nextId);
    }
  }

  function handleWallDragStart(x: number, y: number, z: number) {
    const point = { x, y, z };

    wallDragActiveRef.current = true;
    setBoxStart(null);
    setSelectedBlockId(null);
    setWallPreviewStart(point);
    setWallPreviewEnd(point);
  }

  function handleWallDragMove(x: number, y: number, z: number) {
    if (!wallDragActiveRef.current || !wallPreviewStart) {
      return;
    }

    setWallPreviewEnd({ x, y, z });
  }

  function handleWallDragEnd(x: number, y: number, z: number) {
    if (!wallDragActiveRef.current || !wallPreviewStart) {
      return;
    }

    const end = { x, y, z };

    buildWall(wallPreviewStart, end, effectiveWallHeight);
    wallDragActiveRef.current = false;
    setWallPreviewEnd(end);
    setSelectedBlockId(
      `${end.x}:${Math.min(maxBuildHeight - 1, wallPreviewStart.y + effectiveWallHeight - 1)}:${end.z}`,
    );
    setWallPreviewStart(null);
    setWallPreviewEnd(null);
  }

  function cloneSelected(dx: number, dy: number, dz: number) {
    if (!selectedBlock) {
      return;
    }

    const nextId = cloneBlock(selectedBlock.x, selectedBlock.y, selectedBlock.z, dx, dy, dz);

    if (nextId) {
      setSelectedBlockId(nextId);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Voxel Scene"
        title="3D Builder"
        description="Build setup, tools, and the live voxel scene now share one workspace so you can edit without side-panel scrolling. Press H, A, P, X, B, W, and E to switch tools quickly."
        action={
          <Link
            href="/ai-builder"
            className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
          >
            Open AI Builder
          </Link>
        }
        className="flex min-h-[calc(100vh-5.75rem)] flex-col"
      >
        <div className="mb-4 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)]/88 p-4">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--accent-2)]">
                    Blocks
                  </p>
                  <p className="mt-2 font-display text-2xl text-[color:var(--foreground)]">
                    {summary.totalBlocks}
                  </p>
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--accent-2)]">
                    Layer
                  </p>
                  <p className="mt-2 font-display text-2xl text-[color:var(--foreground)]">
                    Y {activeLayer}
                  </p>
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--accent-2)]">
                    Material
                  </p>
                  <p className="mt-2 font-display text-lg text-[color:var(--foreground)]">
                    {blockMaterialLookup[activeMaterial].displayName}
                  </p>
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--accent-2)]">
                    Color
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{ backgroundColor: activeColor }}
                    />
                    {activeColor.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--muted)]">
                    Template
                  </span>
                  <select
                    value={
                      sampleBuildings.some((building) => building.id === loadedTemplateId)
                        ? loadedTemplateId
                        : ""
                    }
                    onChange={(event) => {
                      loadTemplate(event.target.value);
                      setSelectedBlockId(null);
                      resetTransientToolState();
                    }}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                  >
                    {sampleBuildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--muted)]">
                    Building name
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[color:var(--muted)]">
                    Active layer
                  </span>
                  <span className="rounded-full bg-[color:var(--accent)]/14 px-3 py-1 text-sm font-semibold">
                    Y {activeLayer}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={activeLayer}
                  onChange={(event) => setActiveLayer(Number(event.target.value))}
                  className="mt-3 w-full accent-[color:var(--accent)]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleSaveBuilding}
                  className="rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
                >
                  Save blueprint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setSelectedBlockId(null);
                    resetTransientToolState();
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
                >
                  Clear scene
                </button>
                <button
                  type="button"
                  onClick={() => clearLayer(activeLayer)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
                >
                  Clear layer
                </button>
              </div>
              {saveMessage ? (
                <p className="text-sm leading-6 text-[color:var(--muted)]">{saveMessage}</p>
              ) : null}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_280px]">
              <div className="space-y-4">
                <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
                  <BlockMaterialDropdown
                    label="Active block type"
                    value={activeMaterial}
                    onChange={setActiveMaterial}
                    description="Pick the current block/item to place. The builder still renders it as a solid color based on the selected material."
                  />
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
                    Build palette
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    These manual build slots mirror the AI builder categories so you can keep a full set of building parts ready while working in 3D.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {builderMaterialSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-3"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">
                              {slot.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                              {slot.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyPaletteMaterial(slot.id)}
                            className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                              activeMaterial === builderPalette[slot.id]
                                ? "border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                                : "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]"
                            }`}
                          >
                            Use
                          </button>
                        </div>
                        <BlockMaterialDropdown
                          label={`${slot.label} item`}
                          value={builderPalette[slot.id]}
                          onChange={(material) => {
                            updateBuilderPalette(slot.id, material);
                            setActiveMaterial(material);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-[color:var(--muted)]">
                    Block color
                  </span>
                  <div className="flex items-center gap-2 rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]">
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{ backgroundColor: activeColor }}
                    />
                    {activeColor.toUpperCase()}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {blockColorSwatches.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setActiveColor(swatch)}
                      className={`h-10 rounded-2xl border ${
                        activeColor === swatch
                          ? "border-[color:var(--foreground)] ring-2 ring-[color:var(--foreground)]/30"
                          : "border-[color:var(--line)]"
                      }`}
                      style={{ backgroundColor: swatch }}
                      aria-label={`Select block color ${swatch}`}
                    />
                  ))}
                </div>
                <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[color:var(--surface)] px-4 py-3">
                  <span className="text-sm font-semibold text-[color:var(--muted)]">
                    Custom hex
                  </span>
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(event) => setActiveColor(event.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-xl border border-[color:var(--line)] bg-transparent"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Camera: hand mode only
          </span>
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Hand: inspect + orbit
          </span>
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Wall: click + drag
          </span>
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Grid: bold every 10 tiles
          </span>
        </div>
        <div className="mb-4 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)]/88 p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
                Active tool
              </p>
              <div className="mt-3 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--surface)] text-[color:var(--foreground)]">
                  <ToolIcon mode={activeTool.mode} className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <p className="font-display text-2xl text-[color:var(--foreground)]">
                    {activeTool.label}
                  </p>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    {activeTool.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {toolDefinitions.map((tool) => (
                  <ToolbarToolButton
                    key={tool.mode}
                    active={mode === tool.mode}
                    description={tool.description}
                    label={tool.label}
                    mode={tool.mode}
                    onClick={() => selectMode(tool.mode)}
                    shortcut={tool.shortcut}
                  />
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
                    Camera views
                  </p>
                  <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Hand mode to orbit
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cameraPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCameraPreset(preset)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                        cameraPreset === preset
                          ? "border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                          : "bg-[color:var(--surface-strong)] text-[color:var(--foreground)]"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {toolDefinitions.map((tool) => (
                  <span
                    key={tool.mode}
                    className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]"
                  >
                    {tool.shortcut} {tool.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
              {mode === "wall" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[color:var(--muted)]">
                      Wall height
                    </span>
                    <span className="rounded-full bg-[color:var(--accent)]/14 px-3 py-1 text-sm font-semibold text-[color:var(--foreground)]">
                      {effectiveWallHeight} high
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={maxWallHeight}
                    value={effectiveWallHeight}
                    onChange={(event) => setWallHeight(Number(event.target.value))}
                    className="w-full accent-[color:var(--accent)]"
                  />
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    Click and drag across the grid to raise a wall path from the active layer through all {effectiveWallHeight} levels automatically.
                  </p>
                </div>
              ) : mode === "box" ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
                    Box tool
                  </p>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    {boxStart
                      ? `Box start locked at ${boxStart.x}, ${boxStart.y}, ${boxStart.z}. Click a second point to fill the full volume.`
                      : "Click one corner, then a second point to fill a complete box volume with the active material."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
                    Builder state
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Layer Y {activeLayer}
                    </span>
                    <span className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Material {blockMaterialLookup[activeMaterial].displayName}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    {mode === "hand"
                      ? "Hand mode unlocks orbit controls so you can inspect every side before switching back to a placement tool."
                      : "Placement tools keep the camera locked to prevent the scene from drifting while you draw walls, add blocks, or sample materials."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="min-h-[clamp(560px,72vh,940px)] flex-1 overflow-hidden rounded-[24px] border border-[color:var(--line)]">
          <BuildScene
            activeBlockColor={activeColor}
            activeLayer={activeLayer}
            blocks={blocks}
            boxStart={boxStart}
            cameraPreset={cameraPreset}
            mode={mode}
            onBlockInteract={handleBlockInteraction}
            onSelectBlock={setSelectedBlockId}
            onSurfaceInteract={handleSurfaceAction}
            onWallDragEnd={handleWallDragEnd}
            onWallDragMove={handleWallDragMove}
            onWallDragStart={handleWallDragStart}
            selectedBlock={selectedBlock}
            wallHeight={effectiveWallHeight}
            wallPreviewEnd={wallPreviewEnd}
            wallPreviewStart={wallPreviewStart}
          />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_360px]">
        <SectionCard
          title="Block Inspector"
          description="Selected blocks can be recolored, moved in six directions, or cloned to speed up structural edits."
        >
          {selectedBlock ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--accent-2)]">
                  Selected Block
                </p>
                <p className="mt-2 font-display text-2xl text-[color:var(--foreground)]">
                  {selectedBlock.x}, {selectedBlock.y}, {selectedBlock.z}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  Current material: {blockMaterialLookup[selectedBlock.material].displayName}
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  Change material
                </span>
                <select
                  value={selectedBlock.material}
                  onChange={(event) => {
                    const material = event.target.value as keyof typeof blockMaterialLookup;
                    updateBlockMaterial(
                      selectedBlock.x,
                      selectedBlock.y,
                      selectedBlock.z,
                      material,
                    );
                    setActiveMaterial(material);
                    setActiveColor(selectedBlock.color);
                  }}
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                >
                  {blockMaterials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  Change color
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3">
                  <input
                    type="color"
                    value={selectedBlock.color}
                    onChange={(event) => {
                      updateBlockColor(
                        selectedBlock.x,
                        selectedBlock.y,
                        selectedBlock.z,
                        event.target.value,
                      );
                      setActiveColor(event.target.value);
                    }}
                    className="h-10 w-16 cursor-pointer rounded-xl border border-[color:var(--line)] bg-transparent"
                  />
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    {selectedBlock.color.toUpperCase()}
                  </span>
                </div>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => moveSelected(0, 1, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSelected(0, 0, -1)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  North
                </button>
                <button
                  type="button"
                  onClick={() => moveSelected(0, -1, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => moveSelected(-1, 0, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  West
                </button>
                <button
                  type="button"
                  onClick={() => moveSelected(1, 0, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  East
                </button>
                <button
                  type="button"
                  onClick={() => moveSelected(0, 0, 1)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  South
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => cloneSelected(1, 0, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Clone +X
                </button>
                <button
                  type="button"
                  onClick={() => cloneSelected(0, 1, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Clone +Y
                </button>
                <button
                  type="button"
                  onClick={() => cloneSelected(0, 0, 1)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Clone +Z
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMaterial(selectedBlock.material);
                    setActiveColor(selectedBlock.color);
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Match brush
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeBlock(selectedBlock.x, selectedBlock.y, selectedBlock.z);
                    setSelectedBlockId(null);
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Delete block
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Nothing selected yet. Use the hand tool or eyedropper to inspect the current structure.
            </p>
          )}
        </SectionCard>

        <MaterialsBreakdown
          title="Live Materials"
          materials={summary.materials}
          totalBlocks={summary.totalBlocks}
        />

        <div className="space-y-5">
          <HelperPanel helpers={summary.helpers} />
          <SectionCard
            title="Blueprint Export"
            description="The exported JSON stays lightweight so it can flow into the map planner, persistence layer, and future AI import pipeline."
          >
            <pre className="max-h-[320px] overflow-auto rounded-2xl bg-[color:var(--surface-strong)] p-4 text-xs leading-6 text-[color:var(--foreground)]">
              {JSON.stringify(previewBlueprint, null, 2)}
            </pre>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
