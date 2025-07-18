import { Server as SocketIo, DefaultEventsMap } from 'socket.io';

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export type OmeggaSocketIo = SocketIo<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  {
    user: IStoreUser & { _id: string };
  }
>;

export interface IPlayer {
  id?: string;
  name?: string;
}

export interface IChatUser {
  id: string;
  name: string;
  web?: boolean;
  color: string;
  isFirst?: boolean;
}

export interface IStoreVersion {
  type: 'storeVersion';
  version: number;
}

export interface IStoreServerInstance {
  type: 'app:start';
  date: number;
}

export interface IStoreAutoRestartConfig {
  type: 'autoRestartConfig';
  maxUptime: number;
  maxUptimeEnabled: boolean;
  emptyUptime: number;
  emptyUptimeEnabled: boolean;
  dailyHour: number;
  dailyHourEnabled: boolean;
  announcementEnabled: boolean;
  playersEnabled: boolean;
  saveWorld: boolean;
}

export interface IStoreChat {
  type: 'chat';
  created: number;
  instanceId: string;
  action: 'msg' | 'server' | 'leave' | 'join';
  user: Partial<IChatUser>;
  message?: string;
}

export interface IStoreBanHistory {
  type: 'banHistory';
  banned: string;
  bannerId: string | null;
  created: any;
  expires: any;
  reason: string;
}

export interface IFrontendBanEntry {
  bannerId: string;
  reason: string;
  created: number;
  expires: number;
  duration: number;
  remainingTime: number;
  bannerName: string;
}

export interface IStoreKickHistory {
  type: 'kickHistory';
  kicked: string;
  kickerId: string | null;
  created: any;
  reason: string;
}

export interface IUserHistory {
  type: 'userHistory';
  id: string;
  name: string;
  nameHistory: { name: string; date: number }[];
  ips: string[];
  created: number;
  lastSeen: number;
  lastInstanceId: string;
  heartbeats: number;
  sessions: number;
  instances: number;
}

export interface IUserAgo {
  seenAgo?: number;
  createdAgo?: number;
}

export interface IUserNote {
  type: 'note';
  id: string;
  note: string;
}

export interface IStoreUser {
  type: 'user';
  created: number;
  lastOnline: number;
  username: string;
  hash: string;
  isOwner: boolean;
  roles: string[];
  playerId: string;
  isBanned?: boolean;
}

export interface IPunchcard {
  type: 'punchcard';
  kind: 'playerCount';
  created: number;
  updated: number;
  month: number;
  year: number;
  punchcard: number[][];
}
