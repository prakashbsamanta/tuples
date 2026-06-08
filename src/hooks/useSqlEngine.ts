import { useState, useEffect, useCallback, useRef } from 'react';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { useProgressStore } from '../store/useProgressStore';
import { domains } from '../domains';

export interface SqlEngineState {
  db: Database | null;
  isReady: boolean;
  error: string | null;
  results: any[] | null;
  isSuccess: boolean;
}

// Deep-compare two parsed JSON values with safe type handling.
// FIX #1: Null/undefined/empty-string no longer coerce to 0.
function looseEqual(a: any, b: any): boolean {
  // Identical references or both strictly equal
  if (a === b) return true;

  // If either is null/undefined, only match if BOTH are null/undefined
  if (a === null || a === undefined || b === null || b === undefined) {
    return (a ?? null) === (b ?? null);
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => looseEqual(item, b[i]));
  }

  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => looseEqual(a[k], b[k]));
  }

  // Numeric comparison — only if both are non-empty strings/numbers that parse to valid numbers
  const strA = String(a).trim();
  const strB = String(b).trim();
  if (strA !== '' && strB !== '') {
    const numA = Number(strA);
    const numB = Number(strB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return Math.abs(numA - numB) < 0.001;
    }
  }

  // Fallback: string comparison
  return strA === strB;
}

// FIX #3: Close a replaced database AFTER React has committed + painted the new
// one to all consumers (e.g. SchemaVisualizer). Closing synchronously right after
// setState leaves a window where a child can still hold — and query — the old
// instance, which makes sql.js throw the string "Database closed".
function closeSoon(db: Database | null) {
  if (!db) return;
  setTimeout(() => { try { db.close(); } catch { /* db already closed — ignore */ } }, 0);
}

function formatResults(res: ReturnType<Database['exec']>): any[] {
  if (res.length === 0) return [];
  const { columns, values } = res[0];
  return values.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
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

  const [state, setState] = useState<SqlEngineState>({
    db: null,
    isReady: false,
    error: null,
    results: null,
    isSuccess: false,
  });

  // Re-initialize DB only when domain or step changes (NOT on every historicalQueries update)
  // FIX #2: Only show full-screen loader on initial WASM load, not on step transitions.
  // FIX #3: Close old DB *after* new one is ready and state is set.
  useEffect(() => {
    let cancelled = false;

    async function initDb() {
      const needsWasmLoad = !SQL.current;

      // Only show the full loading screen when WASM hasn't been loaded yet
      if (needsWasmLoad) {
        setState(s => ({ ...s, isReady: false, error: null, results: null, isSuccess: false }));
      } else {
        // For step transitions, just clear results/errors — keep isReady true to avoid flash
        setState(s => ({ ...s, error: null, results: null, isSuccess: false }));
      }

      try {
        if (!SQL.current) {
          SQL.current = await initSqlJs({ locateFile: f => `/passenger-wasm/${f}` });
        }

        // Build the new DB first, BEFORE touching the old one
        const newDb = new SQL.current.Database();

        // Hydrate: replay all saved queries from steps 0..currentStepIndex-1
        if (activeDomainId && domains[activeDomainId]) {
          const { historicalQueries } = storeRef.current.progressByDomain[activeDomainId] ?? { historicalQueries: {} };
          for (let i = 0; i < currentStepIndex; i++) {
            const q = historicalQueries[i];
            if (q) {
              try { newDb.exec(q); } catch (e) {
                console.warn(`Hydration error at step ${i}:`, e);
              }
            }
          }
        }

        if (!cancelled) {
          // Swap: set new DB first, THEN schedule the old one to close after paint
          const oldDb = dbRef.current;
          dbRef.current = newDb;
          setState({ db: newDb, isReady: true, error: null, results: null, isSuccess: false });

          // Defer closing the old DB until consumers have re-rendered — no race
          closeSoon(oldDb);
        } else {
          // If cancelled, close the newDb we just made
          try { newDb.close(); } catch { /* db already closed — ignore */ }
        }
      } catch (err: any) {
        if (!cancelled) {
          setState(s => ({ ...s, isReady: true, error: `Engine init failed: ${err.message}` }));
        }
      }
    }

    initDb();

    return () => {
      cancelled = true;
    };
    // NOTE: intentionally NOT including historicalQueries to avoid re-init loop
  }, [activeDomainId, currentStepIndex]);

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

    // Take a snapshot of DB state before executing (for safe rollback)
    const snapshot = db.export();

    try {
      // Stage 2: Execute the query
      db.exec(rawQuery);

      // Stage 3: Run verification query
      const verifyRes = db.exec(stepConfig.verificationQuery);
      const actual = formatResults(verifyRes);
      const expected = JSON.parse(stepConfig.expectedResult);

      if (looseEqual(actual, expected)) {
        // ✅ SUCCESS
        store.saveQueryForStep(stepIdx, rawQuery);
        store.unlockNextStep();
        setState(s => ({ ...s, error: null, results: actual, isSuccess: true }));
      } else {
        // ❌ Verification failed — restore DB
        const clean = new SQL.current!.Database(snapshot);
        dbRef.current = clean;
        closeSoon(db);
        setState(s => ({
          ...s,
          db: clean,
          error: `Verification failed.\nExpected: ${JSON.stringify(expected)}\nGot: ${JSON.stringify(actual)}`,
          results: null,
          isSuccess: false
        }));
      }
    } catch (e: any) {
      // ❌ SQL error — restore DB
      const clean = new SQL.current!.Database(snapshot);
      dbRef.current = clean;
      closeSoon(db);
      setState(s => ({
        ...s,
        db: clean,
        error: e.message,
        results: null,
        isSuccess: false
      }));
    }
  }, []); // No deps — always reads from refs

  // Test Run: run query on a COPY of the DB (does NOT affect real state)
  const runRawQuery = useCallback((rawQuery: string) => {
    const db = dbRef.current;
    if (!db || !SQL.current) return;

    setState(s => ({ ...s, error: null, isSuccess: false }));

    // Export current DB, create a temp copy to run against
    const snapshot = db.export();
    let tempDb: Database | null = null;
    try {
      tempDb = new SQL.current!.Database(snapshot);
      const res = tempDb.exec(rawQuery);
      const formatted = formatResults(res);
      setState(s => ({ ...s, results: formatted, error: null }));
    } catch (e: any) {
      setState(s => ({ ...s, results: null, error: `[Test Run] ${e.message}` }));
    } finally {
      if (tempDb) { try { tempDb.close(); } catch { /* db already closed — ignore */ } }
    }
  }, []);

  return { ...state, executeQuery, runRawQuery };
}
