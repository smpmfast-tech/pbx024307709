import React, { useState } from 'react';
import { TrunkConfig, safeCopyToClipboard } from '../types';
import { Copy, Check, Terminal, Settings, ShieldCheck, Download, AlertTriangle, ExternalLink, Globe } from 'lucide-react';

interface Props {
  config: TrunkConfig;
  onChange: (updated: Partial<TrunkConfig>) => void;
}

export const PjsipGenerator: React.FC<Props> = ({ config, onChange }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'gui' | 'raw_conf' | 'bash_verify'>('gui');

  // Fix: use safeCopyToClipboard to avoid unhandled NotAllowedError
  const copyToClipboard = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2200);
  };

  // Generate exact Asterisk pjsip.conf syntax for NT NextGen
  const rawPjsipEndpoint = `; ================================================================
; NT NextGen (National Telecom Thailand) PJSIP Trunk Configuration
; Pilot DID: ${config.pilotNumber}
; SIP Domain: ${config.sipServer}
; SIP Proxy: ${config.outboundProxy}
; PBX Host: ${config.sipDomain}
; ================================================================

[global]
type=global
user_agent=FreePBX-${config.sipDomain}

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:${config.sipPort}
external_media_address=${config.externalIp || 'YOUR_GCP_STATIC_IP'}
external_signaling_address=${config.sipDomain}
local_net=${config.localSubnet || '10.148.0.0/20'}

; --- 1. NT NextGen Registration (Credentials Mode) ---
[nt_nextgen_reg]
type=registration
transport=transport-udp
outbound_auth=nt_nextgen_auth
server_uri=sip:${config.sipServer}:${config.sipPort}
client_uri=sip:${config.username}@${config.sipServer}:${config.sipPort}
contact_user=${config.pilotNumber}
${config.outboundProxy ? `outbound_proxy=sip:${config.outboundProxy}:${config.sipPort}\\;lr` : ''}
retry_interval=15
forbidden_retry_interval=300
expiration=3600
line=yes
endpoint=NT_TRUNK_${config.pilotNumber}

; --- 2. Outbound Authentication ---
[nt_nextgen_auth]
type=auth
auth_type=userpass
username=${config.username}
password=${config.secret}
realm=${config.sipServer}

; --- 3. AOR (Address of Record) ---
[NT_TRUNK_${config.pilotNumber}]
type=aor
contact=sip:${config.sipServer}:${config.sipPort}
${config.outboundProxy ? `outbound_proxy=sip:${config.outboundProxy}:${config.sipPort}\\;lr` : ''}
qualify_frequency=25
qualify_timeout=3.0
max_contacts=1

; --- 4. Identify (Matching Incoming INVITEs from NT SBC / Proxy) ---
[NT_IDENTIFY_${config.pilotNumber}]
type=identify
endpoint=NT_TRUNK_${config.pilotNumber}
match=${config.sipServer}${config.outboundProxy ? `,${config.outboundProxy}` : ''}

; --- 5. PJSIP Endpoint ---
[NT_TRUNK_${config.pilotNumber}]
type=endpoint
transport=transport-udp
context=${config.context}
disallow=all
${config.codecs.map(c => `allow=${c}`).join('\n')}
aors=NT_TRUNK_${config.pilotNumber}
outbound_auth=nt_nextgen_auth
${config.outboundProxy ? `outbound_proxy=sip:${config.outboundProxy}:${config.sipPort}\\;lr` : ''}
from_user=${config.pilotNumber}
from_domain=${config.sipServer}
send_rpid=yes
send_pai=yes
trust_id_inbound=yes
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
language=th
timers=yes
timers_min_se=90
`;

  const bashVerification = `# --- NT NextGen Live CLI Verification Commands ---
# 1. เช็กสถานะการ Register กับ NT NextGen (ต้องขึ้น Status: Registered)
asterisk -rx "pjsip show registrations"

# 2. เช็กสถานะ Endpoint วงจร NT NextGen
asterisk -rx "pjsip show endpoints NT_TRUNK_${config.pilotNumber}"

# 3. เช็กการเชื่อมต่อ Qualify AOR (RTT latency ms)
asterisk -rx "pjsip show aors NT_TRUNK_${config.pilotNumber}"

# 4. ดักจับแพ็กเก็ต SIP สดด้วย sngrep ผ่าน Proxy ${config.outboundProxy}
sngrep host ${config.outboundProxy} -d any

# 5. เปิด SIP Debug เฉพาะ IP ของ NT
asterisk -rx "pjsip set logger host ${config.outboundProxy}"
`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              คอนฟิก PJSIP Trunk สำหรับ NT NextGen (เบอร์ {config.pilotNumber})
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
              VERIFIED CREDENTIALS
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            SIP Domain: <span className="text-cyan-300 font-mono font-bold">{config.sipServer}</span> | 
            Proxy: <span className="text-amber-400 font-mono font-bold">{config.outboundProxy}</span> | 
            Self Care: <a href="https://ntnextgen.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5 ml-1">ntnextgen.com <ExternalLink className="w-3 h-3" /></a>
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('gui')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'gui'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ค่าที่ต้องกรอกใน FreePBX GUI
          </button>
          <button
            onClick={() => setActiveSubTab('raw_conf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'raw_conf'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Asterisk pjsip.conf (Raw)
          </button>
          <button
            onClick={() => setActiveSubTab('bash_verify')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'bash_verify'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CLI Verification (sngrep)
          </button>
        </div>
      </div>

      {/* Input Parameters Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Username / DID หมายเลข
          </label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => onChange({ username: e.target.value, pilotNumber: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Password for VoIP Devices
          </label>
          <input
            type="text"
            value={config.secret}
            onChange={(e) => onChange({ secret: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            SIP Domain (NT NextGen)
          </label>
          <input
            type="text"
            value={config.sipServer}
            onChange={(e) => onChange({ sipServer: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            SIP Proxy (Outbound Proxy)
          </label>
          <input
            type="text"
            value={config.outboundProxy}
            onChange={(e) => onChange({ outboundProxy: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'gui' && (
        <div className="space-y-4">
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-emerald-300">ขั้นตอนการสร้างบน FreePBX Web Admin: </span>
              เข้าสู่เมนู <code className="bg-slate-800 text-white px-1.5 py-0.5 rounded">Connectivity</code> ➔ <code className="bg-slate-800 text-white px-1.5 py-0.5 rounded">Trunks</code> ➔ คลิก <code className="bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">+ Add Trunk</code> ➔ เลือก <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">+ Add SIP (chan_pjsip) Trunk</code> แล้วกรอกตามตารางด้านล่างนี้
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* General Tab Settings */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center justify-between">
                <span>1. แถบ General</span>
                <span className="text-[11px] font-normal text-slate-400">Trunk Name & Outbound CallerID</span>
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Trunk Name:</span>
                  <span className="text-emerald-400 font-bold">NT_NEXTGEN_{config.pilotNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Outbound CallerID:</span>
                  <span className="text-white font-bold">&lt;{config.pilotNumber}&gt;</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">CID Options:</span>
                  <span className="text-slate-200">Force Trunk CID</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-sans">Maximum Channels:</span>
                  <span className="text-amber-300 font-semibold">30 (หรือตามแพ็กเกจ NT)</span>
                </div>
              </div>
            </div>

            {/* pjsip Settings Tab */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center justify-between">
                <span>2. แถบ pjsip Settings ➔ General</span>
                <span className="text-[11px] font-normal text-slate-400">NT NextGen Addressing</span>
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Username:</span>
                  <span className="text-emerald-400 font-bold">{config.username}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">Secret:</span>
                  <span className="text-amber-300 font-bold">{config.secret}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">SIP Server:</span>
                  <span className="text-cyan-300 font-bold">{config.sipServer}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-sans">SIP Server Port:</span>
                  <span className="text-slate-300 font-bold">5060</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-sans">Context:</span>
                  <span className="text-emerald-400 font-semibold">from-pstn</span>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 md:col-span-2">
              <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center justify-between">
                <span>3. แถบ pjsip Settings ➔ Advanced (หัวใจสำคัญสำหรับ NT NextGen)</span>
                <span className="text-[11px] font-normal text-slate-400">Outbound Proxy & Header Config</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Outbound Proxy (ต้องมี \;lr)</div>
                  <div className="font-mono text-amber-300 font-bold mt-0.5">
                    sip:{config.outboundProxy}:5060\;lr
                  </div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">From Domain</div>
                  <div className="font-mono text-cyan-400 font-bold mt-0.5">{config.sipServer}</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">From User</div>
                  <div className="font-mono text-emerald-400 font-bold mt-0.5">{config.pilotNumber}</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Match (Permit IP/Host)</div>
                  <div className="font-mono text-white font-semibold mt-0.5">
                    {config.sipServer},{config.outboundProxy}
                  </div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">RTP Symmetric</div>
                  <div className="font-mono text-emerald-400 font-semibold mt-0.5">Yes</div>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Rewrite Contact</div>
                  <div className="font-mono text-emerald-400 font-semibold mt-0.5">Yes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'raw_conf' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              ไฟล์คอนฟิก Asterisk PJSIP: <code className="text-cyan-400">/etc/asterisk/pjsip.custom.conf</code>
            </span>
            <button
              onClick={() => copyToClipboard(rawPjsipEndpoint, 'raw_conf')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
            >
              {copiedSection === 'raw_conf' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกเรียบร้อย!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก PJSIP Config</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[460px]">
            {rawPjsipEndpoint}
          </pre>
        </div>
      )}

      {activeSubTab === 'bash_verify' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              Terminal Verification & Troubleshooting Suite (NT NextGen)
            </span>
            <button
              onClick={() => copyToClipboard(bashVerification, 'bash_verify')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
            >
              {copiedSection === 'bash_verify' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกคำสั่งแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกชุดคำสั่ง</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[460px]">
            {bashVerification}
          </pre>
        </div>
      )}
    </div>
  );
};
