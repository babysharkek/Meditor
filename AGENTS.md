# AGENTS.md

## Overview

Privacy-first video editor, with a focus on simplicity and ease of use.

## Core Editor System

The editor uses a **singleton EditorCore** that manages all editor state through specialized managers.

### Architecture

```
EditorCore (singleton)
├── playback: PlaybackManager
├── timeline: TimelineManager
├── scene: SceneManager
├── project: ProjectManager
├── media: MediaManager
└── renderer: RendererManager
```

### When to Use What

#### In React Components

**Always use the `useEditor()` hook:**

```typescript
import { useEditor } from '@/hooks/use-editor';

function MyComponent() {
  const editor = useEditor();
  const tracks = editor.timeline.getTracks();
  
  // Call methods
  editor.timeline.addTrack({ type: 'media' });
  
  // Display data (auto re-renders on changes)
  return <div>{tracks.length} tracks</div>;
}
```

The hook:
- Returns the singleton instance
- Subscribes to all manager changes
- Automatically re-renders when state changes

#### Outside React Components

**Use `EditorCore.getInstance()` directly:**

```typescript
// In utilities, event handlers, or non-React code
import { EditorCore } from '@/core';

const editor = EditorCore.getInstance();
await editor.export({ format: 'mp4', quality: 'high' });
```
