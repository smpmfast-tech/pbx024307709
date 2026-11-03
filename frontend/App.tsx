import React, { useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ProductionReadinessAudit } from './components/ProductionReadinessAudit';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  Shield,
  Zap,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'audit';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const fahsaiUrl =
    'https://genai-app-fahsaiaivoicetelesales-al-1-17935438439-413450112749.asia-southeast1.run.app/';

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0d1527]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-purple-600 shadow-lg shadow-emerald-500/20">
              <PhoneCall className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                  Voice Operations · Twilio AI
                </h1>
                <span className="rounded-full border border-amber-800/70 bg-amber-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  ADMIN SNAPSHOT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                GCP: <span className="font-mono font-semibold text-cyan-300">gen-lang-client-0845508747</span>
                {' | '}Twilio: <span className="font-mono font-semibold text-amber-200">+1 831 298 8954</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={fahsaiUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-purple-700 bg-purple-950/60 px-3 py-1.5 text-xs text-purple-300 transition-colors hover:bg-purple-900/60 hover:text-white"
            >
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>น้องฟ้าใส Web App</span>
              <ExternalLink className="ml-0.5 h-3 w-3" />
            </a>
            <button
              onClick={() => setActiveTab('audit')}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-950/80 px-3 py-1.5 font-mono text-xs text-emerald-300 transition-all hover:bg-emerald-900/80"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>ตรวจความพร้อม</span>
            </button>
          </div>
        </div>

        <nav
          aria-label="เมนูหลัก"
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto border-t border-slate-800/60 px-4 py-2 text-xs font-semibold sm:px-6 lg:px-8"
        >
          <button
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-cyan-300/90 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>แดชบอร์ด Twilio</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            aria-current={activeTab === 'audit' ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
              activeTab === 'audit'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-rose-300/90 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <AlertOctagon className="h-4 w-4" />
            <span>เงื่อนไขก่อนเปิดใช้งาน</span>
          </button>
        </nav>
      </header>

      <aside
        aria-label="ข้อบังคับการใช้บัญชีทรัพยากร"
        className="border-b border-amber-500/30 bg-amber-950/40"
      >
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-xs leading-5 text-amber-100">
            <strong className="font-extrabold">ข้อบังคับบัญชีทรัพยากร — ห้ามสลับบัญชี:</strong>
            <span className="ml-1.5">
              GCP โปรเจกต์ <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-amber-200">gen-lang-client-0845508747</code>
              {' '}ใช้ <strong className="font-mono">smpmfast@gmail.com</strong> เท่านั้น
              {' '}· Twilio ใช้ <strong className="font-mono">csdeebuddy@gmail.com</strong> เท่านั้น
            </span>
            <span className="ml-1.5 text-amber-200/75">
              ตรวจบัญชีที่ลงชื่อเข้าใช้ก่อนดูหรือแก้ไขทรัพยากรทุกครั้ง
            </span>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <AdminDashboard onNavigate={setActiveTab} />
        )}
        {activeTab === 'audit' && <ProductionReadinessAudit />}
      </main>

      <footer className="border-t border-slate-800 bg-[#0a0f1d] py-4 text-center text-xs text-slate-500">
        2 ช่องทางเป้าหมาย: Twilio +1 831 298 8954 และ WebRTC ที่ 711shopping.com/chatandshop · ยังไม่เปิดใช้ Gateway/WebRTC
      </footer>
    </div>
  );
}
