# Stable Callbacks: useCallback, useEffectEvent, useEventCallback

Read this when a callback's identity matters: an effect re-subscribes on every render, a memoized
child re-renders because a handler changed, or a handler reads stale state.

## Where useCallback stops helping

`useCallback(fn, deps)` keeps one function only while `deps` stay the same. A callback that must
read the latest props or state has those values in `deps`, so its identity changes whenever they
do. Leaving them out keeps the identity but freezes the values the callback sees. There is no deps
list that gives both a stable identity and fresh values; that is the gap the tools below fill.

With React Compiler, memoization is the compiler's job. The React docs recommend relying on it for
new code and keeping `useMemo` and `useCallback` as escape hatches for precise control. For existing
code they recommend leaving memoization in place, or testing carefully before removing it, since
removing it can change what the compiler produces.

## Inside effects: useEffectEvent

`useEffectEvent` (React 19.2) wraps logic that an effect runs but that should not make the effect
re-run, such as logging with the current theme when a connection opens.

- Call the function it returns only from `useEffect`, `useLayoutEffect`, `useInsertionEffect`, or
  another Effect Event in the same component.
- Never call it during render, and never pass it to other components or hooks.
- Never list it in a dependency array: its identity changes on every render by design. The linter
  (`eslint-plugin-react-hooks` at its latest version) knows this and enforces the rules above.
- Don't use it to hide a real dependency. A value the effect should react to stays in the array.

## Handlers passed down: a ref-backed callback

`useEffectEvent` cannot be passed to children, so it doesn't help a handler a memoized child
receives. When that child's re-renders are measurably costly, a ref-backed callback gives a stable
function that calls the latest one. MUI's `useEventCallback` (in `@mui/utils`) is this pattern:

```ts
import { useLayoutEffect, useRef } from 'react';

const useEventCallback = <Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
) => {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });
  return useRef((...args: Args) => latest.current(...args)).current;
};
```

- The ref is updated after commit, so calling the function during render runs the previous
  render's callback. Call it from event handlers and effects only.
- Prefer the library's copy where the repo already depends on it, over a local one.
- Reach for it only after the plain handler, or React Compiler, has shown a measured cost.

## The useEvent proposal

React never shipped `useEvent`. Its RFC (reactjs/rfcs#220) was closed after a 2022 update saying it
would be revised and possibly renamed. What shipped is `useEffectEvent`, which covers the effect
case and, unlike the proposal, cannot be passed to other components. Libraries such as MUI keep
their ref-backed version for the handler case.

## Sources

- `useEffectEvent`: <https://react.dev/reference/react/useEffectEvent>
- React 19.2: <https://react.dev/blog/2025/10/01/react-19-2>
- React Compiler: <https://react.dev/learn/react-compiler/introduction>
- `useEvent` RFC: <https://github.com/reactjs/rfcs/pull/220>
- MUI `useEventCallback`: <https://github.com/mui/material-ui/blob/master/packages/mui-utils/src/useEventCallback/useEventCallback.ts>
