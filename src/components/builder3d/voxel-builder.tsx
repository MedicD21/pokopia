"use client";

import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Color, type InstancedMesh, Matrix4, Object3D } from "three";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { HelperPanel } from "@/components/pokemon/helper-panel";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { SectionCard } from "@/components/ui/section-card";
import { sampleBuildings } from "@/data/buildings";
import { blockMaterials, blockMaterialLookup } from "@/data/materials";
import { summarizeMaterials } from "@/lib/materials";
import type { BuildingData, StorageMode, VoxelBlock } from "@/lib/types";
import { useBuilderStore } from "@/store/use-builder-store";

const gridSize = 24;
const maxInstances = 12000;

type CameraPreset = "iso" | "front" | "back" | "left" | "right" | "top";

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
  mode: "hand" | "add" | "remove" | "paint";
  onInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: "hand" | "add" | "remove" | "paint",
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

function CameraRig({
  controlsRef,
  preset,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  preset: CameraPreset;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const centerX = gridSize / 2;
    const centerY = 4;
    const centerZ = gridSize / 2;
    const distance = 26;

    const presets: Record<CameraPreset, [number, number, number]> = {
      iso: [centerX + distance, centerY + 14, centerZ + distance],
      front: [centerX, centerY + 6, centerZ + distance + 6],
      back: [centerX, centerY + 6, centerZ - distance - 6],
      left: [centerX - distance - 6, centerY + 6, centerZ],
      right: [centerX + distance + 6, centerY + 6, centerZ],
      top: [centerX, centerY + 34, centerZ],
    };

    const [x, y, z] = presets[preset];
    camera.position.set(x, y, z);
    camera.lookAt(centerX, centerY, centerZ);
    controlsRef.current?.target.set(centerX, centerY, centerZ);
    controlsRef.current?.update();
  }, [camera, controlsRef, preset]);

  return null;
}

function BuildScene({
  activeLayer,
  blocks,
  cameraPreset,
  mode,
  onAddFromSurface,
  onBlockInteract,
  onSelectBlock,
  selectedBlock,
}: {
  activeLayer: number;
  blocks: VoxelBlock[];
  cameraPreset: CameraPreset;
  mode: "hand" | "add" | "remove" | "paint";
  onAddFromSurface: (x: number, z: number) => void;
  onBlockInteract: (
    block: VoxelBlock,
    event: ThreeEvent<MouseEvent>,
    mode: "hand" | "add" | "remove" | "paint",
  ) => void;
  onSelectBlock: (blockId: string | null) => void;
  selectedBlock: VoxelBlock | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      camera={{ position: [18, 16, 18], fov: 42 }}
      shadows
      className="h-full w-full"
      onPointerMissed={() => onSelectBlock(null)}
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
      <CameraRig controlsRef={controlsRef} preset={cameraPreset} />
      <gridHelper
        args={[gridSize, gridSize, "#9eb1cf", "#d1d9e9"]}
        position={[gridSize / 2, activeLayer, gridSize / 2]}
      />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[gridSize / 2, activeLayer + 0.01, gridSize / 2]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();

          if (mode === "hand") {
            onSelectBlock(null);
            return;
          }

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
      <SelectedBlockOutline block={selectedBlock} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        maxDistance={64}
        minDistance={6}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

export function VoxelBuilder() {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("iso");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
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
  const updateBlockMaterial = useBuilderStore((state) => state.updateBlockMaterial);
  const clear = useBuilderStore((state) => state.clear);
  const exportBuilding = useBuilderStore((state) => state.exportBuilding);
  const summary = summarizeMaterials(blocks);
  const blueprint = exportBuilding();
  const previewBlueprint = buildPreviewBlueprint(blueprint);
  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? null;

  function handleSurfaceAction(x: number, z: number) {
    if (mode === "hand") {
      setSelectedBlockId(null);
      return;
    }

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
    interactionMode: "hand" | "add" | "remove" | "paint",
  ) {
    if (interactionMode === "hand") {
      setSelectedBlockId(block.id);
      setActiveLayer(block.y);
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

    const nextX = Math.max(0, Math.min(gridSize - 1, block.x + Math.round(normal.x)));
    const nextY = Math.max(0, Math.min(12, block.y + Math.round(normal.y)));
    const nextZ = Math.max(0, Math.min(gridSize - 1, block.z + Math.round(normal.z)));
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

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px] 2xl:grid-cols-[320px_minmax(0,1.35fr)_380px]">
      <div className="space-y-5 xl:sticky xl:top-28 xl:self-start">
        <SectionCard
          eyebrow="Phase 2"
          title="Builder Controls"
          description="Use hand mode to inspect and edit existing blocks. Drag inside the scene to orbit the camera, right-drag to pan, and scroll to zoom."
        >
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
              {(["hand", "add", "paint", "remove"] as const).map((option) => (
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
                onClick={() => {
                  clear();
                  setSelectedBlockId(null);
                }}
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
        description="Hand mode selects existing blocks for editing. Add mode extrudes from a clicked face, while paint and remove work directly on the current structure."
        action={
          <div className="flex flex-wrap gap-2">
            {(["iso", "front", "back", "left", "right", "top"] as const).map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                    cameraPreset === preset
                      ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                      : "bg-white/80 text-[color:var(--foreground)]"
                  }`}
                >
                  {preset}
                </button>
              ),
            )}
          </div>
        }
        className="flex min-h-[calc(100vh-11rem)] flex-col"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[24px] bg-white/70 px-4 py-3 text-sm text-[color:var(--muted)]">
          <span>Drag: orbit camera.</span>
          <span>Right-drag: pan.</span>
          <span>Scroll: zoom.</span>
          <span>Camera buttons: snap to every side.</span>
        </div>
        <div className="min-h-[760px] flex-1 overflow-hidden rounded-[24px] border border-white/60">
          <BuildScene
            activeLayer={activeLayer}
            blocks={blocks}
            cameraPreset={cameraPreset}
            mode={mode}
            onAddFromSurface={handleSurfaceAction}
            onBlockInteract={handleBlockInteraction}
            onSelectBlock={setSelectedBlockId}
            selectedBlock={selectedBlock}
          />
        </div>
      </SectionCard>
      <div className="space-y-5 xl:sticky xl:top-28 xl:self-start">
        <SectionCard
          title="Block Inspector"
          description="Select a block with the hand tool to edit or remove it directly."
        >
          {selectedBlock ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/70 px-4 py-4">
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
                  }}
                  className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
                >
                  {blockMaterials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMaterial(selectedBlock.material)}
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold"
                >
                  Match brush
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeBlock(selectedBlock.x, selectedBlock.y, selectedBlock.z);
                    setSelectedBlockId(null);
                  }}
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold"
                >
                  Delete block
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Nothing selected yet. Switch to hand mode and click an existing block in the structure.
            </p>
          )}
        </SectionCard>
        <MaterialsBreakdown
          title="Live Materials"
          materials={summary.materials}
          totalBlocks={summary.totalBlocks}
        />
        <HelperPanel helpers={summary.helpers} />
        <SectionCard
          title="Blueprint Export"
          description="The exported JSON stays lightweight so it can flow into the map planner, persistence layer, and future AI import pipeline."
        >
          <pre className="max-h-[300px] overflow-auto rounded-2xl bg-[color:var(--foreground)] p-4 text-xs leading-6 text-[color:var(--background)]">
            {JSON.stringify(previewBlueprint, null, 2)}
          </pre>
        </SectionCard>
      </div>
    </div>
  );
}
