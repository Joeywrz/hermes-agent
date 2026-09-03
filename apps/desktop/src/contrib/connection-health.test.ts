import { describe, expect, it, vi } from 'vitest'

import { CONNECTION_HEALTH_AREA, connectionHealthProviders } from './connection-health'
import type { Contribution } from './types'

describe('connectionHealthProviders', () => {
  it('returns only callable providers with host-stamped provenance', () => {
    const load = vi.fn(async () => [])

    const contributions: Contribution[] = [
      {
        area: CONNECTION_HEALTH_AREA,
        data: {
          icon: 'plug',
          load,
          name: 'Demo health',
          repair: { kind: 'route', path: '/settings?tab=plugins' }
        },
        id: 'demo:health',
        source: 'plugin:demo'
      },
      {
        area: CONNECTION_HEALTH_AREA,
        data: { load: 'not-callable' },
        id: 'broken:health',
        source: 'plugin:broken'
      }
    ]

    expect(connectionHealthProviders(contributions)).toEqual([
      {
        icon: 'plug',
        id: 'demo:health',
        load,
        name: 'Demo health',
        repair: { kind: 'route', path: '/settings?tab=plugins' },
        source: 'plugin:demo'
      }
    ])
  })
})
