export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  labels: Record<string, string>;
  ports?: string[] | null;
  cpuUsage?: number;
  memoryUsage?: number;
  memoryLimit?: number;
}

export type HealthStatus = 'running' | 'unhealthy' | 'stopped';

export interface ContainerWithHealth extends ContainerInfo {
  healthStatus: HealthStatus;
}

export interface Workspace {
  name: string;
  type: 'compose' | 'custom' | 'standalone';
  containers: ContainerWithHealth[];
  runningCount: number;
  totalCount: number;
}

export interface ProjectWorkspace {
  projectName: string;
  isCompose: boolean;
  containers: ContainerInfo[];
  engineName: string;
}

export interface LogMessage {
  type: "stdout" | "stderr";
  data: string;
}

export type TerminalMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number };

export interface DockerEvent {
  action: string;
  actorId: string;
  engineName: string;
}
