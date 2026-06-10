import { useState, useEffect, useCallback, useRef } from 'react';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { useProgressStore } from '../store/useProgressStore';
import { domains } from '../domains';
import { buildMissionDb } from '../lib/missionDb';
import { validateStep, execTable, type ResultTable } from '../lib/validate';

export interface SqlEngineState {
  db: Database | null;
  isReady: boolean;
  error: string | null;
  results: Record<string, unknown>[] | null;
  isSuccess: boolean;
}

// Close a replaced database AFTER React has committed + painted the new
// one to all consumers (e.g. SchemaVisualizer). Closing synchronously right after
// setState leaves a window where a child can still hold — and query — the old
// instance, which makes sql.js throw the string "Database closed".
function closeSoon(db: Database | null) {
  if (!db) return;
  setTimeout(() => { try { db.close(); } catch { /* db already closed — ignore */ } }, 0);
}

function tableToObjects(t: ResultTable | null): Record<string, unknown>[] {
  if (!t) return [];
  return t.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    t.columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

export function useSqlEngine() {
  const storeRef = useRef(useProgressStore.getState());
  // Keep storeRef current without causing re-renders
  useEffect(() => useProgressStore.subscribe(s => { storeRef.current = s; }), []);

  // Only these cause re-renders from the store
  const activeDomainId = useProgressStore(s => s.activeDomainId);
  const currentStepIndex = useProgressStore(s =>
    s.activeDomainId ? (s.progressByDomain[s.activeDomainId]?.currentStepIndex ?? 0) : 0
  );

  const SQL = useRef<SqlJsStatic | null>(null);
  // dbRef holds the working DB so callbacks always see the latest db
  const dbRef = useRef<Database | null>(null);
  // Hidden-variant shadow DB snapshot, cached per (domain, step) — rebuilding
  // it on every submit would replay the full seed each time.
  const shadowCache = useRef<{ key: string; snapshot: Uint8Array } | null>(null);
  // Tracks the last domain we initialized for, so we can tell a mission switch
  // (clear the results panel) apart from a step advance (keep the last result visible).
  const prevDomainRef = useRef<string | null>(null);

  const [state, setState] = useState<SqlEngineState>({
    db: null,
    isReady: false,
    error: null,
    results: null,
    isSuccess: false,
  });

  // Re-initialize DB only when domain or step changes (NOT on every historicalQueries update)
  useEffect(() => {
    let cancelled = false;

    async function initDb() {
      const needsWasmLoad = !SQL.current;
      const domainChanged = prevDomainRef.current !== activeDomainId;
      prevDomainRef.current = activeDomainId;

      // Only show the full loading screen when WASM hasn't been loaded yet
      if (needsWasmLoad) {
        setState(s => ({ ...s, isReady: false, error: null, results: null, isSuccess: false }));
      } else {
        setState(s => ({ ...s, error: null, results: domainChanged ? null : s.results, isSuccess: false }));
      }

      try {
        if (!SQL.current) {
          // BASE_URL is "/" in dev and "/tuples/" on the GitHub Pages project
          // site, so the .wasm is fetched from the correct path in both.
          const locateFile = (f: string) => `${import.meta.env.BASE_URL}passenger-wasm/${f}`;
          // Retry transient fetch failures.
          let lastErr: unknown;
          for (let attempt = 0; attempt < 3 && !SQL.current; attempt++) {
            try {
              SQL.current = await initSqlJs({ locateFile });
            } catch (e) {
              lastErr = e;
              if (cancelled) return;
              await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
            }
          }
          if (!SQL.current) throw lastErr;
        }

        // Build the new DB (setup seed + replay of saved/canonical queries +
        // seedAfter bulk loads) BEFORE touching the old one.
        let newDb: Database;
        if (activeDomainId && domains[activeDomainId]) {
          const { historicalQueries } = storeRef.current.progressByDomain[activeDomainId] ?? { historicalQueries: {} };
          newDb = buildMissionDb(SQL.current, domains[activeDomainId], currentStepIndex, {
            savedQueries: historicalQueries,
          });
        } else {
          newDb = new SQL.current.Database();
        }

        if (!cancelled) {
          const oldDb = dbRef.current;
          dbRef.current = newDb;
          setState(s => ({ ...s, db: newDb, isReady: true, error: null, results: domainChanged ? null : s.results, isSuccess: false }));
          closeSoon(oldDb);
        } else {
          try { newDb.close(); } catch { /* already closed */ }
        }
      } catch (err) {
        if (!cancelled) {
          setState(s => ({ ...s, isReady: true, error: `Engine init failed: ${(err as Error).message}` }));
        }
      }
    }

    initDb();

    return () => {
      cancelled = true;
    };
    // NOTE: intentionally NOT including historicalQueries to avoid re-init loop
  }, [activeDomainId, currentStepIndex]);

  /** Shadow DB (hidden VARIANT data) for the current step, built lazily and cached. */
  const getShadowDb = useCallback((): Database | null => {
    const store = storeRef.current;
    const domainId = store.activeDomainId;
    if (!domainId || !SQL.current || !domains[domainId]) return null;
    const stepIdx = store.progressByDomain[domainId]?.currentStepIndex ?? 0;
    const key = `${domainId}:${stepIdx}`;
    if (shadowCache.current?.key !== key) {
      const db = buildMissionDb(SQL.current, domains[domainId], stepIdx, { variant: true });
      shadowCache.current = { key, snapshot: db.export() };
      db.close();
    }
    return new SQL.current.Database(shadowCache.current.snapshot);
  }, []);

  // Submit query: validate and advance step on success
  const executeQuery = useCallback((rawQuery: string) => {
    const db = dbRef.current;
    const store = storeRef.current;
    const domainId = store.activeDomainId;
    if (!db || !domainId || !SQL.current) return;

    const domain = domains[domainId];
    if (!domain) return;

    const stepIdx = store.progressByDomain[domainId]?.currentStepIndex ?? 0;
    const stepConfig = domain.curriculumMatrix[stepIdx];
    if (!stepConfig) return;

    // Clear previous results/errors immediately
    setState(s => ({ ...s, error: null, results: null, isSuccess: false }));

    // Snapshot for rollback if the submission fails
    const snapshot = db.export();
    let shadowDb: Database | null = null;

    try {
      const userResult = execTable(db, rawQuery);

      const outcome = validateStep(db, stepConfig, rawQuery, userResult, {
        getShadowDb: () => {
          shadowDb = getShadowDb();
          return shadowDb;
        },
      });

      if (outcome.pass) {
        const displayRows = tableToObjects(outcome.display);
        store.saveQueryForStep(stepIdx, rawQuery);
        store.recordSolve({ conceptFocus: stepConfig.conceptFocus });
        store.unlockNextStep();
        setState(s => ({ ...s, error: null, results: displayRows, isSuccess: true }));
      } else {
        // Validation failed — restore the pre-submission DB state
        const clean = new SQL.current!.Database(snapshot);
        dbRef.current = clean;
        closeSoon(db);
        setState(s => ({
          ...s,
          db: clean,
          error: `Not quite. ${outcome.reason ?? 'The result does not match what the briefing asked for.'}`,
          results: tableToObjects(outcome.display),
          isSuccess: false,
        }));
      }
    } catch (e) {
      // SQL error — restore DB
      const clean = new SQL.current!.Database(snapshot);
      dbRef.current = clean;
      closeSoon(db);
      setState(s => ({
        ...s,
        db: clean,
        error: (e as Error).message,
        results: null,
        isSuccess: false
      }));
    } finally {
      if (shadowDb) { try { (shadowDb as Database).close(); } catch { /* closed */ } }
    }
  }, [getShadowDb]);

  // Test Run: run query on a COPY of the DB (does NOT affect real state)
  const runRawQuery = useCallback((rawQuery: string) => {
    const db = dbRef.current;
    if (!db || !SQL.current) return;

    setState(s => ({ ...s, error: null, isSuccess: false }));

    const snapshot = db.export();
    let tempDb: Database | null = null;
    try {
      tempDb = new SQL.current!.Database(snapshot);
      const formatted = tableToObjects(execTable(tempDb, rawQuery));
      setState(s => ({ ...s, results: formatted, error: null }));
    } catch (e) {
      setState(s => ({ ...s, results: null, error: `[Test Run] ${(e as Error).message}` }));
    } finally {
      if (tempDb) { try { tempDb.close(); } catch { /* already closed */ } }
    }
  }, []);

  return { ...state, executeQuery, runRawQuery };
}
