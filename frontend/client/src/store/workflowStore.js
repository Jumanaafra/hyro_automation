import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from '@xyflow/react';
import api from '../services/api';

// Hierarchical Auto-Layout algorithm
function computeHierarchicalLayout(nodes, edges, direction = 'LR') {
  if (!nodes || nodes.length === 0) return [];

  // Compute in-degrees and adjacency
  const inDegree = new Map();
  const adj = new Map();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source).push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Calculate topological levels (ranks)
  const levels = new Map();
  const queue = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  });

  while (queue.length > 0) {
    const u = queue.shift();
    const currLevel = levels.get(u) || 0;
    const neighbors = adj.get(u) || [];
    neighbors.forEach((v) => {
      const nextLevel = Math.max(levels.get(v) || 0, currLevel + 1);
      levels.set(v, nextLevel);
      inDegree.set(v, inDegree.get(v) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    });
  }

  // Group nodes by level
  const rankGroups = new Map();
  nodes.forEach((n) => {
    const level = levels.get(n.id) || 0;
    if (!rankGroups.has(level)) rankGroups.set(level, []);
    rankGroups.get(level).push(n);
  });

  const layoutNodes = [];
  const xSpacing = 280;
  const ySpacing = 130;
  const startX = 80;
  const startY = 150;

  rankGroups.forEach((groupNodes, level) => {
    groupNodes.forEach((node, idx) => {
      const totalInRank = groupNodes.length;
      const rankOffset = (idx - (totalInRank - 1) / 2) * ySpacing;

      let x, y;
      if (direction === 'LR') {
        x = startX + level * xSpacing;
        y = startY + rankOffset;
      } else {
        x = startX + (idx - (totalInRank - 1) / 2) * xSpacing;
        y = startY + level * ySpacing;
      }

      layoutNodes.push({
        ...node,
        position: { x, y }
      });
    });
  });

  return layoutNodes;
}

