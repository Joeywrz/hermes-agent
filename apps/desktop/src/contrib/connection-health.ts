import { useMemo } from 'react'

import { useContributions } from './react/use-contributions'
import type { Contribution, ContributionSource } from './types'

export const CONNECTION_HEALTH_AREA = 'connections.health'

export type ConnectionHealthReason =
  | 'healthy'
  | 'auth_required'
  | 'service_unreachable'
  | 'permission_required'
  | 'not_installed'
  | 'not_configured'
  | 'stale'
  | 'check_failed'

export type ConnectionHealthRepair =
  | { kind: 'message'; message: string }
  | { kind: 'route'; path: string }

export interface ConnectionHealthResult {
  id: string
  name: string
  icon?: string
  status?: string
  reason: ConnectionHealthReason
  detail?: string
  checkedAt: number
  staleAfterMs?: number
  repair?: ConnectionHealthRepair
}

export interface ConnectionHealthProvider {
  name?: string
  icon?: string
  repair?: ConnectionHealthRepair
  load: () => Promise<readonly ConnectionHealthResult[]> | readonly ConnectionHealthResult[]
}

export interface RegisteredConnectionHealthProvider extends ConnectionHealthProvider {
  id: string
  source: ContributionSource
}

function isProvider(value: unknown): value is ConnectionHealthProvider {
  return typeof value === 'object' && value !== null && typeof (value as { load?: unknown }).load === 'function'
}

function isRepair(value: unknown): value is ConnectionHealthRepair {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const repair = value as { kind?: unknown; message?: unknown; path?: unknown }

  if (repair.kind === 'message') {
    return typeof repair.message === 'string'
  }

  return repair.kind === 'route'
    && typeof repair.path === 'string'
    && repair.path.startsWith('/')
    && !repair.path.startsWith('//')
}

function safeHealthResults(value: unknown): readonly ConnectionHealthResult[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap(item => {
    if (typeof item !== 'object' || item === null) {
      return []
    }

    const result = item as ConnectionHealthResult & { repair?: unknown }

    if (result.repair === undefined || isRepair(result.repair)) {
      return [result]
    }

    const { repair: _unsafeRepair, ...safeResult } = result

    return [safeResult as ConnectionHealthResult]
  })
}

export function connectionHealthProviders(
  contributions: readonly Contribution[]
): RegisteredConnectionHealthProvider[] {
  return contributions.flatMap(contribution => {
    if (!isProvider(contribution.data)) {
      return []
    }

    const provider = contribution.data

    return [{
      ...(typeof provider.icon === 'string' ? { icon: provider.icon } : {}),
      id: contribution.id,
      load: async () => safeHealthResults(await provider.load()),
      ...(typeof provider.name === 'string' ? { name: provider.name } : {}),
      ...(isRepair(provider.repair) ? { repair: provider.repair } : {}),
      source: contribution.source ?? 'core'
    }]
  })
}

export function useConnectionHealthProviders(): RegisteredConnectionHealthProvider[] {
  const contributions = useContributions(CONNECTION_HEALTH_AREA)

  return useMemo(() => connectionHealthProviders(contributions), [contributions])
}
