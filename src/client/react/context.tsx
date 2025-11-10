/*
 * @adonisjs/inertia
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import React from 'react'
import type { Tuyau } from '@tuyau/core/client'
import type { AdonisRegistry } from '@tuyau/core/types'

/**
 * React context for providing Tuyau client instance throughout the component tree
 */
const TuyauContext = React.createContext<Tuyau<any> | null>(null)

/**
 * Provider component that makes the Tuyau client available to child components.
 *
 * This component should wrap your entire application or the part of your
 * application that needs access to type-safe routing functionality.
 *
 */
export function TuyauProvider<R extends AdonisRegistry>(props: {
  children: React.ReactNode
  client: Tuyau<R>
}) {
  return <TuyauContext.Provider value={props.client}>{props.children}</TuyauContext.Provider>
}

/**
 * Hook to access the Tuyau client from any component within a TuyauProvider.
 *
 * Provides type-safe access to route generation and navigation utilities.
 * Must be used within a component tree wrapped by TuyauProvider.
 *
 * @returns The Tuyau client instance with full type safety
 * @throws Error if used outside of a TuyauProvider
 */

export function useTuyau() {
  const context = React.useContext(TuyauContext)
  if (!context) throw new Error('You must wrap your app in a TuyauProvider')

  return context
}
