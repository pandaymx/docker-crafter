export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  labels: Record<string, string>;
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
