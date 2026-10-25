# Ascend OS component architecture

- `src/types/models.ts`: shared domain types.
- `src/hooks/useAscendApp.ts`: application state, browser persistence and actions.
- `src/context/AppContext.tsx`: typed view-model context.
- `src/components/ui/Shared.tsx`: reusable UI primitives.
- `src/components/layout/`: navigation, top bar and page heading.
- `src/features/`: independent page views and feature-specific forms.
- `src/cloud/CloudWorkspace.tsx`: authentication and Supabase snapshot synchronization.

`App` creates state with `useAscendApp` and shares the inferred typed view model via `AppProvider`. Feature views read that model through `useAppContext`; persistence stays in the hook and cloud sync in the cloud workspace shell.

Focus-session and activity records remain part of the existing workspace snapshot. This refactor introduces no database migration.

Keep feature rendering and forms in feature folders, state transitions in hooks, reusable UI independent from feature modules, and preserve existing CSS class names. Run the production TypeScript build before merging.
