"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  Color,
  type InstancedMesh,
  Matrix4,
  Object3D,
} from "three";
import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { HelperPanel } from "@/components/pokemon/helper-panel";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { SectionCard } from "@/components/ui/section-card";
import { sampleBuildings } from "@/data/buildings";
import { blockMaterials, blockMaterialLookup } from "@/data/materials";
import { summarizeMaterials } from "@/lib/materials";
import type { BuildingData, VoxelBlock } from "@/lib/types";
import { useBuilderStore } from "@/store/use-builder-store";

const gridSize = 24;
const maxInstances = 12000;

function buildPreviewBlueprint(building: BuildingData) {
  return {
    ...building,
    blocks: building.blocks.slice(0, 24),
  };
}

function BlockInstances({
  blocks,
  mode,
  onInteract,
}: {
  blocks: VoxelBlock[];
  mode: "add" | "remove" | "paint";
  onInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: "add" | "remove" | "paint",
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
      mesh.setColorAt(index, new Color(blockMaterialLookup[block.material].color));
    });

    mesh.count = blocks.length;
    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [blocks]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxInstances]}
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
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  );
}

function BuildScene({
  activeLayer,
  blocks,
  mode,
  onAddFromSurface,
  onBlockInteract,
}: {
  activeLayer: number;
  blocks: VoxelBlock[];
  mode: "add" | "remove" | "paint";
  onAddFromSurface: (x: number, z: number) => void;
  onBlockInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: "add" | "remove" | "paint",
  ) => void;
}) {
  return (
    <Canvas
      camera={{ position: [18, 16, 18], fov: 42 }}
      shadows
      className="h-full w-full"
    >
      <color attach="background" args={["#f4eee0"]} />
      <ambientLight intensity={1} />
      <directionalLight
        castShadow
        intensity={1.2}
        position={[20, 24, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <gridHelper args={[gridSize, gridSize, "#9eb1cf", "#d1d9e9"]} position={[gridSize / 2, activeLayer, gridSize / 2]} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[gridSize / 2, activeLayer + 0.01, gridSize / 2]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          const x = Math.max(0, Math.min(gridSize - 1, Math.floor(event.point.x)));
          const z = Math.max(0, Math.min(gridSize - 1, Math.floor(event.point.z)));
          onAddFromSurface(x, z);
        }}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color="#375e8f" transparent opacity={0.12} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[gridSize / 2, -0.01, gridSize / 2]}
        receiveShadow
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color="#d4c29a" />
      </mesh>
      <BlockInstances blocks={blocks} mode={mode} onInteract={onBlockInteract} />
      <OrbitControls makeDefault />
    </Canvas>
  );
}

export function VoxelBuilder() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const name = useBuilderStore((state) => state.name);
  const description = useBuilderStore((state) => state.description);
  const loadedTemplateId = useBuilderStore((state) => state.loadedTemplateId);
  const blocks = useBuilderStore((state) => state.blocks);
  const activeMaterial = useBuilderStore((state) => state.activeMaterial);
  const activeLayer = useBuilderStore((state) => state.activeLayer);
  const mode = useBuilderStore((state) => state.mode);
  const setName = useBuilderStore((state) => state.setName);
  const setDescription = useBuilderStore((state) => state.setDescription);
  const setActiveMaterial = useBuilderStore((state) => state.setActiveMaterial);
  const setActiveLayer = useBuilderStore((state) => state.setActiveLayer);
  const setMode = useBuilderStore((state) => state.setMode);
  const loadTemplate = useBuilderStore((state) => state.loadTemplate);
  const addBlock = useBuilderStore((state) => state.addBlock);
  const removeBlock = useBuilderStore((state) => state.removeBlock);
  const paintBlock = useBuilderStore((state) => state.paintBlock);
  const clear = useBuilderStore((state) => state.clear);
  const exportBuilding = useBuilderStore((state) => state.exportBuilding);
  const summary = summarizeMaterials(blocks);
  const blueprint = exportBuilding();
  const previewBlueprint = buildPreviewBlueprint(blueprint);

  function handleSurfaceAction(x: number, z: number) {
    if (mode === "remove") {
      removeBlock(x, activeLayer, z);
      return;
    }

    if (mode === "paint") {
      paintBlock(x, activeLayer, z);
      return;
    }

    addBlock(x, activeLayer, z);
  }

  function handleBlockInteraction(
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    interactionMode: "add" | "remove" | "paint",
  ) {
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

    const nextX = Math.max(0, Math.min(gridSize - 1, block.x + Math.round(normal.x)));
    const nextY = Math.max(0, Math.min(12, block.y + Math.round(normal.y)));
    const nextZ = Math.max(0, Math.min(gridSize - 1, block.z + Math.round(normal.z)));
    addBlock(nextX, nextY, nextZ);
    setActiveLayer(nextY);
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

    if (response.ok) {
      setSaveMessage("Building blueprint saved to local storage bootstrap.");
      return;
    }

    setSaveMessage("Unable to save building right now.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <SectionCard
          eyebrow="Phase 2"
          title="Builder Controls"
          description="Switch materials, change layers, and save a blueprint draft."
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[color:var(--muted)]">
                Template
              </span>
              <select
                value={sampleBuildings.some((building) => building.id === loadedTemplateId) ? loadedTemplateId : ""}
                onChange={(event) => loadTemplate(event.target.value)}
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
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
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[color:var(--muted)]">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["add", "paint", "remove"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold capitalize ${
                    mode === option
                      ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                      : "bg-white/70 text-[color:var(--foreground)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="space-y-2">
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
                className="w-full accent-[color:var(--accent)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {blockMaterials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => setActiveMaterial(material.id)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold ${
                    activeMaterial === material.id
                      ? "bg-[color:var(--accent-2)]/18 text-[color:var(--foreground)]"
                      : "bg-white/70 text-[color:var(--foreground)]"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: material.color }}
                  />
                  {material.displayName}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSaveBuilding}
                className="rounded-2xl bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--background)]"
              >
                Save blueprint
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                Clear scene
              </button>
            </div>
            {saveMessage ? (
              <p className="text-sm leading-6 text-[color:var(--muted)]">{saveMessage}</p>
            ) : null}
          </div>
        </SectionCard>
      </div>
      <SectionCard
        eyebrow="Voxel Scene"
        title="3D Builder"
        description="Click the floor to add blocks on the current layer. Click a block face in add mode to extend the structure."
        className="overflow-hidden"
      >
        <div className="h-[620px] overflow-hidden rounded-[24px] border border-white/60">
          <BuildScene
            activeLayer={activeLayer}
            blocks={blocks}
            mode={mode}
            onAddFromSurface={handleSurfaceAction}
            onBlockInteract={handleBlockInteraction}
          />
        </div>
      </SectionCard>
      <div className="space-y-6">
        <MaterialsBreakdown
          title="Live Materials"
          materials={summary.materials}
          totalBlocks={summary.totalBlocks}
        />
        <HelperPanel helpers={summary.helpers} />
        <SectionCard
          title="Blueprint Export"
          description="The exported data is plain JSON so it can feed the map planner, material calculator, and future AI tools."
        >
          <pre className="max-h-[360px] overflow-auto rounded-2xl bg-[color:var(--foreground)] p-4 text-xs leading-6 text-[color:var(--background)]">
            {JSON.stringify(previewBlueprint, null, 2)}
          </pre>
        </SectionCard>
      </div>
    </div>
  );
}
