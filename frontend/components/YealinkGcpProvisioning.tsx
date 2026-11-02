import React, { useState } from 'react';
import { YealinkT30Config, GcpVmSpec, safeCopyToClipboard } from '../types';
import { 
  PhoneCall, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Settings, 
  Download, 
  Wifi, 
  Volume2, 
  Headphones,
  CheckCircle2,
  Server,
  Cloud
} from 'lucide-react';

interface Props {
  pilotNumber: string;
  fqdn: string;
  sipServer: string;
}

export const YealinkGcpProvisioning: React.FC<Props> = ({ pilotNumber, fqdn, sipServer }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'yealink_web' | 'yealink_cfg' | 'gcp_firewall' | 'asterisk_pjsip'>('yealink_web');

  const [yealinkConfig, setYealinkConfig] = useState<YealinkT30Config>({
    extension: '1001',
    displayName: '711 Shopping Desk (Yealink T30)',
    secret: 'Yealink!T30@2025Sec',
    transport: 'udp',
    serverHost: fqdn, // pbx.711shopping.com
    sipPort: 5060,
    dtmfType: 'RFC2833',
    codecs: ['PCMA', 'PCMU', 'G729'],
    ringTimeoutSeconds: 30,
    blfKeySupervisor: '*555',
    handoverFeatureCode: '##'
  });

  const [gcpSpec, setGcpSpec] = useState<GcpVmSpec>({
    instanceName: 'asterisk-freepbx-core',
    machineType: 'e2-standard-4',
    zone: 'asia-southeast1-b',
    externalStaticIp: '34.87.120.45',
    vpcNetwork: 'default',
    firewallRulesCreated: true
  });

  // Fix: use safeCopyToClipboard to avoid unhandled NotAllowedError
  const copyToClipboard = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Raw Yealink T30 Provisioning Config file (y0000000000xx.cfg or MAC.cfg)
  const yealinkCfgFileContent = `#!version:1.0.0.1
# ==============================================================================
# Yealink SIP-T30 Auto-Provisioning Configuration File
# Assigned Extension: ${yealinkConfig.extension}
# Server PBX Host: ${yealinkConfig.serverHost} (GCP Asterisk VM)
# Generated for: Senior Voice Architecture & Telecom Desk
# ==============================================================================

# Account 1 Registration Settings
account.1.enable = 1
account.1.label = 711 Shop ${yealinkConfig.extension}
account.1.display_name = ${yealinkConfig.displayName}
account.1.auth_name = ${yealinkConfig.extension}
account.1.user_name = ${yealinkConfig.extension}
account.1.password = ${yealinkConfig.secret}

# SIP Server Configuration
account.1.sip_server.1.address = ${yealinkConfig.serverHost}
account.1.sip_server.1.port = ${yealinkConfig.sipPort}
account.1.sip_server.1.transport_type = 0
account.1.sip_server.1.expires = 3600
account.1.sip_server.1.retry_counts = 3

# Audio Codecs Priority (Thai Telecom Standards)
account.1.codec.pcma.enable = 1
account.1.codec.pcma.priority = 1
account.1.codec.pcmu.enable = 1
account.1.codec.pcmu.priority = 2
account.1.codec.g729.enable = 1
account.1.codec.g729.priority = 3

# DTMF Signaling
account.1.dtmf.type = 2
account.1.dtmf.info_type = 1

# NAT Traversal (For Yealink Behind Home/Office NAT to GCP)
account.1.nat.nat_traversal = 1
account.1.nat.rport = 1
account.1.nat.stun_enable = 0

# Programmable Line / DSS Key Settings
# Key 1: Line 1
linekey.1.type = 15
linekey.1.line = 1

# Key 2: Live Spy / Whisper to น้องฟ้าใส (Supervisor Listen *555)
linekey.2.type = 16
linekey.2.value = ${yealinkConfig.blfKeySupervisor}
linekey.2.label = Spy AI (*555)
linekey.2.line = 1

# Voice Volume & Ring Settings
voice.handset.rx_volume = 8
voice.handfree.rx_volume = 8
`;

  // Asterisk PJSIP Endpoint configuration for Extension 1001
  const asteriskExtPjsipConf = `
; ==============================================================================
; Extension ${yealinkConfig.extension} (Yealink T30 Desk Phone) PJSIP Configuration
; File: /etc/asterisk/pjsip.endpoint.conf OR FreePBX Web GUI Ext ${yealinkConfig.extension}
; ==============================================================================

[${yealinkConfig.extension}]
type=endpoint
context=from-internal
disallow=all
allow=alaw,ulaw,g729
auth=${yealinkConfig.extension}
aors=${yealinkConfig.extension}
callerid="${yealinkConfig.displayName}" <${yealinkConfig.extension}>
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
ice_support=yes
timers=yes
timers_min_se=90
send_rpid=yes
send_pai=yes
language=th

[${yealinkConfig.extension}]
type=auth
auth_type=userpass
username=${yealinkConfig.extension}
password=${yealinkConfig.secret}

[${yealinkConfig.extension}]
type=aor
max_contacts=2
qualify_frequency=15
qualify_timeout=3.0
remove_existing=yes

; --- Supervisor Spy / Whisper Dialplan Feature (*555) ---
; ให้พนักงานที่เครื่อง Yealink T30 กด *555 เพื่อแอบฟังสายน้องฟ้าใสแบบเรียลไทม์
; วางใน /etc/asterisk/extensions_custom.conf
; exten => *555,1,NoOp(Supervisor ChanSpy on Fahsai AI Call)
;  same => n,Authenticate(1234)
;  same => n,ChanSpy(PJSIP/NT_TRUNK_${pilotNumber},wq)
;  same => n,Hangup()
`;

  // GCP Cloud Firewall rules
  const gcpCliFirewall = `# ==============================================================================
# GCP Compute Engine Firewall Rules for FreePBX / Asterisk
# Execute in Google Cloud Shell or with gcloud CLI
# ==============================================================================

# 1. อนุญาตสัญญาณ SIP Signaling (NT Trunk + Yealink T30 Desk Phone)
gcloud compute firewall-rules create allow-asterisk-sip \\
    --direction=INGRESS \\
    --priority=1000 \\
    --network=${gcpSpec.vpcNetwork} \\
    --action=ALLOW \\
    --rules=udp:5060,tcp:5060,tcp:5061 \\
    --source-ranges=0.0.0.0/0 \\
    --target-tags=asterisk-server \\
    --description="Allow SIP Signaling from NT Telecom and Yealink Phones"

# 2. อนุญาตสัญญาณเสียงสนทนา RTP Audio Media (10000-20000 UDP)
gcloud compute firewall-rules create allow-asterisk-rtp \\
    --direction=INGRESS \\
    --priority=1000 \\
    --network=${gcpSpec.vpcNetwork} \\
    --action=ALLOW \\
    --rules=udp:10000-20000 \\
    --source-ranges=0.0.0.0/0 \\
    --target-tags=asterisk-server \\
    --description="Allow RTP voice audio streams from NT and Yealink T30"

# 3. อนุญาต AudioSocket สตรีมสองทางกับ น้องฟ้าใส (Port 9092)
gcloud compute firewall-rules create allow-audiosocket-stream \\
    --direction=INGRESS \\
    --priority=1000 \\
    --network=${gcpSpec.vpcNetwork} \\
    --action=ALLOW \\
    --rules=tcp:9092 \\
    --source-ranges=0.0.0.0/0 \\
    --target-tags=asterisk-server \\
    --description="Allow AudioSocket bi-directional stream to Cloud Run"

# 4. อนุญาต HTTPS และ HTTP สำหรับ FreePBX Web GUI & Let's Encrypt
gcloud compute firewall-rules create allow-freepbx-web \\
    --direction=INGRESS \\
    --priority=1000 \\
    --network=${gcpSpec.vpcNetwork} \\
    --action=ALLOW \\
    --rules=tcp:80,tcp:443 \\
    --source-ranges=0.0.0.0/0 \\
    --target-tags=asterisk-server \\
    --description="Allow FreePBX Admin Web and SSL Certbot"
`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-900/40 border border-amber-500/50 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ตั้งค่าเครื่องโทรศัพท์ตั้งโต๊ะ Yealink T30 (Ext {yealinkConfig.extension}) & GCP Firewall
                <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">
                  DESK PHONE READY
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            คอนฟิกเชื่อมต่อ Yealink SIP-T30 บนโต๊ะทำงานเข้ากับ Asterisk VM บน GCP (<span className="text-cyan-300 font-mono">{fqdn}</span>) เพื่อรับสายโอนจากน้องฟ้าใส
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('yealink_web')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'yealink_web'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ค่ากรอกหน้าเว็บ Yealink Web UI
          </button>
          <button
            onClick={() => setActiveTab('yealink_cfg')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'yealink_cfg'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ไฟล์ Auto-Provision (y0000000000xx.cfg)
          </button>
          <button
            onClick={() => setActiveTab('asterisk_pjsip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'asterisk_pjsip'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Asterisk Ext 1001 Config
          </button>
          <button
            onClick={() => setActiveTab('gcp_firewall')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gcp_firewall'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            GCP Firewall Rules (gcloud)
          </button>
        </div>
      </div>

      {/* Editable Yealink Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 mb-6 text-xs">
        <div>
          <label className="text-slate-400 font-medium block mb-1">เบอร์ภายใน (Extension)</label>
          <input
            type="text"
            value={yealinkConfig.extension}
            onChange={(e) => setYealinkConfig({ ...yealinkConfig, extension: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">รหัสผ่าน SIP Secret (Password)</label>
          <input
            type="text"
            value={yealinkConfig.secret}
            onChange={(e) => setYealinkConfig({ ...yealinkConfig, secret: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">SIP Server Host (GCP PBX)</label>
          <input
            type="text"
            value={yealinkConfig.serverHost}
            onChange={(e) => setYealinkConfig({ ...yealinkConfig, serverHost: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">ปุ่มดักฟัง/แทรกสายน้องฟ้าใส (DSS Key)</label>
          <input
            type="text"
            value={yealinkConfig.blfKeySupervisor}
            onChange={(e) => setYealinkConfig({ ...yealinkConfig, blfKeySupervisor: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Tab: Yealink Web UI Guide */}
      {activeTab === 'yealink_web' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
            <Wifi className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-amber-300">วิธีเปิดหน้าคอนฟิก Yealink T30 บนโต๊ะทำงาน: </span>
              กดปุ่ม <code className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">OK</code> บนเครื่อง Yealink T30 
              เพื่อดูหมายเลข IP บนหน้าจอ LCD (เช่น 192.168.1.50) แล้วนำมาเปิดบนเว็บบราวเซอร์ของคุณ (User/Pass ค่าโรงงาน: <b>admin / admin</b>)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Account Settings Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center justify-between">
                <span>เมนู: Account ➔ Register (Account 1)</span>
                <span className="text-[11px] text-slate-400">Yealink Web UI</span>
              </h4>
              <div className="space-y-2.5 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Line Active:</span>
                  <span className="text-emerald-400 font-bold">Enabled</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Label / Display Name:</span>
                  <span className="text-white">{yealinkConfig.displayName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Register Name:</span>
                  <span className="text-amber-400 font-bold">{yealinkConfig.extension}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">User Name:</span>
                  <span className="text-amber-400 font-bold">{yealinkConfig.extension}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Password:</span>
                  <span className="text-rose-300 font-bold">{yealinkConfig.secret}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Server Host:</span>
                  <span className="text-cyan-300 font-bold">{yealinkConfig.serverHost}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Port:</span>
                  <span className="text-slate-300">{yealinkConfig.sipPort}</span>
                </div>
              </div>
            </div>

            {/* NAT & Audio Codecs Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center justify-between">
                <span>เมนู: Account ➔ Advanced & Codec</span>
                <span className="text-[11px] text-slate-400">สำคัญมากสำหรับ NAT ข้ามไป GCP</span>
              </h4>
              <div className="space-y-2.5 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">NAT Traversal:</span>
                  <span className="text-emerald-400 font-bold">STUN (Disabled) / rport (Enabled)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">DTMF Type:</span>
                  <span className="text-white">RFC2833 (Payload 101)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Enable Codecs:</span>
                  <span className="text-cyan-300 font-bold">1. PCMA (G.711a), 2. PCMU</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Transport:</span>
                  <span className="text-white font-bold">UDP</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">DSS Key 2 (ปุ่มด่วน):</span>
                  <span className="text-emerald-400 font-bold">Speed Dial / ChanSpy: {yealinkConfig.blfKeySupervisor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Yealink Configuration File (.cfg) */}
      {activeTab === 'yealink_cfg' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              ไฟล์คอนฟิกสำหรับอัปโหลดเข้าเมนู Settings ➔ Configuration ➔ Import CFG หรือ TFTP Provisioning
            </span>
            <button
              onClick={() => copyToClipboard(yealinkCfgFileContent, 'yealink_cfg')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
            >
              {copiedKey === 'yealink_cfg' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกไฟล์ CFG แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก Yealink T30 CFG</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-amber-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[440px]">
            {yealinkCfgFileContent}
          </pre>
        </div>
      )}

      {/* Tab: Asterisk PJSIP Endpoint Configuration */}
      {activeTab === 'asterisk_pjsip' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              คอนฟิกฝั่งเซิร์ฟเวอร์ Asterisk สำหรับ Extension {yealinkConfig.extension}
            </span>
            <button
              onClick={() => copyToClipboard(asteriskExtPjsipConf, 'ast_pjsip')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
            >
              {copiedKey === 'ast_pjsip' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกเรียบร้อย!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก PJSIP Conf</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[440px]">
            {asteriskExtPjsipConf}
          </pre>
        </div>
      )}

      {/* Tab: GCP Cloud Firewall Rules */}
      {activeTab === 'gcp_firewall' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-slate-400">
                ชุดคำสั่ง Google Cloud Firewall Rules (gcloud CLI)
              </span>
              <p className="text-[11px] text-slate-500">
                รันบน Google Cloud SDK เพื่อเปิดพอร์ต 5060, 10000-20000 และ 9092 บน VM ของคุณ
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(gcpCliFirewall, 'gcp_fw')}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded-lg transition-colors border border-cyan-600"
            >
              {copiedKey === 'gcp_fw' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>คัดลอก gcloud script แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกคำสั่ง gcloud</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-[440px]">
            {gcpCliFirewall}
          </pre>
        </div>
      )}
    </div>
  );
};
