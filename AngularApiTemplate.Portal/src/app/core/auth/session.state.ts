import {
  Action,
  ActionReducer,
  createAction,
  createReducer,
  createSelector,
  on,
  props,
} from '@ngrx/store';

export const sessionChanged = createAction('[Session] Changed', props<{ generation: number }>());
export interface SessionState {
  readonly generation: number;
}
export const sessionReducer = createReducer<SessionState>(
  { generation: 0 },
  on(sessionChanged, (_state, { generation }) => ({ generation })),
);
export const selectSessionGeneration = createSelector(
  (state: { session?: SessionState }) => state.session,
  (session) => session?.generation ?? 0,
);

// Root ownership is intentional: lazy features may not exist when a session changes.
// Reset all feature state and reject responses against the root generation, even after re-registration.
export function sessionBoundary<T extends { session: SessionState }>(
  reducer: ActionReducer<T>,
): ActionReducer<T> {
  return (state, action: Action & { generation?: number }) => {
    const session = state?.session;
    if (action.type === sessionChanged.type) {
      if (action.generation === undefined || action.generation <= (session?.generation ?? 0))
        return state ?? reducer(state, action);
      return reducer(undefined, action);
    }
    if (action.generation !== undefined && action.generation !== (session?.generation ?? 0)) {
      return state ?? reducer(state, { type: '[Session] Ignored stale response' });
    }
    return reducer(state, action);
  };
}
