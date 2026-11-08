<script lang="ts">
  import Link from '../../../src/client/svelte/link.svelte'
  import Form from '../../../src/client/svelte/form.svelte'

  let { userId }: { userId: string } = $props()
</script>

<div>
  <Link route="users.show" routeParams={{ id: userId }}>User Profile</Link>
  <Form route="users.store">
    {#snippet children({ processing })}
      <input type="text" name="email" />
      <button type="submit" disabled={processing}>Save</button>
    {/snippet}
  </Form>
</div>
