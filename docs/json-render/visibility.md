<!-- source: https://json-render.dev/docs/visibility -->
# Visibility

Conditionally show or hide components based on state values and logic.

## State-Based Visibility

Show/hide based on state values using `$state` with a JSON Pointer path:

```json
{
  "type": "Alert",
  "props": { "message": "Form has errors" },
  "visible": { "$state": "/form/hasErrors" }
}
```

### Negation

Invert a condition with `"not": true`:

```json
{
  "type": "WelcomeBanner",
  "visible": { "$state": "/user/hasSeenWelcome", "not": true }
}
```

## Auth-Based Visibility

Show/hide based on authentication state by exposing auth state in the model:

```json
{
  "type": "AdminPanel",
  "visible": { "$state": "/auth/isSignedIn" }
}
```

For signed-out only, use negation.

## Comparison Operators

Compare state values to literals or other state paths. Only one operator per condition is evaluated (precedence: `eq` > `neq` > `gt` > `gte` > `lt` > `lte`).

```json
// Equal
{ "visible": { "$state": "/user/role", "eq": "admin" } }

// Not equal
{ "visible": { "$state": "/tab", "neq": "home" } }

// Greater than / Greater or equal / Less than / Less or equal
{ "visible": { "$state": "/cart/total", "gt": 100 } }
{ "visible": { "$state": "/cart/itemCount", "gte": 1 } }
{ "visible": { "$state": "/cart/total", "lt": 1000 } }
{ "visible": { "$state": "/cart/itemCount", "lte": 10 } }
```

Comparison values can be literals or state references:

```json
{
  "visible": { "$state": "/user/balance", "gte": { "$state": "/order/minimum" } }
}
```

## Combining Conditions (AND)

Place multiple conditions in an array for implicit AND:

```json
{
  "type": "SubmitButton",
  "visible": [
    { "$state": "/form/isValid" },
    { "$state": "/form/hasChanges" }
  ]
}
```

## OR Conditions

Use `$or` when at least one condition should be true:

```json
{
  "type": "SpecialOffer",
  "visible": { "$or": [
    { "$state": "/user/isVIP" },
    { "$state": "/cart/total", "gt": 200 }
  ]}
}
```

## Explicit AND

Use `$and` when nesting AND logic inside `$or`:

```json
{
  "type": "PromoCard",
  "visible": { "$or": [
    { "$and": [
      { "$state": "/user/isVIP" },
      { "$state": "/cart/total", "gt": 50 }
    ]},
    { "$state": "/promo/active" }
  ]}
}
```

## Always / Never

Use boolean literals for constant visibility:

```json
{ "type": "Footer", "visible": true }
{ "type": "DeprecatedPanel", "visible": false }
```

## Repeat-Scoped Conditions

Inside a repeat, use `$item` and `$index` for item-based visibility:

### `$item` — Condition on item field

```json
{
  "type": "Badge",
  "props": { "label": "Overdue" },
  "visible": { "$item": "isOverdue" }
}
```

With comparison:

```json
{
  "type": "DiscountTag",
  "visible": { "$item": "price", "gt": 100 }
}
```

### `$index` — Condition on array index

```json
{
  "type": "Divider",
  "visible": { "$index": true, "gt": 0 }
}
```

## Complex Example

```json
{
  "type": "RefundButton",
  "props": { "label": "Process Refund" },
  "visible": [
    { "$state": "/auth/isSignedIn" },
    { "$state": "/user/role", "eq": "support" },
    { "$state": "/order/amount", "gt": 0 },
    { "$state": "/order/isRefunded", "not": true }
  ]
}
```

## Usage with React

Wrap your app with `VisibilityProvider` to enable conditional rendering:

```javascript
import { VisibilityProvider, StateProvider } from '@json-render/react';

function App() {
  return (
    <StateProvider initialState={data}>
      <VisibilityProvider>
        {/* Components can now use visibility conditions */}
      </VisibilityProvider>
    </StateProvider>
  );
}
```

Use the `useIsVisible` hook for programmatic evaluation:

```javascript
import { useIsVisible } from '@json-render/react';

function ConditionalContent({ condition, children }) {
  const isVisible = useIsVisible(condition);

  if (!isVisible) return null;
  return <div>{children}</div>;
}
```
