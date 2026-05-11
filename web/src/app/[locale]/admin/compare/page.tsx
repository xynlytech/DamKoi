"use client";

import { useState, useEffect } from "react";
import { Shield, GitMerge, GitBranch, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/admin";
const ADMIN_TOKEN = "damkoi-admin-secret-dev"; // MVP Security

type Product = {
  id: string;
  title: string;
  platform: string;
  url: string;
  image_url: string;
};

type MatchGroup = {
  id: string;
  name: string;
  product_count: number;
  products: Product[];
};

export default function AdminComparePage() {
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<{msg: string, type: 'ok'|'err'} | null>(null);

  // For merging
  const [mergeTargetGroup, setMergeTargetGroup] = useState<string | null>(null);
  const [mergeProductId, setMergeProductId] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/match-groups`, {
        headers: { "x-admin-token": ADMIN_TOKEN }
      });
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSplit = async (productId: string) => {
    try {
      setActionStatus(null);
      const res = await fetch(`${API}/match-groups/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": ADMIN_TOKEN },
        body: JSON.stringify({ product_ids: [productId] })
      });
      if (res.ok) {
        setActionStatus({ msg: "Split successful", type: 'ok' });
        fetchGroups();
      } else {
        setActionStatus({ msg: "Split failed", type: 'err' });
      }
    } catch (e) {
      setActionStatus({ msg: "Network error during split", type: 'err' });
    }
  };

  const handleMerge = async (groupId: string) => {
    if (!mergeProductId) return;
    try {
      setActionStatus(null);
      const res = await fetch(`${API}/match-groups/${groupId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": ADMIN_TOKEN },
        body: JSON.stringify({ product_ids: [mergeProductId] })
      });
      if (res.ok) {
        setActionStatus({ msg: "Merge successful", type: 'ok' });
        setMergeProductId("");
        setMergeTargetGroup(null);
        fetchGroups();
      } else {
        setActionStatus({ msg: "Merge failed. Check product ID.", type: 'err' });
      }
    } catch (e) {
      setActionStatus({ msg: "Network error during merge", type: 'err' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-8 font-inter">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Shield className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-outfit">DamKoi Admin</h1>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">Match Group Moderation</p>
            </div>
          </div>
          <button 
            onClick={fetchGroups} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </header>

        {actionStatus && (
          <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 border ${actionStatus.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {actionStatus.type === 'ok' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold text-sm">{actionStatus.msg}</span>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.id} className="nm-raised rounded-2xl overflow-hidden">
                <div className="bg-white/5 p-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-black font-outfit text-lg">{group.name}</h2>
                    <p className="text-[10px] text-white/40 font-mono mt-1">ID: {group.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                      {group.product_count} Products
                    </span>
                    <button 
                      onClick={() => setMergeTargetGroup(mergeTargetGroup === group.id ? null : group.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-all"
                    >
                      <GitMerge size={14} /> Merge Into Group
                    </button>
                  </div>
                </div>

                {mergeTargetGroup === group.id && (
                  <div className="p-4 bg-indigo-500/5 border-b border-white/5 flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Paste internal Product ID to inject..." 
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm font-mono outline-none focus:border-indigo-500/50"
                      value={mergeProductId}
                      onChange={(e) => setMergeProductId(e.target.value)}
                    />
                    <button 
                      onClick={() => handleMerge(group.id)}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
                    >
                      Execute Merge
                    </button>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {group.products.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{p.platform}</div>
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-[9px] font-mono text-white/20 mt-1">{p.id}</p>
                      </div>
                      <button 
                        onClick={() => handleSplit(p.id)}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all group"
                        title="Split from group"
                      >
                        <GitBranch size={16} className="group-hover:-rotate-90 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
