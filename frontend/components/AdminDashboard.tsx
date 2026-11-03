import React from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Cloud,
  ExternalLink,
  Globe2,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (destination: 'audit') => void;
}

const twilioNumberUrl =
  'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming/PNb9ae37728701dfaef3e63087e28afc99/configure';
const adapterUrl =
  'https://console.cloud.google.com/run/detail/asia-southeast1/fahsai-audio-bridge?project=gen-lang-client-0845508747';

const StatusPill: React.FC<{
  tone: 'amber' | 'red' | 'slate';
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const tones = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    red: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const SectionHeading: React.FC<{ eyebrow: string; title: string; detail?: string }> = ({
  eyebrow,
  title,
  detail,
}) => (
  <div className="mb-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">{eyebrow}</p>
    <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
    {detail && <p className="mt-1 text-xs leading-relaxed text-slate-400">{detail}</p>}
  </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => (
  <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(ellipse_at_top_right,_rgba(8,145,178,0.16),_transparent_44%),linear-gradient(135deg,#101a2d,#0b1220_72%)] p-6 shadow-2xl sm:p-8">
      <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border border-cyan-500/10" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusPill tone="slate">
              <Activity className="h-3.5 w-3.5" />
              TWILIO VOICE · ADMIN
            </StatusPill>
            <StatusPill tone="amber">
              <CircleHelp className="h-3.5 w-3.5" />
              สถานะตรวจสอบล่าสุด · ไม่ใช่ข้อมูลสด
            </StatusPill>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            ศูนย์ควบคุม AI Voice Agent
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            รองรับเป้าหมายสองช่องทาง: โทรศัพท์ผ่าน Twilio และ WebRTC ผ่าน Browser/Twilio Voice SDK
            โดยใช้ AI backend และระบบคำสั่งซื้อชุดเดียวกัน ทั้งสองช่องทางยังอยู่ระหว่างเตรียมใช้งาน
          </p>
        </div>
        <button
          onClick={() => onNavigate('audit')}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-500/20"
        >
          <ShieldCheck className="h-4 w-4" />
          ตรวจเงื่อนไขก่อนเปิดใช้งาน
        </button>
      </div>
    </section>

    <section aria-label="สถานะหลักของระบบ" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-amber-500/20 bg-[#101929] p-4">
        <div className="flex items-start justify-between">
          <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-200">
            <Phone className="h-5 w-5" />
          </span>
          <StatusPill tone="amber">Webhook เดิม</StatusPill>
        </div>
        <p className="mt-4 text-xs text-slate-400">Twilio Voice Number</p>
        <p className="mt-1 font-mono text-lg font-bold text-white">+1 831 298 8954</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          เบอร์ active ตามการตรวจล่าสุด; ยังไม่ได้ย้ายไป gateway ใหม่
        </p>
      </article>

      <article className="rounded-2xl border border-rose-500/20 bg-[#101929] p-4">
        <div className="flex items-start justify-between">
          <span className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-rose-300">
            <Workflow className="h-5 w-5" />
          </span>
          <StatusPill tone="red">ยังไม่ Deploy</StatusPill>
        </div>
        <p className="mt-4 text-xs text-slate-400">Twilio Voice Gateway</p>
        <p className="mt-1 text-lg font-bold text-white">รอ Secret และทดสอบ</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          Auth Token ยังต้องเพิ่มใน Secret Manager ก่อน deploy และทดสอบ signed webhook
        </p>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-[#101929] p-4">
        <div className="flex items-start justify-between">
          <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300">
            <Cloud className="h-5 w-5" />
          </span>
          <StatusPill tone="slate">ไม่ใช่ข้อมูลสด</StatusPill>
        </div>
        <p className="mt-4 text-xs text-slate-400">Cloud Run · Voice Adapter</p>
        <p className="mt-1 text-lg font-bold text-white">fahsai-audio-bridge</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          asia-southeast1 · IAP เปิดใช้งานตามการตรวจล่าสุด
        </p>
      </article>

      <article className="rounded-2xl border border-violet-500/20 bg-[#101929] p-4">
        <div className="flex items-start justify-between">
          <span className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-300">
            <Globe2 className="h-5 w-5" />
          </span>
          <StatusPill tone="red">ยังไม่ Implement</StatusPill>
        </div>
        <p className="mt-4 text-xs text-slate-400">Browser WebRTC</p>
        <p className="mt-1 text-lg font-bold text-white">Twilio Voice SDK</p>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          ยังไม่มี Client, Token API หรือ TwiML Application route
        </p>
      </article>
    </section>

    <section className="space-y-4 rounded-2xl border border-slate-800 bg-[#101929] p-5 sm:p-6">
        <SectionHeading
          eyebrow="Two inbound channels"
          title="โครงสร้างช่องทางรับสาย"
          detail="แยกการรับสื่อ/การยืนยันตัวตนตามช่องทาง แล้วรวมเข้า AI session, order validation, Sheets และ SMS ชุดเดียวกัน"
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-xl border border-amber-500/20 bg-amber-500/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Phone className="h-4 w-4 text-amber-200" />
                โทรศัพท์ · +1 831 298 8954
              </h3>
              <StatusPill tone="amber">Webhook เดิม · Gateway ใหม่ยังไม่ Deploy</StatusPill>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              PSTN → Twilio DID → Voice Webhook → Media Streams → Gateway → AI Agent
            </p>
          </article>
          <article className="rounded-xl border border-violet-500/20 bg-violet-500/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Globe2 className="h-4 w-4 text-violet-300" />
                Browser · WebRTC
              </h3>
              <StatusPill tone="red">กำหนด URL แล้ว · ยังไม่ Implement</StatusPill>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              <a
                href="https://711shopping.com/chatandshop"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-violet-200 underline decoration-violet-500/50 underline-offset-2"
              >
                https://711shopping.com/chatandshop
              </a>
              {' '}→ short-lived Voice Token → Twilio Voice SDK/WebRTC → TwiML App → Media Streams → Gateway → AI Agent
            </p>
            <p className="mt-2 text-[11px] leading-5 text-amber-200/80">
              ยังไม่ได้ตรวจยืนยันว่า URL เปิดใช้งานได้; ยังไม่มี WebRTC client หรือ token endpoint
            </p>
          </article>
        </div>
        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.035] p-4">
          <h3 className="text-xs font-bold text-cyan-200">บริการร่วมหลังรวมช่องทาง</h3>
          <p className="mt-2 text-xs leading-6 text-slate-300">
            Voice Adapter / Vertex AI Live → ยืนยันคำสั่งซื้อ → durable order/outbox → Google Sheets + SMS หลังจบสายและมี consent
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="flex items-start gap-2 text-[11px] leading-5 text-amber-100/80">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            คง webhook หมายเลขจริงเป็น rollback target; WebRTC ยังไม่เปิดให้ลูกค้าใช้
          </p>
          <button
            onClick={() => onNavigate('audit')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-200"
          >
            ดู checklist ความพร้อม
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
    </section>

    <section className="rounded-2xl border border-slate-800 bg-[#101929] p-5 sm:p-6">
      <SectionHeading eyebrow="Provider consoles" title="ทางลัดตรวจสอบผู้ให้บริการ" />
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={twilioNumberUrl}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <Phone className="h-4 w-4 text-amber-200" />
            <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-amber-200" />
          </div>
          <p className="mt-3 text-xs font-bold text-white">Twilio Number Settings</p>
          <p className="mt-1 text-[10px] text-slate-500">ตรวจ webhook ปัจจุบันและความสามารถของหมายเลข</p>
        </a>
        <a
          href={adapterUrl}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-cyan-500/30"
        >
          <div className="flex items-center justify-between">
            <Cloud className="h-4 w-4 text-cyan-300" />
            <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-300" />
          </div>
          <p className="mt-3 text-xs font-bold text-white">GCP Cloud Run Adapter</p>
          <p className="mt-1 text-[10px] text-slate-500">gen-lang-client-0845508747 · asia-southeast1</p>
        </a>
      </div>
      <div className="mt-4 flex items-start gap-2 border-t border-slate-800 pt-3 text-[10px] leading-5 text-slate-500">
        <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        หน้านี้เป็น snapshot ไม่มีการดึง call logs, active calls หรือ metrics สด และยังไม่ใช่ระบบยืนยันตัวตนผู้ดูแล
      </div>
    </section>
  </div>
);