export const useWorkflowStore = create((set, get) => ({
  // Active workflow
  activeWorkflow: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  isSaving: false,
  saveError: null,
  isLoading: false,
  isGenerating: false,
  executionNodeStatuses: {},

  // List
  workflows: [],
  isListLoading: false,

  // React Flow handlers
  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },
  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },
  onConnect: (connection) => {
    if (connection.source === connection.target) return;
    const { edges } = get();
    const isDuplicate = edges.some(
      (e) => e.source === connection.source && e.target === connection.target
    );
    if (isDuplicate) return;

    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          type: 'smoothstep',
          style: { stroke: '#818cf8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#818cf8',
            width: 16,
            height: 16
          }
        },
        state.edges
      )
    }));
  },

  setSelectedNode: (node) => set({ selectedNode: node }),

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, ...config },
              config: { ...n.config, ...config }
            }
          : n
      ),
      selectedNode:
        state.selectedNode?.id === nodeId
          ? { ...state.selectedNode, config: { ...state.selectedNode.config, ...config } }
          : state.selectedNode
    }));
  },

  addNode: (nodeType, position = { x: 250, y: 250 }) => {
    const id = `node-${Date.now()}`;
    const label = nodeType.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    const newNode = {
      id,
      type: nodeType,
      position,
      data: { label, nodeType },
      config: {}
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
    return newNode;
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode
    }));
  },

  deleteEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId)
    }));
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    const layoutNodes = computeHierarchicalLayout(nodes, edges, 'LR');
    set({ nodes: layoutNodes });
  },

  // AI Workflow Generation from prompt
  generateWorkflowFromPrompt: async (prompt) => {
    if (!prompt || !prompt.trim()) return;
    set({ isGenerating: true });
    try {
      const res = await api.post('/workflows/generate', { prompt });
      const generated = res.data.data?.workflow || res.data.data;
      if (!generated) throw new Error('No workflow generated by AI service');

      const formattedNodes = (generated.nodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position || { x: 100, y: 150 },
        data: {
          label: n.data?.label || n.type,
          nodeType: n.data?.nodeType || n.type
        },
        config: n.config || {}
      }));

      const formattedEdges = (generated.edges || []).map((e) => ({
        id: e.id || `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        animated: true,
        type: 'smoothstep',
        style: { stroke: '#818cf8', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#818cf8',
          width: 16,
          height: 16
        }
      }));

      // Apply automatic clean layout
      const layoutNodes = computeHierarchicalLayout(formattedNodes, formattedEdges, 'LR');

      set({
        nodes: layoutNodes,
        edges: formattedEdges,
        activeWorkflow: get().activeWorkflow
          ? { ...get().activeWorkflow, name: generated.name, description: generated.description }
          : null,
        isGenerating: false
      });

      return generated;
    } catch (err) {
      set({ isGenerating: false });
      throw err;
    }
  },

  // API: fetch all workflows
  fetchWorkflows: async () => {
    set({ isListLoading: true });
    try {
      const res = await api.get('/workflows');
      const workflows = res.data.data?.workflows || (Array.isArray(res.data.data) ? res.data.data : []);
      set({ workflows, isListLoading: false });
    } catch (err) {
      set({ isListLoading: false });
    }
  },

  // API: fetch single workflow for editor
  fetchWorkflow: async (id) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/workflows/${id}`);
      const wf = res.data.data?.workflow || res.data.data;
      const rawNodes = wf.nodes || [];
      const rawEdges = (wf.edges || []).map((e) => ({
        ...e,
        animated: true,
        type: e.type || 'smoothstep',
        style: { stroke: '#818cf8', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#818cf8',
          width: 16,
          height: 16
        }
      }));

      set({
        activeWorkflow: wf,
        nodes: rawNodes,
        edges: rawEdges,
        isLoading: false
      });
      return wf;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // API: create workflow
  createWorkflow: async (data) => {
    const res = await api.post('/workflows', data);
    const wf = res.data.data?.workflow || res.data.data;
    set((state) => ({ workflows: [wf, ...state.workflows], activeWorkflow: wf }));
    return wf;
  },

  // API: save current canvas to backend
  saveWorkflow: async () => {
    const { activeWorkflow, nodes, edges } = get();
    if (!activeWorkflow) return;
    set({ isSaving: true, saveError: null });
    try {
      const res = await api.put(`/workflows/${activeWorkflow._id}`, { nodes, edges });
      const updated = res.data.data?.workflow || res.data.data;
      set({ activeWorkflow: updated, isSaving: false });
      return updated;
    } catch (err) {
      set({ isSaving: false, saveError: err.response?.data?.message || 'Save failed' });
      throw err;
    }
  },

  // API: duplicate
  duplicateWorkflow: async (id) => {
    const res = await api.post(`/workflows/${id}/duplicate`);
    const clone = res.data.data?.workflow || res.data.data;
    set((state) => ({ workflows: [clone, ...state.workflows] }));
    return clone;
  },

  // API: delete
  deleteWorkflow: async (id) => {
    await api.delete(`/workflows/${id}`);
    set((state) => ({ workflows: state.workflows.filter((w) => w._id !== id) }));
  },

  // API: execute workflow
  executeWorkflow: async (id) => {
    const res = await api.post(`/workflows/${id}/execute`);
    const initialData = res.data.data;
    const execId = initialData?._id || initialData?.execution?._id || initialData?.id;

    if (!execId) return initialData;

    // Poll until final status is reached
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        const statusRes = await api.get(`/executions/${execId}`);
        const currentExec = statusRes.data.data?.execution || statusRes.data.data;
        if (currentExec && (currentExec.status === 'COMPLETED' || currentExec.status === 'FAILED' || currentExec.status === 'WAITING_FOR_APPROVAL')) {
          return currentExec;
        }
      } catch (e) {
        // ignore polling error
      }
    }

    return initialData;
  },

  setNodeExecutionStatus: (nodeId, status) => {
    set((state) => ({
      executionNodeStatuses: {
        ...state.executionNodeStatuses,
        [nodeId]: status
      }
    }));
  },

  clearExecutionStatuses: () => set({ executionNodeStatuses: {} }),

  // Reset canvas
  resetCanvas: () =>
    set({
      activeWorkflow: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      executionNodeStatuses: {}
    })
}));
