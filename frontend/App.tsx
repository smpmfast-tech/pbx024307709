import React, { useState } from 'react';
import { TrunkConfig, YealinkT30Config } from './types';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { PjsipGenerator } from './components/PjsipGenerator';
import { DialplanArchitect } from './components/DialplanArchitect';
import { ServerDeploymentGuide } from './components/ServerDeploymentGuide';
import { VoiceAiConsultant } from './components/VoiceAiConsultant';
import { FahsaiAiVoiceBridge } from './components/FahsaiAiVoiceBridge';
import { ProductionReadinessAudit } from './components/ProductionReadinessAudit';
import { YealinkGcpProvisioning } from './components/YealinkGcpProvisioning';
import { SecuritySafeVaultModal } from './components/SecuritySafeVaultModal';
import { SecretRotationManager } from './components/SecretRotationManager';
import { StepByStepWizard } from './components/StepByStepWizard';
import {
  PhoneCall,
  Server,
  Network,
  Shield,
  Route,
  Terminal,
  Activity,
  Layers,
  HelpCircle,
  ExternalLink,
  Bot,
  Zap,
  Globe,
  AlertOctagon,
  CheckCircle2,
  PhoneForwarded,
  Cloud,
  Lock,
  KeyRound,
  RefreshCw,
  ListOrdered
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'wizard' | 'topology' | 'rotation' | 'yealink' | 'audit' | 'fahsaiai' | 'pjsip' | 'dialplan' | 'server' | 'ai'>('wizard');

  // Core PBX & NT Trunk State configured with user's verified NT NextGen credentials & GCP instance 34.142.220.2
  const [trunkConfig, setTrunkConfig] = useState<TrunkConfig>({
    trunkName: 'NT_NEXTGEN_024307709',
    pilotNumber: '024307709',
    authType: 'credentials',
    sipServer: 'sip.ntnextgen.com', // Verified NT NextGen SIP Domain
    sipPort: 5060,
    sipDomain: 'pbx.711shopping.com',
    username: '024307709', // Verified Username
    secret: 'HnAyT6TP@$7V', // Verified Password for VoIP Devices
    outboundProxy: 'res.ntnextgen.com', // Verified SIP Proxy
    transport: 'udp',
    codecs: ['alaw', 'ulaw', 'g729'],
    maxContacts: 1,
    context: 'from-pstn-custom',
    natMode: 'yes',
    externalIp: '34.142.220.2', // Verified GCP Compute Engine External IP created by user
    localSubnet: '10.148.0.0/20', // Verified GCP Internal Subnet (10.148.0.3)
    customerSelfCareUrl: 'https://ntnextgen.com'
  });

  const fahsaiUrl = 'https://genai-app-fahsaiaivoicetelesales-al-1-17935438439-413450112749.asia-southeast1.run.app/';
  const yealinkExt = '1001';

  const handleUpdateConfig = (updated: Partial<TrunkConfig>) => {
    setTrunkConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdateSecretOnly = (newSecret: string) => {
    setTrunkConfig((prev) => ({ ...prev, secret: newSecret }));
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans">
      {/* Top Enterprise Header */}
      <header className="border-b border-slate-800 bg-[#0d1527]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  NT VoIP Gateway ⇄ Asterisk GCP VM ⇄ [น้องฟ้าใส + Yealink T30]
                </h1>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  ASTERISK 23.5 UP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                DID: <span className="text-emerald-400 font-mono font-bold">024307709</span> | 
                VM IP: <span className="text-cyan-300 font-mono font-semibold">{trunkConfig.externalIp}</span> | 
                Desk: <span className="text-amber-300 font-mono font-bold">Yealink T30 (Ext {yealinkExt})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('wizard')}
              className="flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-500 transition-colors cursor-pointer font-bold"
            >
              <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
              <span>ขั้นตอนติดตั้ง สเตปบายสเตป</span>
            </button>

            <a
              href={fahsaiUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/60 px-3 py-1.5 rounded-lg border border-purple-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>น้องฟ้าใส Web App</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>

            <button
              onClick={() => setActiveTab('audit')}
              className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs px-3 py-1.5 rounded-lg font-mono flex items-center gap-2 hover:bg-emerald-900/80 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>IP & รหัส พร้อมใช้</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2 border-t border-slate-800/60 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'wizard'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-400/90 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>ทำทีละ 1 สเตป (กำลังทำสเตป 3: ใส่รหัส NT)</span>
          </button>

          <button
            onClick={() => setActiveTab('topology')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'topology'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>ผังสถาปัตยกรรม (GCP Center Hub)</span>
          </button>

          <button
            onClick={() => setActiveTab('rotation')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'rotation'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-300" />
            <span>บันทึก/เปลี่ยนรหัสผ่านหลังบ้าน (Rotation)</span>
          </button>

          <button
            onClick={() => setActiveTab('yealink')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'yealink'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400/90 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <PhoneForwarded className="w-4 h-4 text-amber-300" />
            <span>Yealink T30 (บนโต๊ะทำงาน) & GCP</span>
          </button>

          <button
            onClick={() => setActiveTab('fahsaiai')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'fahsaiai'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-300" />
            <span>เชื่อมต่อน้องฟ้าใส (AudioSocket Stream)</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'audit'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-rose-300" />
            <span>ตรวจความพร้อมโทรจริง (5 ข้อ)</span>
          </button>

          <button
            onClick={() => setActiveTab('pjsip')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'pjsip'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>PJSIP Trunk Config ({trunkConfig.sipServer})</span>
          </button>

          <button
            onClick={() => setActiveTab('dialplan')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'dialplan'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Dialplan & Thai Routes (DID 024307709)</span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'server'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>ติดตั้ง Server & SSL (pbx.711shopping.com)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'ai'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>AI Voice Consultant (Gemini)</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Step-by-Step Wizard view */}
        {activeTab === 'wizard' && (
          <StepByStepWizard config={trunkConfig} />
        )}

        {/* Tab Views */}
        {activeTab === 'topology' && (
          <ArchitectureDiagram
            pilotNumber={trunkConfig.pilotNumber}
            fqdn={trunkConfig.sipDomain}
            sipServer={trunkConfig.sipServer}
            transport={trunkConfig.transport}
            aiEndpointUrl={fahsaiUrl}
            yealinkExtension={yealinkExt}
          />
        )}

        {activeTab === 'rotation' && (
          <SecretRotationManager
            config={trunkConfig}
            onUpdateSecret={handleUpdateSecretOnly}
          />
        )}

        {activeTab === 'yealink' && (
          <YealinkGcpProvisioning
            pilotNumber={trunkConfig.pilotNumber}
            fqdn={trunkConfig.sipDomain}
            sipServer={trunkConfig.sipServer}
          />
        )}

        {activeTab === 'fahsaiai' && (
          <FahsaiAiVoiceBridge
            pilotNumber={trunkConfig.pilotNumber}
            fqdn={trunkConfig.sipDomain}
            sipServer={trunkConfig.sipServer}
          />
        )}

        {activeTab === 'audit' && (
          <ProductionReadinessAudit
            pilotNumber={trunkConfig.pilotNumber}
            fqdn={trunkConfig.sipDomain}
            sipServer={trunkConfig.sipServer}
            outboundProxy={trunkConfig.outboundProxy}
            secret={trunkConfig.secret}
            aiEndpointUrl={fahsaiUrl}
          />
        )}

        {activeTab === 'pjsip' && (
          <PjsipGenerator config={trunkConfig} onChange={handleUpdateConfig} />
        )}

        {activeTab === 'dialplan' && (
          <DialplanArchitect pilotNumber={trunkConfig.pilotNumber} />
        )}

        {activeTab === 'server' && (
          <ServerDeploymentGuide fqdn={trunkConfig.sipDomain} />
        )}

        {activeTab === 'ai' && (
          <VoiceAiConsultant
            pilotNumber={trunkConfig.pilotNumber}
            fqdn={trunkConfig.sipDomain}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0a0f1d] py-4 text-center text-xs text-slate-500">
        <p>
          ระบบสถาปัตยกรรมโทรคมนาคมเสียงศูนย์กลาง: <b>Asterisk VM บน GCP ({trunkConfig.externalIp})</b> 
          เชื่อมต่อ <b>NT NextGen ({trunkConfig.outboundProxy})</b> ⇄ <span className="text-purple-400 font-semibold">น้องฟ้าใส (Cloud Run)</span> ⇄ <span className="text-amber-400 font-semibold">Yealink T30 (Ext 1001)</span>
        </p>
      </footer>
    </div>
  );
}
