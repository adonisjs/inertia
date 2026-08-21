<!--
  Bundler-resolution smoke fixture for the svelte adapter, checked by
  svelte-check via ./tsconfig.json. Exercises real markup usage (route
  resolution, snippets, instant-visit props) that a plain .ts assertion
  cannot: whether the .svelte wrappers actually compile against genuine
  Inertia/Tuyau markup, not just their exported types.

  Negative (should-error) assertions live in ./type_assertions.spec.ts
  instead of here: svelte-check does not honor `@ts-expect-error` placed as
  an HTML comment in markup (verified — the diagnostic still surfaces), so
  "this must fail to compile" cases are checked as plain TS statements in a
  <script> block there, where `@ts-expect-error` works normally.
-->
<script lang="ts">
  import { Link, Form } from '../../../src/client/svelte/index.ts'
  import type { FormSlotProps } from '../../../src/client/svelte/types.ts'
</script>

<Link route="users.show" routeParams={{ id: '1' }}>View user</Link>
<Link route="users.index" qs={{ page: 2 }}>All users</Link>
<Link href="/about">About</Link>
<Link href="/logout" method="post">Logout</Link>
<Link
  route="users.show"
  routeParams={{ id: '1' }}
  instant
  component="users/show"
  pageProps={() => ({ user: { id: 1 } })}
>
  Instant visit
</Link>

<!--
  Route mode with a bare, unannotated snippet parameter: the destructured
  bindings must narrow from the `route` prop alone. `getData().email` and
  `reset('email')` are read here on purpose — they only compile if the
  form-data shape resolved to `users.store`'s declared body rather than to a
  free-form record or the union of every route body.
-->
<Form route="users.store">
  {#snippet children({ errors, processing, getData, reset })}
    <input type="text" name="email" value={getData().email} />
    {#if errors.email}<div>{errors.email}</div>{/if}
    <button type="submit" disabled={processing}>Create</button>
    <button type="button" onclick={() => reset('email', 'remember')}>Reset</button>
  {/snippet}
</Form>

<!--
  Route mode on a route with a different body, so a single fixture cannot
  pass by accident against one shared shape.
-->
<Form route="posts.update" routeParams={{ id: '1' }}>
  {#snippet children({ errors, getData })}
    <input type="text" name="title" value={getData().title} />
    {#if errors.title}<div>{errors.title}</div>{/if}
  {/snippet}
</Form>

<!--
  Action mode carries no route to derive the form-data shape from, so the
  snippet parameter is annotated — the documented path for this mode.
-->
<Form action={{ url: '/users', method: 'post' }}>
  {#snippet children({ processing }: FormSlotProps<{ email: string }>)}
    <button type="submit" disabled={processing}>Create</button>
  {/snippet}
</Form>
