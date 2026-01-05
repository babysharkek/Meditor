## Complete Refactor Plan

### ✅ COMPLETED

1. **Created Command Pattern Architecture**
   - Base `Command` class with `execute()`, `undo()`, `redo()`
   - 15 timeline commands in `src/lib/commands/timeline/`
   - All phases implemented (track ops, element ops, toggles, split, paste, etc.)

2. **Created HistoryManager**
   - Generic `HistoryManager<T>` for undo/redo tracking
   - Returns command after execution (for getting return values like IDs)
   - Completely decoupled from timeline logic

3. **Refactored TimelineManager** 
   - Removed all UI state (`snappingEnabled`, `rippleEditingEnabled`, `selectedElements`, `dragState`, `clipboard`)
   - Removed UI-only methods
   - Now purely command-driven core logic
   - All operations go through commands + history
   - Only 315 lines (was 1800+)
   - Focus: data management, persistence, queries

4. **Refactored Timeline Store**
   - Now ONLY UI state (104 lines)
   - `selectedElements` + selection methods
   - `snappingEnabled` + toggle
   - `rippleEditingEnabled` + toggle
   - `clipboard` + setter
   - Removed all core logic

### 🔲 TODO - HIGH PRIORITY

1. **Move dragState from Store to Timeline Component**
   - Currently in Zustand (wrong place)
   - Move to `Timeline` component local state
   - Pass down via props to `TimelineTrack` and `TimelineElement`
   - Remove from timeline-store.ts
   - Eliminates unnecessary global state

2. **Update All Component Imports**
   - Remove `dragState`, `startDrag`, `updateDragTime`, `endDrag` from all components reading from store
   - Update to receive via props instead
   - Components affected:
     - `timeline-track.tsx` (producer)
     - `timeline-element.tsx` (consumer)
     - `index.tsx` (consumer - snap indicator)

3. **Update Store Action Calls**
   - Components calling store methods now need to call `editor.timeline.*` instead
   - Examples:
     - `updateElementStartTime()` → `editor.timeline.updateElementStartTime()`
     - `deleteSelected()` → `editor.timeline.deleteElements()`
     - `copySelected()` stays in store (UI orchestration)
     - `pasteAtTime()` → `editor.timeline.pasteAtTime()` after store manages clipboard

4. **Create useDragState Hook (Optional Later)**
   - Extract drag logic into custom hook
   - Would contain: drag state, handlers, listeners
   - Keep in Timeline for now (simpler), extract later if needed

### 🔲 TODO - MEDIUM PRIORITY

5. **Implement Remaining TimelineManager Methods**
   - `checkElementOverlap()` — utility logic
   - `findOrCreateTrack()` — utility
   - `loadProjectTimeline()` — persistence
   - `saveProjectTimeline()` — persistence
   - `clearTimeline()` — core operation
   - `getSortedTracks()` — already in manager but not implemented

6. **Wire Up Commands to UI**
   - Update all action calls to create commands + execute
   - E.g., when user clicks "add track":
     ```typescript
     const trackId = editor.timeline.addTrack({ type: "media" });
     ```
   - This internally creates `AddTrackCommand`, executes it through history

### 🔲 TODO - POLISH

7. **Remove Duplicate Methods**
   - `copySelected` exists in both store (UI) and old timeline-store (removed)
   - Store version should orchestrate: copy → call `editor.timeline.pasteAtTime()`

8. **Add Type Safety**
   - Ensure all commands properly typed
   - Ensure all manager methods properly typed
   - Fix any remaining linter errors

### Architecture Summary

```
EditorCore (singleton)
├── history: HistoryManager
├── timeline: TimelineManager (pure logic)
│   ├── _tracks (data)
│   ├── Command execution
│   └── Persistence
├── project: ProjectManager
├── media: MediaManager
├── scene: SceneManager
└── playback: PlaybackManager

Timeline Component (UI)
├── dragState (local)
├── TimelineTrackContent
│   ├── dragState (via props)
│   └── TimelineElement
│       └── dragState (via props)

TimelineStore (Zustand - UI state)
├── selectedElements
├── snappingEnabled
├── rippleEditingEnabled
└── clipboard
```

**Key Principle:** Core logic in managers + commands. UI state in store. Ephemeral interaction state in components (dragState).