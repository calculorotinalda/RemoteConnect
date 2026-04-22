export interface Device {
  id: string;
  name: string;
  ip: string;
  remoteId?: string;
  status: 'online' | 'offline';
  latency?: string;
  encryption: string;
  thumbnail: string;
}

export type NavigationItem = 'devices' | 'connect' | 'settings' | 'history' | 'network' | 'logs' | 'address-book' | 'session-logs';
