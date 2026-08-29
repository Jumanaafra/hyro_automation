import { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import AppShell from '../components/AppShell/AppShell';
import { useChatStore } from '../store/chatStore';
import {
  BookOpen, Upload, FileText, Trash2, RefreshCw, CheckCircle2,
  AlertCircle, Clock, Plus, Layers
} from 'lucide-react';

export default function KnowledgePage() {
  const { documents, isDocLoading, fetchDocuments, uploadDocument, deleteDocument, reindexDocument, uploading } = useChatStore();

  const [name, setName] = useState('');
  const [type, setType] = useState('markdown');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    await uploadDocument({
      name: name.trim(),
      type,
      content,
      metadata: { rawContent: content }
    });

    setName('');
    setContent('');
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this document and its retrievable knowledge chunks?')) {
      await deleteDocument(id);
    }
  };

  const handleReindex = async (id) => {
    await reindexDocument(id);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Knowledge Base
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">Upload project documents, resumes, and notes for RAG retrieval</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:opacity-95 shadow-lg shadow-indigo-500/25 transition"
            >
              <Plus className="w-4 h-4" /> Add Document
            </button>
          </div>

          {/* Upload Form Modal/Card */}
          {showForm && (
            <div className="glass-card p-6 rounded-2xl border border-indigo-500/30">
              <h3 className="text-sm font-bold text-white mb-4">Ingest New Knowledge Document</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Document Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., HYRO_Project_Architecture.md"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Document Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="markdown">Markdown (.md)</option>
                      <option value="txt">Plain Text (.txt)</option>
                      <option value="pdf">PDF Document</option>
                      <option value="note">Operator Note</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Document Text / Content</label>
                  <textarea
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste project documentation, technical notes, or resume content here..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> Ingest & Index Vector Chunks
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Document List */}
          {isDocLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl border border-slate-800">
              <FileText className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-400">No knowledge documents ingested</p>
              <p className="text-xs text-slate-500 mt-1">Upload Markdown, Text, or PDF files to empower the RAG assistant</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc._id} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <h3 className="text-sm font-bold text-white truncate">{doc.name}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        doc.status === 'indexed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {doc.status === 'indexed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {doc.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-purple-400" /> {doc.chunkCount || 0} vector chunks</span>
                      <span className="uppercase font-semibold text-slate-400">{doc.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 border-t border-slate-800/80 pt-3">
                    <span className="text-[10px] text-slate-500">Indexed {new Date(doc.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReindex(doc._id)}
                        title="Re-index document"
                        className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id)}
                        title="Delete document"
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
