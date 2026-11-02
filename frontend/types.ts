export interface TrunkConfig {
  trunkName: string;
  pilotNumber: string; // 024307709
  authType: 'ip' | 'credentials';
  sipServer: string; // sip.ntnextgen.com (or ent.ntnextgen.com: 202.129.60.39)
  sipPort: number; // 5060 or 5100
  sipDomain: string; // pbx.711shopping.com
  username: string; // 024307709
  secret: string; // HnAyT6TP@$7V
  outboundProxy: string; // res.ntnextgen.com (202.129.60.40) or ent.ntnextgen.com (202.129.60.39)
  transport: 'udp' | 'tcp' | 'tls';
  codecs: string[];
  maxContacts: number;
  context: string;
  natMode: 'yes' | 'no' | 'force_rport';
  externalIp: string; // GCP Static External IP: 34.142.220.2
  localSubnet: string; // GCP Internal Subnet: 10.148.0.0/20
  customerSelfCareUrl?: string; // https://ntnextgen.com
}

export interface NtNetworkSpec {
  entDomain: string; // ent.ntnextgen.com (202.129.60.39:5060, 5061)
  resDomain: string; // res.ntnextgen.com (202.129.60.40:5100, 443)
  rtpIps: string[]; // 202.129.60.9, 202.129.60.14, 202.129.60.19
  rtpPortRange: string; // 16384 - 65535 UDP
}

export interface YealinkT30Config {
  extension: string; // 1001
  displayName: string; // Agent Desk (Yealink T30)
  secret: string;
  transport: 'udp' | 'tcp' | 'tls';
  serverHost: string; // pbx.711shopping.com or 34.142.220.2
  sipPort: number; // 5060
  dtmfType: 'RFC2833' | 'Inband' | 'SIP_INFO';
  codecs: string[]; // PCMA, PCMU, G729
  ringTimeoutSeconds: number;
  blfKeySupervisor: string; // *555 (Spy/Whisper)
  handoverFeatureCode: string; // ## or *2
}

export interface GcpVmSpec {
  instanceName: string;
  machineType: string;
  zone: string;
  externalStaticIp: string;
  vpcNetwork: string;
  firewallRulesCreated: boolean;
}

export interface FahsaiAiBridgeConfig {
  aiEndpointUrl: string;
  streamProtocol: 'audiosocket' | 'websocket_ari' | 'external_media';
  audioFormat: 'slin16' | 'alaw' | 'ulaw';
  sampleRate: 8000 | 16000 | 24000;
  audioSocketPort: number;
  dtmfDetection: boolean;
  bargeInEnabled: boolean;
  sentimentAnalysis: boolean;
  callTimeoutSeconds: number;
  fallbackExtension: string; // 1001 (Yealink T30)
  routingMode: 'ai_first_handover' | 'simultaneous_ring' | 'supervisor_whisper';
}

export interface DialPlanRule {
  id: string;
  name: string;
  description: string;
  prepend: string;
  prefix: string;
  matchPattern: string;
  callerId: string;
  example: string;
}

export interface SipLogEntry {
  timestamp: string;
  direction: 'IN' | 'OUT';
  protocol: 'SIP' | 'RTP' | 'PJSIP_SYS';
  raw: string;
  statusText: string;
}

// Safe clipboard copy function with fallback for iframe / permissions policy restricted environments
export const safeCopyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // Fallback to execCommand if navigator.clipboard is blocked by Permissions Policy
  }

  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (fallbackErr) {
    console.warn('Fallback clipboard copy failed:', fallbackErr);
  }
  return false;
};
