"use client";

import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  type InstancedMesh,
  MOUSE,
  Matrix4,
  Object3D,
  Plane,
  Vector3,
} from "three";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BlockMaterialDropdown } from "@/components/builder3d/material-dropdown";
import { SectionCard } from "@/components/ui/section-card";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { HelperPanel } from "@/components/pokemon/helper-panel";
import { sampleBuildings } from "@/data/buildings";
import { catalogBlockMaterials } from "@/data/catalog-blocks";
import { blockMaterialLookup, blockMaterials } from "@/data/materials";
import { summarizeMaterials } from "@/lib/materials";
import type {
  BlockMaterialId,
  BuildingData,
  StorageMode,
  VoxelBlock,
} from "@/lib/types";
import { type BuilderMode, useBuilderStore } from "@/store/use-builder-store";

const gridSize = 30;
const maxBuildHeight = 20;
const floorLevel = 0;

type CameraPreset = "iso" | "front" | "back" | "left" | "right" | "top";
type VoxelPoint = { x: number; y: number; z: number };
type BuilderPointerEvent = ThreeEvent<PointerEvent | MouseEvent>;
const cameraPresets: readonly CameraPreset[] = [
  "iso",
  "front",
  "back",
  "left",
  "right",
  "top",
];

type BuilderMaterialSlotId = "block" | "roof" | "door" | "window";

const builderMaterialSlots: ReadonlyArray<{
  id: BuilderMaterialSlotId;
  label: string;
  description: string;
  defaultMaterial: BlockMaterialId;
}> = [
  {
    id: "block",
    label: "Block Type",
    description:
      "Main building block list with all solid materials and placeable block-style items.",
    defaultMaterial: "wooden-wall",
  },
  {
    id: "roof",
    label: "Roof Type",
    description:
      "Choose the roof piece your build palette can switch to while editing.",
    defaultMaterial: "roof",
  },
  {
    id: "door",
    label: "Door Type",
    description: "Pick the door style available to your active build palette.",
    defaultMaterial: "door",
  },
  {
    id: "window",
    label: "Window Type",
    description:
      "Pick the window option available to your active build palette.",
    defaultMaterial: "window",
  },
];

function getPaletteMaterials(slotId: BuilderMaterialSlotId) {
  switch (slotId) {
    case "block":
      return catalogBlockMaterials;
    case "roof":
      return blockMaterials.filter(
        (m) => m.id === "roof" || m.id.startsWith("roof-"),
      );
    case "door":
      return blockMaterials.filter(
        (m) => m.id === "door" || m.id.startsWith("door-"),
      );
    case "window":
      return blockMaterials.filter(
        (m) => m.id === "window" || m.id.startsWith("window-"),
      );
    default:
      return blockMaterials;
  }
}

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
    description:
      "Inspect existing blocks and unlock camera orbit, pan, and zoom.",
  },
  {
    mode: "add",
    label: "Add",
    shortcut: "A",
    description:
      "Place new blocks on the floor or directly against the face you click.",
  },
  {
    mode: "paint",
    label: "Paint",
    shortcut: "P",
    description:
      "Recolor or rematerial existing blocks without changing their position.",
  },
  {
    mode: "remove",
    label: "Remove",
    shortcut: "R",
    description: "Delete existing blocks quickly from the current structure.",
  },
  {
    mode: "box",
    label: "Box",
    shortcut: "B",
    description: "Pick two corners to fill a full rectangular volume at once.",
  },
  {
    mode: "frame",
    label: "Frame",
    shortcut: "F",
    description:
      "Pick two corners to build a hollow square wall frame (perimeter only).",
  },
  {
    mode: "wall",
    label: "Wall",
    shortcut: "W",
    description:
      "Click and drag a wall line, then stack it to the chosen height automatically.",
  },
  {
    mode: "eyedropper",
    label: "Eyedropper",
    shortcut: "E",
    description:
      "Sample a placed block's material and color back into the active brush.",
  },
];

