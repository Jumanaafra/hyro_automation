import { create } from 'zustand';
import api from '../services/api';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  documents: [],
  isQuerying: false,
  isDocLoading: false,
  uploading: false,
  error: null,

  fetchConversations: async () => {
    try {
      const res = await api.get('/chat/conversations');
      set({ conversations: res.data.data.conversations });
    } catch (err) {}
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, messages: [] });
    if (!id) return;
    try {
      const res = await api.get(`/chat/conversations/${id}`);
      set({ messages: res.data.data.conversation.messages || [] });
    } catch (err) {}
  },

  sendQuery: async (message) => {
    const { activeConversationId, messages } = get();
    set({ isQuerying: true, error: null });

    // Optimistic user message
    const tempUserMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
    set({ messages: [...messages, tempUserMsg] });

    try {
      const res = await api.post('/chat', {
        message,
        conversationId: activeConversationId
      });

      const { conversationId, messages: updatedMsgs } = res.data.data;
      set({
        activeConversationId: conversationId,
        messages: updatedMsgs,
        isQuerying: false
      });
      get().fetchConversations();
    } catch (err) {
      set({
        isQuerying: false,
        error: err.response?.data?.message || 'Failed to send query'
      });
    }
  },

  fetchDocuments: async () => {
    set({ isDocLoading: true });
    try {
      const res = await api.get('/knowledge/documents');
      set({ documents: res.data.data.documents, isDocLoading: false });
    } catch (err) {
      set({ isDocLoading: false });
    }
  },

  uploadDocument: async ({ name, type, content, metadata }) => {
    set({ uploading: true, error: null });
    try {
      const res = await api.post('/knowledge/documents', { name, type, content, metadata });
      const doc = res.data.data.document;
      set((state) => ({ documents: [doc, ...state.documents], uploading: false }));
      return doc;
    } catch (err) {
      set({ uploading: false, error: err.response?.data?.message || 'Upload failed' });
      throw err;
    }
  },

  deleteDocument: async (id) => {
    await api.delete(`/knowledge/documents/${id}`);
    set((state) => ({ documents: state.documents.filter((d) => d._id !== id) }));
  },

  reindexDocument: async (id) => {
    const res = await api.post(`/knowledge/documents/${id}/reindex`);
    const updated = res.data.data.document;
    set((state) => ({
      documents: state.documents.map((d) => (d._id === id ? updated : d))
    }));
  },

  startNewConversation: () => {
    set({ activeConversationId: null, messages: [] });
  }
}));
