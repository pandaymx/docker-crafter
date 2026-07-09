import { describe, expect, it } from 'bun:test';
import type { ContainerInfo } from '../types';
import { getHealthStatus } from './useContainers';

describe('getHealthStatus', () => {
  // Helper to create a partial ContainerInfo
  const createContainer = (
    overrides: Partial<ContainerInfo>,
  ): ContainerInfo => {
    return {
      id: '123',
      name: 'test-container',
      image: 'test-image',
      state: 'running',
      status: 'Up 2 hours',
      labels: {},
      ...overrides,
    };
  };

  describe('Happy Path', () => {
    it('returns "running" when state is running and status does not mention unhealthy', () => {
      const container = createContainer({
        state: 'running',
        status: 'Up 2 hours',
      });
      expect(getHealthStatus(container)).toBe('running');
    });
  });

  describe('Unhealthy scenarios', () => {
    it('returns "unhealthy" when state is running and status includes "unhealthy" (lowercase)', () => {
      const container = createContainer({
        state: 'running',
        status: 'Up 2 hours (unhealthy)',
      });
      expect(getHealthStatus(container)).toBe('unhealthy');
    });

    it('returns "unhealthy" when state is running and status includes "UNHEALTHY" (uppercase)', () => {
      const container = createContainer({
        state: 'running',
        status: 'Up 2 hours (UNHEALTHY)',
      });
      expect(getHealthStatus(container)).toBe('unhealthy');
    });
  });

  describe('Graceful Exit', () => {
    it('returns "stopped" when state is exited and status includes "(0)"', () => {
      const container = createContainer({
        state: 'exited',
        status: 'Exited (0) 2 hours ago',
      });
      expect(getHealthStatus(container)).toBe('stopped');
    });
  });

  describe('Crash / Warning states', () => {
    it('returns "unhealthy" when state is exited and status contains a non-zero exit code', () => {
      const container = createContainer({
        state: 'exited',
        status: 'Exited (1) 2 hours ago',
      });
      expect(getHealthStatus(container)).toBe('unhealthy');
    });

    it('returns "unhealthy" when state is exited with an out of memory error code (137)', () => {
      const container = createContainer({
        state: 'exited',
        status: 'Exited (137) 2 hours ago',
      });
      expect(getHealthStatus(container)).toBe('unhealthy');
    });

    it('returns "unhealthy" when state is dead', () => {
      const container = createContainer({ state: 'dead', status: 'Dead' });
      expect(getHealthStatus(container)).toBe('unhealthy');
    });

    it('returns "unhealthy" when state is created', () => {
      const container = createContainer({
        state: 'created',
        status: 'Created',
      });
      expect(getHealthStatus(container)).toBe('unhealthy');
    });
  });

  describe('Edge Cases & Fallbacks', () => {
    it('returns "stopped" for an unknown state', () => {
      const container = createContainer({
        state: 'unknown_state',
        status: 'Unknown',
      });
      expect(getHealthStatus(container)).toBe('stopped');
    });

    it('returns "stopped" when container is missing state', () => {
      const container = createContainer({
        state: undefined as any,
        status: 'Up 2 hours',
      });
      expect(getHealthStatus(container)).toBe('stopped');
    });

    it('returns "stopped" when container is missing status', () => {
      const container = createContainer({
        state: 'running',
        status: undefined as any,
      });
      expect(getHealthStatus(container)).toBe('stopped');
    });

    it('returns "running" when state is running and status is an empty string', () => {
      const container = createContainer({ state: 'running', status: '' });
      expect(getHealthStatus(container)).toBe('running');
    });

    it('returns "stopped" when container object is null', () => {
      expect(getHealthStatus(null as any)).toBe('stopped');
    });
  });
});
