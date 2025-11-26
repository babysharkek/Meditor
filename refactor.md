Review every point below carefully for files to ensure they follow consistent code style and best practices.

1. Every single function must use a destructured props object for parameters, regardless of whether there's one or multiple parameters. This applies to all functions, not just react components. Even zustand stores.
2. No `any` references.
3. Functions that are not react components OR are not inside a function should use the `function` keyword instead of arrow functions. Example: react component uses `function`. Or if you have a function inside a function, that should be `const`. All other functions (etc: utility functions) should use the `function` keyword.
4. JSX is clean; No comments in there explaining what each part does. Must extract JSX into sub-components (always placed below the main component). A part only needs to be extracted if it's either used in multiple places of the file OR is complex enough to be worth extracting. If a component is used acrosss multiple files, it should be extracted to a separate file.
5. General interfaces must be placed in the `types` folder. Example: `src/components/timeline/index.tsx` defining a `TimelineTrack` interface is wrong and should be moved to `src/types/timeline.ts`.
6. No AI comments — only human comments. Example of AI comments: explaining too much, code is readable without the comment, changelog-style comments, using more words than necessary, etc.
7. JSX: Use `gap-2` instead of `mb-2` or `mt-2` for consistent spacing.
8. Code is scannable. Use variables and helper functions to make intent clear at a glance. Complex code should be clean.
9. Separation of concerns: Each file should have one single purpose/responsibility. Example: `src/components/timeline/index.tsx` should not define a function to validate element track compatibility. That's a separate concern and belongs in a separate file. `src/lib/timeline-utils.ts` should not declare a TRACK_COLORS constant. That belongs in src/constants. Think carefully about what belongs in what file.
10. Files with react components must use this order for functions: main function (top) -> sub-components (below).
11. Use zustand correctly. React component should never use `someStore.getState()`. Instead, use the `useSomeStore` hook.
12. Business logic is in `src/lib` folder. Example: zustand store has a method to remove a bookmark, the method should be a wrapper of a function in `src/lib/` that handles the actual logic.
13. Booleans must be named like `isSomething` or `hasSomething` or `shouldSomething`. Not `something` or `somethingIs`.

In other words: use common sense and good judgement. Don't be lazy. Consider every decision to be like gold: extremely important and valuable. Every decision, every edit must be carefully considered. Everything matters. We want to scale this project massively. And every line of code contributes to that.