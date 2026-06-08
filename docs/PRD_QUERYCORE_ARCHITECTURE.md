# Product Requirement Document (PRD): Tuples Architecture Blueprint[cite: 4, 5]

## 1. Executive Summary & Core Mechanism[cite: 4, 5]
Tuples is a local-first, interactive, project-based SQL learning framework[cite: 4, 5]. Unlike static validation tools, users pick a domain and progressively build a single, cohesive, fully functional relational database from Step 1 to Step 35[cite: 4, 5]. 

The core application runtime enforces strict sequential unlocking: Step $N+1$ cannot be viewed or executed until Step $N$ passes both structural validation and state verification[cite: 4, 5]. The entire runtime execution happens inside an isolated WebAssembly-powered SQLite environment in the user's browser thread, ensuring absolute performance, security, and instantaneous state resets[cite: 4, 5].

---

## 2. Definitive Production Tech Stack[cite: 4, 5]
To ensure absolute package compatibility and eliminate version mismatch errors during compilation, Antigravity must build using these explicit tool specifications[cite: 4, 5]:

* **Core Framework:** React 18.3.1[cite: 4, 5]
* **Build Utility & Dev Server:** Vite 5.4.11[cite: 4, 5]
* **Language Specification:** TypeScript 5.4.5[cite: 4, 5]
* **Style Framework:** Tailwind CSS 3.4.15[cite: 4, 5]
* **Database Runtime Engine:** `@sql-js/sql.js` Version 1.10.3 (Compiled SQLite WebAssembly)[cite: 4, 5]
* **Animation & UI Motion Library:** Framer Motion 11.11.11[cite: 4, 5]
* **Icon Asset System:** Lucide React 0.460.0[cite: 4, 5]

---

## 3. Pluggable Domain File & Directory Structure[cite: 4, 5]
The application uses a highly decoupled data layer[cite: 4, 5]. All structural domains (Finance, Clinical Trials, etc.) conform to an identical JSON object framework[cite: 4, 5]. Adding or removing a domain requires only dropping or deleting a JSON configuration file inside the `/src/domains/` directory[cite: 4, 5].

```text
querycore-root/
├── public/
│   └── passenger-wasm/
│       └── sql-wasm.wasm          # Static WASM assets for sql.js execution
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── BentoLayout.tsx        # Base container components for responsive grids
│   │   ├── LiveDiffTable.tsx      # Monospace grid capturing row/cell variations
│   │   ├── SchemaVisualizer.tsx   # SVG/Canvas-based interactive ER diagram wireframe
│   │   └── SqlTerminal.tsx        # Code text-area with custom syntax highlights
│   ├── domains/
│   │   ├── index.ts               # Core export hub aggregating active domains
│   │   ├── clinical_trials.json   # Domain Configuration file
│   │   └── algorithmic_trading.json
│   ├── hooks/
│   │   └── useSqlEngine.ts        # Primary hook managing WebAssembly lifecycle
│   ├── store/
│   │   └── useProgressStore.ts    # Zustand or Context browser LocalStorage state
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts

4. State Management & Browser Storage Rules
[cite: 4, 5]
To maximize lightweight delivery, the application maintains state locally via browser localStorage[cite: 4, 5].

Persistence Schema: The system saves a state object containing[cite: 4, 5]:

activeDomainId: String identifier of the chosen track[cite: 4, 5].

currentStepIndex: Integer matching the absolute sequence index (0 to 34)[cite: 4, 5].

historicalQueries: Record mapping stepIndex to the user's last typed text query string[cite: 4, 5].

State Hydration: When the app loads, it searches localStorage for keys matching querycore_user_progress[cite: 4, 5]. If found, it instantly positions the layout at the highest unlocked step and updates the visual Schema Map to reflect all previously compiled DDL/DML changes[cite: 4, 5].

5. System Execution & Multi-Tier Validation Engine
[cite: 4, 5]
Step Initialization
[cite: 4, 5]
When a user selects a domain, the useSqlEngine hook initializes a fresh in-memory database instance using initSqlJs[cite: 4, 5].

The engine executes all SQL query strings sequentially from Step 0 up to the user's current active step minus one[cite: 4, 5]. This guarantees the client database is perfectly up to date with the user's unique construction path[cite: 4, 5].

Validation Pipeline
[cite: 4, 5]
When a user clicks "Run Query", the input string passes through a three-stage validation gate[cite: 4, 5]:

Plaintext
 [User Input String] 
         │
         ▼
 ┌─────────┐
 │ Stage 1 │ ──► Token/Regex Validation (Verifies mandatory keywords or structure)
 └─────────┘
         │ (Pass)
         ▼
 ┌─────────┐
 │ Stage 2 │ ──► Execution Isolation (Runs inside transaction block on WASM instance)
 └─────────┘
         │ (Passes Syntax without Runtime Crash)
         ▼
 ┌─────────┐
 │ Stage 3 │ ──► State/Output Verification (Asserts DB PRAGMA or Answer-Key Rows)
 └─────────┘
         │
         ▼
 [Unlock Next Step Index]
Stage 1: Token & Syntax Screening: The validation engine runs basic text scanning to assert strict rules if dictated by the step configuration (e.g., verifying if an operational step explicitly utilizes the keyword LEFT JOIN or FOREIGN KEY)[cite: 4, 5].

Stage 2: Execution Isolation: The query string is run inside an isolated SQL transaction block against the browser's local WebAssembly instance[cite: 4, 5]. If the execution errors out (e.g., standard syntax error, malformed table targeting), the transaction is rolled back, the UI captures the crash logs, and passes them to the error console card[cite: 4, 5].

Stage 3: Database State Verification:

[cite: 4, 5]

For standard data querying tasks (SELECT), the engine checks the returned JSON rows against the pre-configured step result array[cite: 4, 5].

For destructive queries (UPDATE, DELETE, DROP, ALTER), the engine automatically executes an underlying system confirmation check (e.g., executing PRAGMA table_info(X) or querying the internal sqlite_master catalog tables) to prove the actual architecture or record set matches the targeted state[cite: 4, 5].

6. The Progressive Hint Architecture
[cite: 4, 5]
To maintain an uncompromising project-based learning flow, every step block inside the domain file must serve a declarative 3-tier array structure[cite: 4, 5]:

Tier 1 (Theoretical Concept): Outlines the high-level engineering reasoning without displaying keywords or syntax shapes[cite: 4, 5].

Tier 2 (Structural Scaffold): Renders a structural template layout directly in monospace format with explicit blank positions (e.g., ALTER TABLE __ ADD COLUMN __ __;)[cite: 4, 5].

Tier 3 (Absolute Code Reset): Displays the raw query required to accurately finish the section[cite: 4, 5]. Clicking "Unlock Solution" reveals the precise query string, allowing the user to copy, paste, execute, and prevent permanent roadblocks[cite: 4, 5].


---