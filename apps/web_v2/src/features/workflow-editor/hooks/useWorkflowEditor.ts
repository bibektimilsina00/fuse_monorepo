import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ApiNodeDefinition, NodeDefinition } from "../types/editorTypes";

import { editorAPI } from "../services/editorAPI";
import { useWorkflowEditorStore } from "../stores/workflowEditorStore";

const AUTOSAVE_DELAY = 1500; // ms

function normalizeDefinition(d: ApiNodeDefinition): NodeDefinition {
  return {
    ...d,
    allowError: d.allow_error,
    outputsSchema: d.outputs_schema,
    credentialType: (d.credential_type as string | undefined) ?? undefined,
  };
}

export function useWorkflowEditor(workflowId: string) {
  const storeWorkflow = useWorkflowEditorStore((s) => s.workflow);
  const saveState = useWorkflowEditorStore((s) => s.saveState);
  const nodes = useWorkflowEditorStore((s) => s.nodes);
  const edges = useWorkflowEditorStore((s) => s.edges);
  const onNodesChange = useWorkflowEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowEditorStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowEditorStore((s) => s.onConnect);
  const setNodes = useWorkflowEditorStore((s) => s.setNodes);
  const setEdges = useWorkflowEditorStore((s) => s.setEdges);
  const setWorkflow = useWorkflowEditorStore((s) => s.setWorkflow);
  const setNodeDefinitions = useWorkflowEditorStore(
    (s) => s.setNodeDefinitions,
  );
  const setSaveState = useWorkflowEditorStore((s) => s.setSaveState);
  const setVersionVector = useWorkflowEditorStore((s) => s.setVersionVector);
  const markSaved = useWorkflowEditorStore((s) => s.markSaved);
  const setSelectedNodeId = useWorkflowEditorStore((s) => s.setSelectedNodeId);
  const setInspectorOpen = useWorkflowEditorStore((s) => s.setInspectorOpen);
  const setInspectorTab = useWorkflowEditorStore((s) => s.setInspectorTab);
  const resetEditorStore = useWorkflowEditorStore((s) => s.reset);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(false);

  // ── Fetch node definitions (shared, long-lived cache) ─────────────────────
  const { data: rawDefinitions } = useQuery({
    queryKey: ["node-definitions"],
    queryFn: ({ signal }) => editorAPI.getNodeDefinitions(signal),
    staleTime: 1000 * 60 * 10, // 10 min
  });

  useEffect(() => {
    if (rawDefinitions && rawDefinitions.length > 0) {
      setNodeDefinitions(rawDefinitions.map(normalizeDefinition));
    }
  }, [rawDefinitions, setNodeDefinitions]);

  // ── Fetch workflow ────────────────────────────────────────────────────────
  const {
    data: workflow,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workflow-editor", workflowId],
    queryFn: ({ signal }) => editorAPI.getWorkflow(workflowId, signal),
    staleTime: Infinity, // editor owns the data
  });

  // Populate graph when workflow loads
  useEffect(() => {
    if (!workflow) return;
    setWorkflow(workflow);
    setVersionVector(workflow.version_vector ?? 0);

    const graph = workflow.graph ?? { nodes: [], edges: [] };
    skipNextAutosave.current = true; // first hydration must not trigger save
    setNodes(graph.nodes ?? []);
    setEdges(graph.edges ?? []);
    setSaveState("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id]);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: ({ graph, version }: { graph: object; version: number }) =>
      editorAPI.saveGraph(workflowId, graph, version),
    onMutate: () => setSaveState("saving"),
    onSuccess: (updated) => {
      markSaved(updated.version_vector ?? 0);
    },
    onError: () => setSaveState("error"),
  });

  // Trigger save on graph changes (store-driven)
  useEffect(() => {
    if (!workflow) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({
        graph: { nodes, edges },
        version: useWorkflowEditorStore.getState().versionVector,
      });
    }, AUTOSAVE_DELAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes(
        useWorkflowEditorStore
          .getState()
          .nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node,
          ),
      );
      setSaveState("unsaved");
    },
    [setNodes, setSaveState],
  );

  // Only open inspector on explicit node click — never clear on deselect
  const selectNode = useCallback(
    (nodeId: string) => {
      const current = useWorkflowEditorStore.getState();
      if (current.selectedNodeId !== nodeId) setSelectedNodeId(nodeId);
      if (!current.inspectorOpen) setInspectorOpen(true);
      setInspectorTab("config");
    },
    [setInspectorOpen, setSelectedNodeId, setInspectorTab],
  );

  // ── Run ───────────────────────────────────────────────────────────────────
  const runMutation = useMutation({
    mutationFn: () => editorAPI.run(workflowId),
  });

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: (name: string) => editorAPI.rename(workflowId, name),
    onSuccess: (updated) => setWorkflow(updated),
  });

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: () => editorAPI.toggleActive(workflowId),
    onSuccess: (res) => {
      if (storeWorkflow)
        setWorkflow({ ...storeWorkflow, is_active: res.is_active });
    },
  });

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      resetEditorStore();
    },
    [resetEditorStore],
  );

  return {
    workflow,
    isLoading,
    error,
    // Graph
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    updateNodeData,
    selectNode,
    // Actions
    run: runMutation.mutate,
    rename: renameMutation.mutate,
    toggle: toggleMutation.mutate,
    isRunning: runMutation.isPending,
    saveState,
  };
}