const toolShortcutLookup: Partial<Record<string, BuilderMode>> = {
  h: "hand",
  a: "add",
  p: "paint",
  r: "remove",
  b: "box",
  f: "frame",
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

function DisclosureChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
      className={`group flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition ${
        active
          ? "border-[color:var(--accent)]/70 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
          : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--accent)]/45 hover:bg-[color:var(--accent)]/8"
      }`}
    >
      <ToolIcon mode={mode} className="h-4 w-4 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">
        {label}
      </span>
      <span className="ml-auto rounded-full bg-[color:var(--surface-strong)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
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

function snapPointerToPlane(event: BuilderPointerEvent, y: number) {
  const interactionPlane = new Plane(new Vector3(0, 1, 0), -y);
  const intersection = new Vector3();
  const point = event.ray.intersectPlane(interactionPlane, intersection);

  if (!point) {
    return null;
  }

  return {
    x: clamp(Math.floor(point.x), 0, gridSize - 1),
    y: clamp(Math.round(y), floorLevel, maxBuildHeight - 1),
    z: clamp(Math.floor(point.z), 0, gridSize - 1),
  };
}

function getPlacementPointFromBlock(
  block: VoxelBlock,
  event: BuilderPointerEvent,
) {
  const normal = event.face?.normal;

  if (!normal) {
    const centerX = block.x + 0.5;
    const centerY = block.y + 0.5;
    const centerZ = block.z + 0.5;
    const deltaX = event.point.x - centerX;
    const deltaY = event.point.y - centerY;
    const deltaZ = event.point.z - centerZ;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const absZ = Math.abs(deltaZ);

    if (absX >= absY && absX >= absZ) {
      return {
        x: clamp(block.x + Math.sign(deltaX || 1), 0, gridSize - 1),
        y: block.y,
        z: block.z,
      };
    }

    if (absZ >= absX && absZ >= absY) {
      return {
        x: block.x,
        y: block.y,
        z: clamp(block.z + Math.sign(deltaZ || 1), 0, gridSize - 1),
      };
    }

    return {
      x: block.x,
      y: clamp(
        block.y + Math.sign(deltaY || 1),
        floorLevel,
        maxBuildHeight - 1,
      ),
      z: block.z,
    };
  }

  return {
    x: clamp(block.x + Math.round(normal.x), 0, gridSize - 1),
    y: clamp(block.y + Math.round(normal.y), floorLevel, maxBuildHeight - 1),
    z: clamp(block.z + Math.round(normal.z), 0, gridSize - 1),
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
  const cappedHeight = Math.max(
    1,
    Math.min(maxBuildHeight - baseY, Math.round(height)),
  );
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
    event: BuilderPointerEvent,
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
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

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
    event: BuilderPointerEvent,
    mode: BuilderMode,
  ) => void;
}) {
  const blocksByColor = blocks.reduce<Map<string, VoxelBlock[]>>(
    (lookup, block) => {
      const resolvedColor =
        block.color || blockMaterialLookup[block.material].color;
      const existing = lookup.get(resolvedColor);

      if (existing) {
        existing.push(block);
        return lookup;
      }

      lookup.set(resolvedColor, [block]);
      return lookup;
    },
    new Map<string, VoxelBlock[]>(),
  );

  return (
    <>
      {[...blocksByColor.entries()].map(([color, colorBlocks]) => (
        <ColorBlockInstances
          key={color}
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
      iso: [
        centerX + diagonalDistance,
        viewHeight + verticalLift,
        centerZ + diagonalDistance,
      ],
      front: [
        centerX,
        viewHeight + verticalLift * 0.4,
        centerZ + forwardDistance,
      ],
      back: [
        centerX,
        viewHeight + verticalLift * 0.4,
        centerZ - forwardDistance,
      ],
      left: [
        centerX - forwardDistance,
        viewHeight + verticalLift * 0.4,
        centerZ,
      ],
      right: [
        centerX + forwardDistance,
        viewHeight + verticalLift * 0.4,
        centerZ,
      ],
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
  activeLayer,
  activeBlockColor,
  blocks,
  boxStart,
  frameStart,
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
  activeLayer: number;
  activeBlockColor: string;
  blocks: VoxelBlock[];
  boxStart: VoxelPoint | null;
  frameStart: VoxelPoint | null;
  cameraPreset: CameraPreset;
  mode: BuilderMode;
  onBlockInteract: (
    block: VoxelBlock,
    event: BuilderPointerEvent,
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
  const draftPlaneY = clamp(
    wallPreviewStart?.y ?? frameStart?.y ?? boxStart?.y ?? activeLayer,
    floorLevel,
    maxBuildHeight - 1,
  );
  const cameraUnlocked = mode === "hand";
  const mouseButtons = cameraUnlocked
    ? {
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }
    : {
        RIGHT: MOUSE.ROTATE,
      };

  return (
    <Canvas
      camera={{ position: [14, 10, 14], fov: 40 }}
      shadows
      className="h-full w-full"
      onPointerMissed={(event) => {
        if (event.button === 0) {
          onSelectBlock(null);
        }
      }}
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
        position={[gridSize / 2, floorLevel, gridSize / 2]}
      />
      <MajorGridGuides y={activeLayer + 0.03} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[gridSize / 2, activeLayer + 0.01, gridSize / 2]}
        receiveShadow
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          event.stopPropagation();
          const snappedPoint = snapPointerToPlane(event, activeLayer);

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
          position={[gridSize / 2, draftPlaneY + 0.02, gridSize / 2]}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }

            event.stopPropagation();
            const snappedPoint = snapPointerToPlane(event, draftPlaneY);

            if (!snappedPoint) {
              return;
            }

            onWallDragStart(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) {
              return;
            }

            event.stopPropagation();
            const snappedPoint = snapPointerToPlane(event, draftPlaneY);

            if (!snappedPoint) {
              return;
            }

            onWallDragMove(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
          onPointerUp={(event) => {
            if (event.button !== 0) {
              return;
            }

            event.stopPropagation();
            const snappedPoint = snapPointerToPlane(event, draftPlaneY);

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
      {mode === "box" && boxStart ? (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[gridSize / 2, draftPlaneY + 0.02, gridSize / 2]}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }

            event.stopPropagation();
            const snappedPoint = snapPointerToPlane(event, draftPlaneY);

            if (!snappedPoint) {
              return;
            }

            onSurfaceInteract(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
        >
          <planeGeometry args={[gridSize, gridSize]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {mode === "frame" && frameStart ? (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[gridSize / 2, draftPlaneY + 0.02, gridSize / 2]}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }

            event.stopPropagation();
            const snappedPoint = snapPointerToPlane(event, draftPlaneY);

            if (!snappedPoint) {
              return;
            }

            onSurfaceInteract(snappedPoint.x, snappedPoint.y, snappedPoint.z);
          }}
        >
          <planeGeometry args={[gridSize, gridSize]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      <BlockInstances
        blocks={blocks}
        mode={mode}
        onInteract={onBlockInteract}
      />
      <PreviewBlocks color={activeBlockColor} points={wallPreviewBlocks} />
      <SelectedBlockOutline block={selectedBlock} />
      <BoxStartMarker point={boxStart} />
      <BoxStartMarker point={frameStart} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled
        enableDamping
        enablePan={cameraUnlocked}
        enableRotate
        enableZoom={cameraUnlocked}
        mouseButtons={mouseButtons}
        maxDistance={72}
        minDistance={20}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

export function VoxelBuilder() {
  const wallDragActiveRef = useRef(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("iso");
  const [activeLayer, setActiveLayer] = useState(floorLevel);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [boxStart, setBoxStart] = useState<VoxelPoint | null>(null);
  const [frameStart, setFrameStart] = useState<VoxelPoint | null>(null);
  const [wallPreviewStart, setWallPreviewStart] = useState<VoxelPoint | null>(
    null,
  );
  const [wallPreviewEnd, setWallPreviewEnd] = useState<VoxelPoint | null>(null);
  const [wallHeight, setWallHeight] = useState(4);
  const [paletteExpanded, setPaletteExpanded] = useState(false);
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
  const loadedTemplateId = useBuilderStore((state) => state.loadedTemplateId);
  const blocks = useBuilderStore((state) => state.blocks);
  const activeMaterial = useBuilderStore((state) => state.activeMaterial);
  const activeColor = useBuilderStore((state) => state.activeColor);
  const mode = useBuilderStore((state) => state.mode);
  const setName = useBuilderStore((state) => state.setName);
  const setActiveMaterial = useBuilderStore((state) => state.setActiveMaterial);
  const setActiveColor = useBuilderStore((state) => state.setActiveColor);
  const setMode = useBuilderStore((state) => state.setMode);
  const loadTemplate = useBuilderStore((state) => state.loadTemplate);
  const addBlock = useBuilderStore((state) => state.addBlock);
  const removeBlock = useBuilderStore((state) => state.removeBlock);
  const paintBlock = useBuilderStore((state) => state.paintBlock);
  const fillBox = useBuilderStore((state) => state.fillBox);
  const fillFrame = useBuilderStore((state) => state.fillFrame);
  const buildWall = useBuilderStore((state) => state.buildWall);
  const clear = useBuilderStore((state) => state.clear);
  const exportBuilding = useBuilderStore((state) => state.exportBuilding);
  const pushSnapshot = useBuilderStore((state) => state.pushSnapshot);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const past = useBuilderStore((state) => state.past);
  const future = useBuilderStore((state) => state.future);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const summary = summarizeMaterials(blocks);
  const blueprint = exportBuilding();
  const previewBlueprint = buildPreviewBlueprint(blueprint);
  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? null;
  const availableWallHeight = wallPreviewStart
    ? Math.max(1, maxBuildHeight - wallPreviewStart.y)
    : maxBuildHeight;
  const effectiveWallHeight = Math.min(wallHeight, availableWallHeight);
  const activeTool =
    toolDefinitions.find((tool) => tool.mode === mode) ?? toolDefinitions[0];
  const activePaletteMaterials = builderMaterialSlots.reduce<
    typeof blockMaterials
  >((materials, slot) => {
    const materialId = builderPalette[slot.id];
    const material = blockMaterialLookup[materialId];

    if (!materials.some((entry) => entry.id === material.id)) {
      materials.push(material);
    }

    return materials;
  }, []);
  const activePaletteMaterialIds = activePaletteMaterials.map(
    (material) => material.id,
  );

  function resetTransientToolState() {
    setBoxStart(null);
    setFrameStart(null);
    setWallPreviewStart(null);
    setWallPreviewEnd(null);
    wallDragActiveRef.current = false;
  }

  function selectMode(nextMode: BuilderMode) {
    setMode(nextMode);
    resetTransientToolState();
  }

  function updateBuilderPalette(
    slotId: BuilderMaterialSlotId,
    material: BlockMaterialId,
  ) {
    setBuilderPalette((current) => ({
      ...current,
      [slotId]: material,
    }));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        if (event.key.toLowerCase() === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
          return;
        }

        if (
          event.key.toLowerCase() === "y" ||
          (event.key.toLowerCase() === "z" && event.shiftKey)
        ) {
          event.preventDefault();
          redo();
          return;
        }

        return;
      }

      if (event.altKey) {
        return;
      }

      if (event.key === "[" || event.key === "{") {
        event.preventDefault();
        setActiveLayer((current) =>
          clamp(current - 1, floorLevel, maxBuildHeight - 1),
        );
        return;
      }

      if (event.key === "]" || event.key === "}") {
        event.preventDefault();
        setActiveLayer((current) =>
          clamp(current + 1, floorLevel, maxBuildHeight - 1),
        );
        return;
      }

      const nextMode = toolShortcutLookup[event.key.toLowerCase()];

      if (!nextMode) {
        return;
      }

      event.preventDefault();
      setMode(nextMode);
      setBoxStart(null);
      setFrameStart(null);
      setWallPreviewStart(null);
      setWallPreviewEnd(null);
      wallDragActiveRef.current = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setMode, undo, redo]);

  useEffect(() => {
    if (
      activePaletteMaterialIds.length > 0 &&
      !activePaletteMaterialIds.includes(activeMaterial)
    ) {
      setActiveMaterial(activePaletteMaterialIds[0]);
    }
  }, [activeMaterial, activePaletteMaterialIds, setActiveMaterial]);

  function commitBoxPoint(point: VoxelPoint) {
    if (!boxStart) {
      setBoxStart(point);
      setSelectedBlockId(null);
      return;
    }

    pushSnapshot();
    fillBox(boxStart, point);
    setBoxStart(null);
    setSelectedBlockId(`${point.x}:${point.y}:${point.z}`);
  }

  function commitFramePoint(point: VoxelPoint) {
    if (!frameStart) {
      setFrameStart(point);
      setSelectedBlockId(null);
      return;
    }

    pushSnapshot();
    fillFrame(frameStart, point);
    setFrameStart(null);
    setSelectedBlockId(`${point.x}:${point.y}:${point.z}`);
  }

  function handleSurfaceAction(x: number, y: number, z: number) {
    const layerY = clamp(activeLayer, floorLevel, maxBuildHeight - 1);

    if (mode === "hand") {
      setSelectedBlockId(null);
      return;
    }

    if (mode === "wall") {
      return;
    }

    if (mode === "box") {
      commitBoxPoint({ x, y: layerY, z });
      return;
    }

    if (mode === "frame") {
      commitFramePoint({ x, y: layerY, z });
      return;
    }

    if (mode === "eyedropper") {
      return;
    }

    if (mode === "remove") {
      pushSnapshot();
      removeBlock(x, layerY, z);
      return;
    }

    if (mode === "paint") {
      pushSnapshot();
      paintBlock(x, layerY, z);
      return;
    }

    pushSnapshot();
    addBlock(x, layerY, z);
    setSelectedBlockId(`${x}:${layerY}:${z}`);
  }

  function handleBlockInteraction(
    block: VoxelBlock,
    event: BuilderPointerEvent,
    interactionMode: BuilderMode,
  ) {
    const layerY = clamp(activeLayer, floorLevel, maxBuildHeight - 1);

    if (interactionMode === "hand") {
      setSelectedBlockId(block.id);
      setActiveLayer(block.y);
      return;
    }

    if (interactionMode === "eyedropper") {
      setSelectedBlockId(block.id);
      setActiveLayer(block.y);
      setActiveMaterial(block.material);
      setActiveColor(block.color);
      return;
    }

    if (interactionMode === "box") {
      const point = getPlacementPointFromBlock(block, event);
      commitBoxPoint({ ...point, y: layerY });
      return;
    }

    if (interactionMode === "frame") {
      const point = getPlacementPointFromBlock(block, event);
      commitFramePoint({ ...point, y: layerY });
      return;
    }

    if (interactionMode === "wall") {
      const point = getPlacementPointFromBlock(block, event);
      const snappedLayerPoint = { ...point, y: layerY };

      if (!wallPreviewStart) {
        handleWallDragStart(
          snappedLayerPoint.x,
          snappedLayerPoint.y,
          snappedLayerPoint.z,
        );
      } else {
        handleWallDragEnd(
          snappedLayerPoint.x,
          snappedLayerPoint.y,
          snappedLayerPoint.z,
        );
      }
      return;
    }

    if (interactionMode === "remove") {
      if (block.y !== layerY) {
        return;
      }

      pushSnapshot();
      removeBlock(block.x, block.y, block.z);
      return;
    }

    if (interactionMode === "paint") {
      if (block.y !== layerY) {
        return;
      }

      pushSnapshot();
      paintBlock(block.x, block.y, block.z);
      return;
    }

    const sensedPoint = getPlacementPointFromBlock(block, event);
    const nextX = sensedPoint.x;
    const nextY = layerY;
    const nextZ = sensedPoint.z;
    pushSnapshot();
    addBlock(nextX, nextY, nextZ);
    setSelectedBlockId(`${nextX}:${nextY}:${nextZ}`);
  }

  async function handleSaveBuilding() {
    try {
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
    } catch {
      setSaveMessage("Save failed — check your connection and try again.");
    }
  }

  function handleWallDragStart(x: number, y: number, z: number) {
    const point = {
      x,
      y: clamp(activeLayer, floorLevel, maxBuildHeight - 1),
      z,
    };

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

    setWallPreviewEnd({
      x,
      y: clamp(activeLayer, floorLevel, maxBuildHeight - 1),
      z,
    });
  }

  function handleWallDragEnd(x: number, y: number, z: number) {
    if (!wallDragActiveRef.current || !wallPreviewStart) {
      return;
    }

    const end = { x, y: clamp(activeLayer, floorLevel, maxBuildHeight - 1), z };

    pushSnapshot();
    buildWall(wallPreviewStart, end, effectiveWallHeight);
    wallDragActiveRef.current = false;
    setWallPreviewEnd(end);
    setSelectedBlockId(
      `${end.x}:${Math.min(maxBuildHeight - 1, wallPreviewStart.y + effectiveWallHeight - 1)}:${end.z}`,
    );
    setWallPreviewStart(null);
    setWallPreviewEnd(null);
  }

  return (
    <div className="space-y-5">
      <section className="flex h-[auto] w-[auto] flex-col rounded-[28px] border border-[color:var(--line)] bg-[color:var(--card)]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur">
        {/* Toolbar row */}
        <div className="mb-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)]/88 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-strong)] text-[color:var(--foreground)]">
                <ToolIcon mode={activeTool.mode} className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {activeTool.label}
                </p>
                <p className="text-xs leading-4 text-[color:var(--muted)]">
                  {activeTool.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Camera:
              </span>
              {cameraPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    cameraPreset === preset
                      ? "border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                      : "bg-[color:var(--surface-strong)] text-[color:var(--foreground)] hover:bg-[color:var(--accent)]/8"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[color:var(--surface-strong)] px-2.5 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Layer Shortcuts <br />
                Down = [ <br />
                Up = ]
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveLayer((current) =>
                    clamp(current - 1, floorLevel, maxBuildHeight - 1),
                  )
                }
                className="h-6 w-6 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] text-sm font-semibold text-[color:var(--foreground)]"
                aria-label="Decrease active layer"
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-xs font-semibold text-[color:var(--foreground)]">
                {activeLayer}
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveLayer((current) =>
                    clamp(current + 1, floorLevel, maxBuildHeight - 1),
                  )
                }
                className="h-6 w-6 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] text-sm font-semibold text-[color:var(--foreground)]"
                aria-label="Increase active layer"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
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
            {mode === "wall" ? (
              <div className="ml-2 flex items-center gap-3 rounded-2xl bg-[color:var(--surface-strong)] px-3 py-1.5">
                <span className="text-xs font-semibold text-[color:var(--muted)]">
                  Height
                </span>
                <span className="rounded-full bg-[color:var(--accent)]/14 px-2 py-0.5 text-xs font-semibold text-[color:var(--foreground)]">
                  {effectiveWallHeight}
                </span>
                <input
                  type="range"
                  min={1}
                  max={availableWallHeight}
                  value={effectiveWallHeight}
                  onChange={(event) =>
                    setWallHeight(Number(event.target.value))
                  }
                  className="w-24 accent-[color:var(--accent)]"
                />
              </div>
            ) : mode === "box" && boxStart ? (
              <span className="ml-2 self-center text-xs text-[color:var(--muted)]">
                Corner locked at {boxStart.x}, {boxStart.y}, {boxStart.z} —
                click second point
              </span>
            ) : null}
          </div>
        </div>

        {/* Canvas + Sidebar */}
        <div className="flex min-h-0 flex-1 gap-3">
          {/* 3D Canvas */}
          <div className="min-h-[600px] flex-1 overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[#09111f]">
            <BuildScene
              activeLayer={activeLayer}
              activeBlockColor={activeColor}
              blocks={blocks}
              boxStart={boxStart}
              frameStart={frameStart}
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

          {/* Right sidebar */}
          <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto">
            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[color:var(--surface-strong)] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent-2)]">
                  Blocks
                </p>
                <p className="mt-0.5 font-display text-xl text-[color:var(--foreground)]">
                  {summary.totalBlocks}
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface-strong)] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent-2)]">
                  Materials
                </p>
                <p className="mt-0.5 font-display text-xl text-[color:var(--foreground)]">
                  {summary.materials.length}
                </p>
              </div>
            </div>

            {/* Block color */}
            <div className="rounded-2xl bg-[color:var(--surface-strong)] px-3 py-3">
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[color:var(--muted)]">
                  Block color
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded-full border border-black/20"
                    style={{ backgroundColor: activeColor }}
                  />
                  <span className="text-[10px] font-semibold text-[color:var(--foreground)]">
                    {activeColor.toUpperCase()}
                  </span>
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(event) => setActiveColor(event.target.value)}
                    className="h-7 w-10 cursor-pointer rounded-lg border border-[color:var(--line)] bg-transparent"
                  />
                </div>
              </label>
            </div>

            {/* Active material */}
            <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-3">
              <BlockMaterialDropdown
                label="Active block type"
                value={activeMaterial}
                onChange={setActiveMaterial}
                description="Place from the materials currently chosen in your Build Palette."
                materials={activePaletteMaterials}
              />
            </div>

            {/* Build palette (collapsible) */}
            <div className="rounded-2xl bg-[color:var(--surface-strong)] px-3 py-3">
              <button
                type="button"
                onClick={() => setPaletteExpanded((current) => !current)}
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={paletteExpanded}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-2)]">
                  Build palette
                </span>
                <DisclosureChevron open={paletteExpanded} />
              </button>
              {paletteExpanded ? (
                <div className="mt-3 grid gap-3">
                  {builderMaterialSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2"
                    >
                      <BlockMaterialDropdown
                        label={slot.label}
                        value={builderPalette[slot.id]}
                        onChange={(material) => {
                          updateBuilderPalette(slot.id, material);
                          setActiveMaterial(material);
                        }}
                        description={slot.description}
                        materials={getPaletteMaterials(slot.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {builderMaterialSlots.map((slot) => {
                    const material =
                      blockMaterialLookup[builderPalette[slot.id]];
                    return (
                      <span
                        key={slot.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface)] px-2 py-1 text-[10px] font-semibold text-[color:var(--foreground)]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: material.color }}
                        />
                        {slot.label.replace(" Type", "")}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Template + name */}
            <div className="rounded-2xl bg-[color:var(--surface-strong)] px-3 py-3 space-y-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Template
                </span>
                <select
                  value={
                    sampleBuildings.some(
                      (building) => building.id === loadedTemplateId,
                    )
                      ? loadedTemplateId
                      : ""
                  }
                  onChange={(event) => {
                    loadTemplate(event.target.value);
                    setSelectedBlockId(null);
                    resetTransientToolState();
                  }}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
                >
                  {sampleBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Building name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
                />
              </label>
            </div>

            {/* Save / clear */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => undo()}
                disabled={!canUndo}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-xs font-semibold text-[color:var(--foreground)] disabled:opacity-35"
                title="Undo (Ctrl+Z)"
              >
                ↩ Undo
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!canRedo}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2.5 text-xs font-semibold text-[color:var(--foreground)] disabled:opacity-35"
                title="Redo (Ctrl+Y)"
              >
                ↪ Redo
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setSelectedBlockId(null);
                  resetTransientToolState();
                }}
                className="col-span-2 rounded-2xl border border-[color:var(--foreground)]/20 bg-[color:var(--surface-strong)] px-3 py-2.5 text-xs font-semibold text-[color:var(--foreground)]"
              >
                + New
              </button>
              <button
                type="button"
                onClick={handleSaveBuilding}
                className="rounded-2xl border border-[color:var(--foreground)]/30 bg-[color:var(--accent)]/16 px-3 py-2.5 text-xs font-semibold text-[color:var(--foreground)]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setSelectedBlockId(null);
                  resetTransientToolState();
                }}
                className="rounded-2xl bg-[color:var(--surface-strong)] px-3 py-2.5 text-xs font-semibold text-[color:var(--foreground)]"
              >
                Clear scene
              </button>
            </div>
            {saveMessage ? (
              <p className="text-xs leading-5 text-[color:var(--muted)]">
                {saveMessage}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <MaterialsBreakdown
          title="Live Materials"
          description="Every material currently used in the build is tracked here in a wider two-column checklist."
          materials={summary.materials}
          totalBlocks={summary.totalBlocks}
          listClassName="grid gap-3 xl:grid-cols-2"
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
