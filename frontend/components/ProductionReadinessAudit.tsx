import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe2,
  LockKeyhole,
  Phone,
  ShieldAlert,
  Workflow,
} from 'lucide-react';

const twilioNumberUrl =
  'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming/PNb9ae37728701dfaef3e63087e28afc99/configure';
const adapterUrl =
  'https://console.cloud.google.com/run/detail/asia-southeast1/fahsai-audio-bridge?project=gen-lang-client-0845508747';

const ReadinessItem: React.FC<{
  title: string;
  detail: string;
  icon: React.ReactNode;
  tone: 'amber' | 'red' | 'green';
}> = ({ title, detail, icon, tone }) => {
  const styles = {
    amber: 'border-amber-500/20 bg-amber-500/[0.04] text-amber-200',
    red: 'border-rose-500/20 bg-rose-500/[0.04] text-rose-300',
    green: 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300',
  };

  return (
    <article className={`flex gap-3 rounded-xl border p-4 ${styles[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </div>
    </article>
  );
};

export const ProductionReadinessAudit: React.FC = () => (
  <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-amber-200">
          <Phone className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-white">สถานะช่องทางโทรศัพท์และ WebRTC</h1>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
              ยังไม่พร้อมรับสายผ่าน Gateway ใหม่
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            หมายเลข Twilio ที่เลือกใช้คือ <strong className="font-mono text-white">+1 831 298 8954</strong>.
            หมายเลขยังชี้ไป webhook เดิม; ยังไม่มีการเปลี่ยนเส้นทางไปยัง gateway ที่พัฒนาขึ้นใหม่
            {' '}ส่วน browser WebRTC กำหนด URL <strong className="font-mono text-white">711shopping.com/chatandshop</strong> แต่ยังไม่เปิดใช้
          </p>
        </div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <a
        href={twilioNumberUrl}
        target="_blank"
        rel="noreferrer"
        className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-amber-500/40"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Twilio phone number</p>
          <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-amber-200" />
        </div>
        <p className="mt-3 font-mono text-xl font-bold text-white">+1 831 298 8954</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          ตรวจ webhook และความสามารถ Voice/SMS ใน Twilio Console ก่อนทดสอบทุกครั้ง
        </p>
      </a>

      <a
        href="https://711shopping.com/chatandshop"
        target="_blank"
        rel="noreferrer"
        className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-violet-500/40"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">WebRTC customer entry URL</p>
          <Globe2 className="h-4 w-4 text-violet-300" />
        </div>
        <p className="mt-3 break-all font-mono text-sm font-bold text-white">https://711shopping.com/chatandshop</p>
        <p className="mt-2 text-xs leading-5 text-amber-200/80">
          กำหนด URL ปลายทางแล้ว แต่ยังไม่ได้ยืนยันว่าเผยแพร่/เข้าถึงได้ และยังไม่มี WebRTC client หรือ backend token route
        </p>
      </a>

      <a
        href={adapterUrl}
        target="_blank"
        rel="noreferrer"
        className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-cyan-500/40"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">GCP voice adapter</p>
          <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-cyan-200" />
        </div>
        <p className="mt-3 text-lg font-bold text-white">fahsai-audio-bridge</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Cloud Run ใน asia-southeast1; IAP-protected. ลิงก์นี้ไม่ได้แปลว่า Twilio Gateway deploy แล้ว
        </p>
      </a>
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">เงื่อนไขก่อนเปิดเส้นทางจริง</h2>
      <ReadinessItem
        tone="red"
        icon={<ShieldAlert className="h-4 w-4" />}
        title="Gateway ยังไม่ได้ Deploy"
        detail="ต้องเพิ่ม Twilio Auth Token ใน Secret Manager ผ่านช่องทางปลอดภัย แล้ว deploy และตรวจ signed webhook ก่อน"
      />
      <ReadinessItem
        tone="amber"
        icon={<Workflow className="h-4 w-4" />}
        title="Webhook ของหมายเลขยังเป็นค่าเดิม"
        detail="คงค่าเดิมไว้เป็น rollback target จนกว่าจะผ่านการเชื่อมต่อ Media Streams และทดสอบสายจริงแบบมีผู้ควบคุม"
      />
      <ReadinessItem
        tone="amber"
        icon={<AlertTriangle className="h-4 w-4" />}
        title="ยังไม่มีผลทดสอบ end-to-end"
        detail="ต้องตรวจเสียงสองทาง, การจบสาย, fallback, การโทรซ้ำ และโหลด ก่อนพิจารณาเปลี่ยน webhook"
      />
      <ReadinessItem
        tone="red"
        icon={<Globe2 className="h-4 w-4" />}
        title="WebRTC ที่ /chatandshop ยังไม่พร้อมให้บริการ"
        detail="ต้องเผยแพร่และตรวจหน้าเว็บ จากนั้นเพิ่ม Twilio Voice SDK, token API, TwiML Application route และทดสอบ microphone/WebRTC บน HTTPS"
      />
      <ReadinessItem
        tone="green"
        icon={<LockKeyhole className="h-4 w-4" />}
        title="ขอบเขตบัญชีผู้ให้บริการ"
        detail="GCP ใช้ smpmfast@gmail.com; Twilio ใช้ csdeebuddy@gmail.com. ห้ามวาง token ในหน้าเว็บหรือส่งผ่านแชต"
      />
      <ReadinessItem
        tone="green"
        icon={<CheckCircle2 className="h-4 w-4" />}
        title="ไม่เปลี่ยนเส้นทางสายจริงในขั้นนี้"
        detail="หน้านี้เป็น checklist แบบ snapshot; ไม่ได้เรียกใช้คำสั่งบน VM, ไม่ได้แก้ Twilio webhook และไม่ได้ deploy"
      />
    </section>
  </div>
);
