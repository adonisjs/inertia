import { createRef } from 'react'
import type { FormComponentRef } from '@inertiajs/core'

import { Form } from '../../src/client/react/form.tsx'

type RouteBody = { email: string; remember?: boolean }

const ref = createRef<FormComponentRef<RouteBody>>()
const invalidRef = createRef<FormComponentRef<{ name: string }>>()

export function RouteForm() {
  return (
    <Form
      route="users.store"
      ref={ref}
      resetOnSuccess={['email', 'remember']}
      resetOnError={['email']}
      transform={(data) => ({ ...data, email: data.email.trim() })}
    >
      {({ errors, getData, reset }) => {
        errors.email
        getData().email
        reset('email', 'remember')

        // @ts-expect-error unknown route body field
        errors.unknown
        // @ts-expect-error unknown route body field
        getData().unknown
        // @ts-expect-error unknown route body field
        reset('unknown')

        return null
      }}
    </Form>
  )
}

export function InvalidRouteFormRef() {
  return (
    // @ts-expect-error ref body must match the selected route body
    <Form route="users.store" ref={invalidRef} />
  )
}

export function InvalidRouteResetOptions() {
  return (
    // @ts-expect-error unknown route body field
    <Form route="users.store" resetOnSuccess={['unknown']} />
  )
}

export function DirectActionForm() {
  return (
    <Form<{ title: string }>
      action={{ url: '/posts', method: 'post' }}
      transform={(data) => ({ title: data.title.trim() })}
    >
      {({ getData, reset }) => {
        getData().title
        reset('title')

        // @ts-expect-error unknown direct-action body field
        getData().unknown

        return null
      }}
    </Form>
  )
}

export function InferredDirectActionForm() {
  return (
    <Form
      action={{ url: '/posts', method: 'post' }}
      transform={(data: { slug: string }) => ({ slug: data.slug.trim() })}
    >
      {({ getData, reset }) => {
        getData().slug
        reset('slug')

        // @ts-expect-error unknown inferred direct-action body field
        reset('unknown')

        return null
      }}
    </Form>
  )
}
