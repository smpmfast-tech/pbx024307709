import React, { useState } from 'react';
import { TrunkConfig, safeCopyToClipboard } from '../types';
import { 
  KeyRound, 
  RefreshCw, 
  ShieldCheck, 
  Terminal, 
  Copy, 
  Check, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  FileCode2, 
  Server, 
  Globe, 
  ArrowRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface Props {
  config: TrunkConfig;
  onUpdateSecret: (newSecret: string) => void;
}

export const SecretRotationManager: React.FC<Props> = ({ config, onUpdateSecret }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [rotationStatus, setRotationStatus] = useState<'idle' | 'success'>('idle');
  const [activeRotationTab, setActiveRotationTab] = useState<'steps' | 'script' | 'secret_manager'>('steps');

  const copyToClipboard = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyNewSecret = () => {
    if (!newPassword.trim()) return;
    onUpdateSecret(newPassword.trim());
    setRotationStatus('success');
    setTimeout(() => setRotationStatus('idle'), 4000);
  };

  // Hot-reload rotation script for Asterisk VM without dropping running calls
  const zeroDowntimeRotateBash = `#!/bin/bash
# ==============================================================================
# 🔄 ZERO-DOWNTIME SECRET ROTATION FOR NT NEXTGEN (024307709)
# ระบบเปลี่ยนรหัสผ่านหลังบ้านแบบไร้รอยต่อ (ไม่ตัดสายที่คุยอยู่)
# ==============================================================================
set -e

NEW_PASSWORD="${newPassword || config.secret}"
CREDENTIALS_FILE="/etc/asterisk/nt_credentials.conf"

echo ">>> [1/4] ทำการสำรองไฟล์คอนฟิกเดิม (Backup with Timestamp)..."
cp /etc/asterisk/pjsip_nt_nextgen.conf /etc/asterisk/pjsip_nt_nextgen.conf.bak.$(date +%Y%m%d%H%M%S)

echo ">>> [2/4] บันทึกรหัสผ่านใหม่ลงในไฟล์ Secure Credentials Vault..."
cat << EOF > \${CREDENTIALS_FILE}
# NT NextGen Secret Vault - Permissions 600 Only
NT_DID=${config.pilotNumber}
NT_USERNAME=${config.username}
NT_PASSWORD=\${NEW_PASSWORD}
NT_DOMAIN=${config.sipServer}
NT_PROXY=${config.outboundProxy}
UPDATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
chmod 600 \${CREDENTIALS_FILE}
chown asterisk:asterisk \${CREDENTIALS_FILE}

echo ">>> [3/4] อัปเดต Secret ใน pjsip_nt_nextgen.conf..."
sed -i "s/password=.*/password=\${NEW_PASSWORD}/g" /etc/asterisk/pjsip_nt_nextgen.conf

echo ">>> [4/4] Hot-Reload PJSIP Stack (ไม่ตัดสายที่กำลังคุยอยู่)..."
asterisk -rx "pjsip reload"
sleep 2

echo ">>> ตรวจสอบสถานะการเชื่อมต่อหลังเปลี่ยนรหัสผ่าน:"
asterisk -rx "pjsip show registrations"
asterisk -rx "pjsip show endpoints NT_TRUNK_${config.pilotNumber}"
echo ">>> เสร็จสมบูรณ์! รหัสผ่านถูกอัปเดตและลงทะเบียนใหม่สำเร็จ <<<"
`;

  // GCP Secret Manager integration snippet
  const gcpSecretManagerScript = `# ==============================================================================
# ทางเลือกระดับ Enterprise: เก็บใน Google Cloud Secret Manager
# ==============================================================================

# 1. สร้าง Secret ใน GCP Secret Manager
echo -n "${newPassword || config.secret}" | gcloud secrets create nt-voip-password \\
    --data-file=- \\
    --replication-policy="automatic"

# 2. ให้สิทธิ์ VM ดึง Secret อัตโนมัติ (IAM Service Account)
# Asterisk VM สามารถดึง Secret มา Reload ทุกครั้งที่มีการเปลี่ยนผ่าน Cron / Webhook:
# gcloud secrets versions access latest --secret="nt-voip-password"
`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-500/50 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ระบบจัดการและเปลี่ยนรหัสผ่านหลังบ้าน (Zero-Downtime Secret Rotation)
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  PRODUCTION VAULT
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            เมื่อระบบเชื่อมต่อจริงและทดสอบสำเร็จ สามารถนำรหัสใหม่จาก NT Web Self Care มาสลับคีย์ได้ทันทีโดยที่สายน้องฟ้าใสไม่หลุด
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveRotationTab('steps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeRotationTab === 'steps'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ขั้นตอนเปลี่ยนรหัส 3 สเต็ป
          </button>
          <button
            onClick={() => setActiveRotationTab('script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeRotationTab === 'script'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            สคริปต์สลับคีย์ Hot-Reload (.sh)
          </button>
          <button
            onClick={() => setActiveRotationTab('secret_manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeRotationTab === 'secret_manager'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            GCP Secret Manager
          </button>
        </div>
      </div>

      {/* Interactive Secret Updater Widget */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full md:w-auto">
          <div className="text-xs text-slate-400 font-medium">รหัสผ่านที่ใช้งานจริงในปัจจุบัน (Active Secret):</div>
          <div className="flex items-center gap-2">
            <code className="text-amber-300 font-mono font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span>{showSecret ? config.secret : '••••••••••••••••'}</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-400 hover:text-white text-xs"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </code>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ผูกกับเบอร์ {config.pilotNumber}</span>
            </span>
          </div>
        </div>

        {/* Change Password Form in-app */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="พิมพ์รหัสผ่านใหม่ที่เปลี่ยนจาก NT..."
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          />
          <button
            onClick={handleApplyNewSecret}
            disabled={!newPassword.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>สลับรหัสในแอพ</span>
          </button>
        </div>
      </div>

      {rotationStatus === 'success' && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>บันทึกรหัสผ่านใหม่ลงระบบจำลองเรียบร้อย! คอนฟิกในหน้าเว็บนี้ถูกอัปเดตเป็นรหัสใหม่แล้ว</span>
        </div>
      )}

      {/* Tab 1: 3-Step Rotation Workflow */}
      {activeRotationTab === 'steps' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center">
                    1
                  </span>
                  <a
                    href="https://ntnextgen.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-0.5 font-mono"
                  >
                    <span>ntnextgen.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h4 className="font-bold text-white text-sm">เปลี่ยนรหัสที่ NT Self Care</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  ล็อกอินเข้าสู่ระบบ <b>NT Web Self Care</b> ด้วยเบอร์ <b>{config.pilotNumber}</b> แล้วเข้าไปที่เมนู <i>Change Password for VoIP Devices</i> เพื่อตั้งรหัสผ่านใหม่ที่ซับซ้อนขึ้น
                </p>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
                Endpoint: {config.sipServer}
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-900/60 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    Asterisk GCP VM
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">อัปเดตไฟล์ /etc/asterisk/pjsip</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  นำรหัสผ่านใหม่ไปใส่ที่ <code className="text-amber-300 font-mono">pjsip_nt_nextgen.conf</code> ตรงบรรทัด <code>password=NEW_PW</code> หรือรันสคริปต์อัตโนมัติในแถบถัดไป
                </p>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
                Vault: /etc/asterisk/nt_credentials.conf
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Zero Downtime
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">คำสั่ง Hot-Reload ทันที</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  รัน <code className="text-emerald-400 font-mono font-bold">asterisk -rx "pjsip reload"</code> เซิร์ฟเวอร์จะ Re-Register ทันทีโดย <b>ไม่ตัดสายที่คุยอยู่ และน้องฟ้าใสยังคงรับสายได้ต่อเนื่อง</b>
                </p>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
                Status: Registered (RTT &lt; 25ms)
              </div>
            </div>
          </div>

          {/* Secure Best Practice Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-white block mb-0.5">มาตรฐานการจัดเก็บความลับโทรคมนาคม (Telecom Secret Storage Standard):</b>
              ไฟล์รหัสผ่านบน Linux ควรรันสิทธิ์ <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">chmod 600 /etc/asterisk/nt_credentials.conf</code> เพื่อให้เฉพาะ User <b>asterisk</b> และ <b>root</b> เท่านั้นที่อ่านได้ ป้องกันการถูกดักอ่านผ่านโปรเซสอื่น
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hot-Reload Bash Script */}
      {activeRotationTab === 'script' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              สคริปต์สลับรหัสผ่านอัตโนมัติ: <code className="text-emerald-400">rotate_nt_password.sh</code>
            </span>
            <button
              onClick={() => copyToClipboard(zeroDowntimeRotateBash, 'rotate_bash')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
            >
              {copiedKey === 'rotate_bash' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกสคริปต์แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกคำสั่งสลับรหัส</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[420px]">
            {zeroDowntimeRotateBash}
          </pre>
        </div>
      )}

      {/* Tab 3: GCP Secret Manager */}
      {activeRotationTab === 'secret_manager' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              การผูกกับ Google Cloud Secret Manager บนโปรเจกต์ GCP เดียวกับ Asterisk VM
            </span>
            <button
              onClick={() => copyToClipboard(gcpSecretManagerScript, 'gcp_secret_mgr')}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded-lg transition-colors border border-cyan-600"
            >
              {copiedKey === 'gcp_secret_mgr' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>คัดลอกคำสั่ง gcloud แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก gcloud Secret</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[380px]">
            {gcpSecretManagerScript}
          </pre>
        </div>
      )}
    </div>
  );
};
