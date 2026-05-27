# Multiple Errors Per Field

## Overview

Validation errors delivered to the client may carry **more than one message per field**. The protocol allows the value of each error entry to be either a single string or an array of strings.

## Wire format

The `errors` prop on the page object is an object keyed by field path. Each value MAY be:

- A single string containing the first error message for that field.
- An array of strings containing all error messages for that field, in the order produced by validation.

```jsonc
{
  "errors": {
    "email": "Email is required",
    "password": ["Must be at least 8 characters", "Must contain a number"]
  }
}
```

When an error bag is in use (request carried `X-Inertia-Error-Bag: <name>`), the same shape applies under the bag key:

```jsonc
{
  "errors": {
    "login": {
      "email": "Email is required",
      "password": ["Must be at least 8 characters", "Must contain a number"]
    }
  }
}
```

## Server behavior

Servers SHOULD expose an opt-in mode that emits the array form. The default MAY remain "first message only" for backward compatibility, but the array form must be supported as a configurable mode.

When a field has exactly one message, servers MAY collapse to a string for ergonomics. Clients tolerate both shapes.

## Client expectation

Clients consume `errors` as `Record<string, string | string[]>`. Frameworks may surface helpers that always normalize to arrays, or provide accessors for the first message.
