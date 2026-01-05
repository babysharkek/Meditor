Review every point below carefully for files to ensure they follow consistent code style and best practices.

1. Every single function must use a destructured props object for parameters, regardless of whether there's one or multiple parameters. This applies to all functions, not just react components. Even zustand stores.
2. No `any` references.
3. JSX is clean; No comments in there explaining what each part does. Must extract JSX into sub-components (always placed below the main component). A part only needs to be extracted if it's either used in multiple places of the file OR is complex enough to be worth extracting. If a component is used acrosss multiple files, it should be extracted to a separate file.
4. General interfaces must be placed in the `types` folder. Example: `src/components/timeline/index.tsx` defining a `TimelineTrack` interface is wrong and should be moved to `src/types/timeline.ts`.
5. No AI comments — only human comments. Example of AI comments: explaining too much, code is readable without the comment, changelog-style comments, using more words than necessary, etc.
6. JSX: Use `gap-2` instead of `mb-2` or `mt-2` for consistent spacing.
7. Code is scannable. Use variables and helper functions to make intent clear at a glance. Complex code should be clean.
8. Separation of concerns: Each file should have one single purpose/responsibility. Example: `src/components/timeline/index.tsx` should not define a function to validate element track compatibility. That's a separate concern and belongs in a separate file. `src/lib/timeline-utils.ts` should not declare a TRACK_COLORS constant. That belongs in src/constants. Think carefully about what belongs in what file.
9. Files with react components must use this order for functions: main function (top) -> sub-components (below).
10. Use zustand correctly. React component should never use `someStore.getState()`. Instead, use the `useSomeStore` hook.
11. Business logic is in `src/lib` folder. Example: zustand store has a method to remove a bookmark, the method should be a wrapper of a function in `src/lib/` that handles the actual logic.
12. Booleans must be named like `isSomething` or `hasSomething` or `shouldSomething`. Not `something` or `somethingIs`.
13. No text in docs or UI ever uses title case. Example: `Hello World` is wrong. It should be `Hello world`.
14. Use `size-10` instead of `h-10 w-10` when the width and height are the same.
15. For components that need to subscribe to data from the editor api (`src/core`, `src/managers`), use the `useEditor` hook. 
16. In react components: store/manager methods should not be passed as props to sub-components. If a sub-component can access the same methods, it should do so. Example:
    ```tsx
    import { useTimelineStore } from "@/stores/timeline-store"; 

    // ❌ Do NOT do this:
    function ParentComponent() {
      const { selectedElements } = useTimelineStore();

      return <ChildComponent selectedElements={selectedElements} />;
    }

    function ChildComponent({ selectedElements }) {}

    // ✅ Do this:
    function ParentComponent() {
      return <ChildComponent />;
    }

    function ChildComponent() {
      const { selectedElements } = useTimelineStore();
    }
  ```
17. Components render UI. Domain logic (data transformations, business rules, state mutations) lives in hooks, utilities, or managers. Simple interaction logic (gesture detection, modifier keys) can stay in components if not too many lines of code/complex.

# Functions

- Next.js page components should use the keyword `export default function`
- Main react component should use the keyword `export function`
- Sub-components should use the keyword `function`
- Utility functions should use the keyword `function`
- Functions inside of react components should use the keyword `const`

In other words: use common sense and good judgement. Don't be lazy. Consider every decision to be like gold: extremely important and valuable. Every decision, every edit must be carefully considered. Everything matters. We want to scale this project massively. And every line of code contributes to that.