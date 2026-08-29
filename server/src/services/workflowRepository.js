const Workflow = require('../models/Workflow');
const { getDbStatus } = require('../config/db');

// In-memory fallback store
const inMemoryWorkflows = new Map();
let nextId = 1;

class WorkflowRepository {
  _newId() {
    return String(nextId++);
  }

  async create(data) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.create(data);
    }
    const id = this._newId();
    const now = new Date();
    const doc = {
      _id: id,
      ...data,
      nodes: data.nodes || [],
      edges: data.edges || [],
      version: 1,
      status: data.status || 'draft',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now
    };
    inMemoryWorkflows.set(id, doc);
    return { ...doc };
  }

  async findAllByOwner(ownerId) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.find({ owner: String(ownerId) }).sort({ updatedAt: -1 });
    }
    const ownerStr = String(ownerId);
    return Array.from(inMemoryWorkflows.values())
      .filter((w) => String(w.owner) === ownerStr)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async findByIdAndOwner(id, ownerId) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.findOne({ _id: id, owner: String(ownerId) });
    }
    const doc = inMemoryWorkflows.get(String(id));
    if (!doc || String(doc.owner) !== String(ownerId)) return null;
    return { ...doc };
  }

  async findById(id) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.findById(id);
    }
    const doc = inMemoryWorkflows.get(String(id));
    return doc ? { ...doc } : null;
  }

  async updateByIdAndOwner(id, ownerId, updates) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.findOneAndUpdate(
        { _id: id, owner: String(ownerId) },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
    }
    const doc = inMemoryWorkflows.get(String(id));
    if (!doc || String(doc.owner) !== String(ownerId)) return null;
    const updated = { ...doc, ...updates, updatedAt: new Date() };
    inMemoryWorkflows.set(String(id), updated);
    return { ...updated };
  }

  async deleteByIdAndOwner(id, ownerId) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.findOneAndDelete({ _id: id, owner: String(ownerId) });
    }
    const doc = inMemoryWorkflows.get(String(id));
    if (!doc || String(doc.owner) !== String(ownerId)) return null;
    inMemoryWorkflows.delete(String(id));
    return { ...doc };
  }

  async countByOwner(ownerId) {
    const dbStatus = getDbStatus();
    if (dbStatus.isConnected) {
      return await Workflow.countDocuments({ owner: String(ownerId) });
    }
    const ownerStr = String(ownerId);
    return Array.from(inMemoryWorkflows.values()).filter(
      (w) => String(w.owner) === ownerStr
    ).length;
  }

  clearInMemoryStore() {
    inMemoryWorkflows.clear();
    nextId = 1;
  }
}

module.exports = new WorkflowRepository();
