"use client";

import React, { useState, useEffect } from "react";
import { getSettings, saveSettings } from "@/lib/admin";
import Swal from "sweetalert2";
import { FaGear, FaFloppyDisk } from "react-icons/fa6";

const SWAL = { background: "#0f172a", color: "#f8fafc" };

export function SettingsTab() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      Swal.fire({ ...SWAL, icon: "success", title: "Settings Saved", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ ...SWAL, icon: "error", title: "Error", text: err.message });
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="bg-slate-900 border border-white/10 rounded-[20px] p-6 shadow-xl max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
          <FaGear className="text-teal-400 w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Platform Settings</h2>
          <p className="text-xs text-slate-500">Manage global configuration for AdsFinance</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest">Company Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name</label>
              <input required type="text" value={settings.bankName || ""} onChange={e => setSettings({...settings, bankName: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Number</label>
              <input required type="text" value={settings.bankAccount || ""} onChange={e => setSettings({...settings, bankAccount: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Account Name</label>
              <input required type="text" value={settings.bankHolder || ""} onChange={e => setSettings({...settings, bankHolder: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Withdrawal Limits */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest">Minimum Withdrawal (₦)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["Node Alpha", "Node Sigma", "Node Omega"].map(node => (
              <div key={node}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{node}</label>
                <input required type="number" min="0" value={settings.minWithdrawal?.[node] || 0} 
                  onChange={e => setSettings({...settings, minWithdrawal: { ...settings.minWithdrawal, [node]: Number(e.target.value) }})} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 outline-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Referral System */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest">Referral System</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referral Bonus (₦)</label>
            <input required type="number" min="0" value={settings.referralBonus || 0} onChange={e => setSettings({...settings, referralBonus: Number(e.target.value)})} className="w-full md:w-1/3 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 outline-none" />
            <p className="text-[10px] text-slate-500 mt-1">Amount credited to the referrer when their invitee activates a node.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors disabled:opacity-50">
            <FaFloppyDisk /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
