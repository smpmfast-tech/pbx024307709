import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react';

interface Props {
  currentSecret: string;
  onUpdateSecret: (newSecret: string) => void;
}

export const SecuritySafeVaultModal: React.FC<Props> = ({ currentSecret, onUpdateSecret }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSaveLocal = () => {
    if (!localInput) return;
    onUpdateSecret(localInput);
    setLocalInput('');
    setIsOpen(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                คำถาม: "ช่องแชทนี้ วางรหัสผ่านได้ไหม?"
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                SECURITY ADVISORY
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              คำแนะนำด้านความปลอดภัยโทรคมนาคม (Telecom Cyber Security Standard)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
        >
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <span>{isOpen ? 'ปิดกล่องคำแนะนำความปลอดภัย' : 'ดูคำแนะนำ & กรอกรหัสในเครื่องโดยตรง'}</span>
        </button>
      </div>

      {/* Answer Summary Card */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs leading-relaxed space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 text-sm">
              คำตอบวิศวกรอาวุโส: <u>ไม่แนะนำ</u> ให้วางรหัสผ่านจริงลงในช่องแชทข้อความ AI โดยตรง!
            </span>
            <p className="text-slate-300 mt-1">
              แม้ว่าระบบประมวลผลจะเป็นไปตามมาตรฐานความปลอดภัย แต่ตามหลัก <b>Zero-Trust Telecommunications Architecture</b>:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-300 font-sans">
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <b className="text-rose-400 block mb-1">1. ป้องกัน SIP Toll-Fraud</b>
            หากบุคคลภายนอกทราบ SIP Account/Secret ของเบอร์ <b>024307709</b> อาจถูกนำไปโทรสายนอกต่างประเทศ ซึ่งทำให้เกิดค่าโทรศัพท์ส่วนเกินมหาศาลได้
          </div>
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <b className="text-amber-400 block mb-1">2. ใช้รหัส Placeholder ในแชท</b>
            ในแชทให้ใช้รหัสสมมุติ เช่น <code className="text-cyan-300 font-mono font-bold">YOUR_SECRET_HERE</code> หรือ <code className="text-cyan-300 font-mono font-bold">NtSecret2025!</code> แทนได้เลย
          </div>
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <b className="text-emerald-400 block mb-1">3. ใส่รหัสผ่านเฉพาะบนเครื่องจริง</b>
            นำรหัสผ่านจริงไปใส่ที่ไฟล์ <code className="text-emerald-300 font-mono">/etc/asterisk/pjsip.conf</code> บน GCP VM หรือหน้าเว็บ FreePBX / Yealink โดยตรงเท่านั้น
          </div>
        </div>
      </div>

      {/* In-Browser Secure Input Tool (Saved only in React Memory, never sent to AI chat) */}
      {isOpen && (
        <div className="mt-4 p-4 rounded-xl bg-[#0f182c] border-2 border-cyan-500/40 animate-fadeIn">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              ช่องใส่รหัสผ่านในเครื่อง (In-Browser Safe Memory - ไม่ส่งข้อมูลออกนอกเครื่อง)
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            หากคุณต้องการให้โค้ดคอนฟิกในหน้านี้ (pjsip.conf, Yealink .cfg, Python Bridge) มีรหัสผ่านจริงของคุณปรากฏเพื่อความสะดวกในการคัดลอก สามารถกรอกลงช่องนี้ได้ ค่าจะถูกเก็บไว้เฉพาะใน Browser Memory ชั่วคราวของคุณเท่านั้น ไม่มีการส่งไปหาโมเดล AI ใดๆ
          </p>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                placeholder="พิมพ์รหัสผ่าน SIP Secret จริงของคุณที่นี่..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleSaveLocal}
              disabled={!localInput}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
            >
              อัปเดตลงในคอนฟิกของหน้าเว็บนี้
            </button>
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              รหัสผ่านที่ใช้อยู่ในคอนฟิกปัจจุบัน: <code className="text-amber-300 font-mono">••••••••••••</code>
            </span>
            <span className="text-emerald-400 font-mono text-[10px]">Client-Side Only</span>
          </div>
        </div>
      )}
    </div>
  );
};
