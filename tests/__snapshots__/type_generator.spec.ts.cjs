exports[`InertiaPageTypesGenerator > generates types for React pages 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     import type React from 'react'

/**
* Extracts the props type from a React component
*/
type PropsFrom<TComponent> = TComponent extends React.FC<infer Props>
 ? Props
 : TComponent extends React.Component<infer Props>
 ? Props
 : never

/**
* Extracts the props type from an Inertia page component's default export
*/
type GetPageProps<T extends { default: any }> = PropsFrom<T['default']>

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
       'about': GetPageProps<typeof import('./../inertia/pages/about')>
 'home': GetPageProps<typeof import('./../inertia/pages/home')>
 'users/profile': GetPageProps<typeof import('./../inertia/pages/users/profile')>
     }"`

exports[`InertiaPageTypesGenerator > generates types for Vue pages 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     

/**
* Extracts the props type from an Inertia page component's default export
*/
type GetPageProps<T extends { default: any }> = InstanceType<T['default']>['$props']

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
       'home': GetPageProps<typeof import('./../inertia/pages/home.vue')>
 'dashboard/stats': GetPageProps<typeof import('./../inertia/pages/dashboard/stats.vue')>
     }"`

exports[`InertiaPageTypesGenerator > generates types for Svelte pages 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     import type { ComponentProps } from 'svelte'

/**
* Extracts the props type from an Inertia page component
*/
type GetPageProps<T> = ComponentProps<T>

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
       'home': GetPageProps<typeof import('./../inertia/pages/home.svelte')>
 'settings/profile': GetPageProps<typeof import('./../inertia/pages/settings/profile.svelte')>
     }"`

exports[`InertiaPageTypesGenerator > generates types for Solid pages 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     

/**
* Extracts the props type from an Inertia page component's default export
*/
type GetPageProps<T extends { default: any }> = T['default'] extends (props: infer P) => any ? P : unknown

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
       'home': GetPageProps<typeof import('./../inertia/pages/home')>
 'admin/dashboard': GetPageProps<typeof import('./../inertia/pages/admin/dashboard')>
     }"`

exports[`InertiaPageTypesGenerator > handles multiple page locations 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     

/**
* Extracts the props type from an Inertia page component's default export
*/
type GetPageProps<T extends { default: any }> = InstanceType<T['default']>['$props']

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
       'home': GetPageProps<typeof import('./../inertia/pages/home.vue')>
 'dashboard': GetPageProps<typeof import('./../inertia/admin/dashboard.vue')>
 'auth/login': GetPageProps<typeof import('./../resources/views/auth/login.vue')>
     }"`

exports[`InertiaPageTypesGenerator > handles nested directory structures 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     import type React from 'react'

/**
* Extracts the props type from a React component
*/
type PropsFrom<TComponent> = TComponent extends React.FC<infer Props>
 ? Props
 : TComponent extends React.Component<infer Props>
 ? Props
 : never

/**
* Extracts the props type from an Inertia page component's default export
*/
type GetPageProps<T extends { default: any }> = PropsFrom<T['default']>

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
       'auth/login': GetPageProps<typeof import('./../inertia/pages/auth/login')>
 'admin/users/index': GetPageProps<typeof import('./../inertia/pages/admin/users/index')>
 'admin/users/[id]/edit': GetPageProps<typeof import('./../inertia/pages/admin/users/[id]/edit')>
     }"`

exports[`InertiaPageTypesGenerator > handles empty pages gracefully 1`] = `"/**
      * Generated file. Do not edit manually.
      * This file contains type definitions for all Inertia pages.
      */

     import type React from 'react'

/**
* Extracts the props type from a React component
*/
type PropsFrom<TComponent> = TComponent extends React.FC<infer Props>
 ? Props
 : TComponent extends React.Component<infer Props>
 ? Props
 : never

/**
* Extracts the props type from an Inertia page component's default export
*/
type GetPageProps<T extends { default: any }> = PropsFrom<T['default']>

     /**
      * Type-safe mapping of all Inertia pages and their expected props
      */
     export interface InertiaPages {
     
     }"`

