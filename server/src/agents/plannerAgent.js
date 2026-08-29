/**
 * Planner Agent
 * Responsibilities:
 * - Determine execution order (topological sort)
 * - Identify dependencies between nodes
 * - Generate execution plan
 * - Emit confidence score
 */

class PlannerAgent {
  planExecution(nodes = [], edges = []) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return {
        plan: [],
        dependencies: {},
        confidenceScore: 0,
        error: 'No nodes provided for execution plan'
      };
    }

    const inDegree = new Map();
    const adj = new Map();
    const dependencies = {};

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
      dependencies[n.id] = [];
    });

    edges.forEach((e) => {
      if (adj.has(e.source) && inDegree.has(e.target)) {
        adj.get(e.source).push(e.target);
        inDegree.set(e.target, inDegree.get(e.target) + 1);
        dependencies[e.target].push(e.source);
      }
    });

    // Topological Sort (Kahn's Algorithm)
    const queue = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const executionPlan = [];
    while (queue.length > 0) {
      const u = queue.shift();
      executionPlan.push(u);

      const neighbors = adj.get(u) || [];
      neighbors.forEach((v) => {
        inDegree.set(v, inDegree.get(v) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }

    // Check for cycles
    const hasCycle = executionPlan.length !== nodes.length;
    const confidenceScore = hasCycle ? 0.2 : 0.95;

    return {
      executionPlan,
      dependencies,
      confidenceScore,
      hasCycle
    };
  }
}

module.exports = new PlannerAgent();
