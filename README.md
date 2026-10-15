# RAMpage

**Page replacement simulator - the optimal algorithm (OPT) side by side with FIFO, Second Chance, LRU or LFU, visualized step by step in a web interface.**



## Demo

[![RAMpage Demo](https://img.shields.io/badge/▶%20Watch-Demo%20Video-blue?style=for-the-badge)](VIDEO_URL)

> Video walkthrough: generating a scenario from a seed, loading an operations file and comparing each algorithm against OPT during a simulation.



## About

RAMpage simulates how a Memory Management Unit (MMU) handles paging on a simple machine: one core, one instruction per second, **400 KB of RAM (100 pages of 4 KB)** and an unbounded virtual memory on disk. Processes run a sequence of `new`, `use`, `delete` and `kill` operations and the MMU loads, evicts and frees pages as they are needed.

Two simulations run in lockstep over the same sequence: **OPT** as the baseline and the **algorithm chosen by the user**. Each step executes one operation on both, so they always show the same point of the sequence and finish together.

| Algorithm | Evicts | MARK column shows |
|---|---|---|
| `OPT` | The page whose next use is furthest in the future | Next operation that uses the page (`∞` if none) |
| `FIFO` | The page that has been in RAM the longest | - |
| `SC` (Second Chance) | The oldest page whose reference bit is clear; referenced pages get a second chance | Reference bit (`1` / `0`) |
| `LRU` | The page whose last access is the oldest | Last access sequence |
| `LFU` | The page with the fewest accesses since it was loaded | Access count |

The interface shows, for both algorithms at the same time, the RAM frames colored by process, the MMU page table, and the required metrics: running processes, simulated time, RAM and V-RAM usage, loaded / unloaded pages, thrashing (highlighted above 50 %) and internal fragmentation.

### Key features

- Operations generated from a **seed**, a process count P (10, 50, 100) and an operation count N (500, 1000, 5000) - the same seed always reproduces the same scenario
- Generated operations can be **downloaded** before simulating, in the format of Annex 1
- Operations files are **validated** on load, reporting the line or operation of the first error
- **Play / Pause / Step** controls with adjustable speed (1 to 500 operations per second)
- Pages used and evicted by the last operation are **highlighted** in RAM and in the MMU table, with a summary line under each table
- Simulator core in plain TypeScript, independent of the UI, covered by **74 automated tests** (including the hand calculation of Annex 1 and an OPT-versus-all comparison on generated workloads)


## Repo structure

```
RAMpage/
├── public/
│   └── favicon.svg                     # App icon (RAM module)
├── src/
│   ├── components/                     # React UI
│   │   ├── MmuTable.tsx                  # MMU page table with the Annex 2 columns
│   │   ├── PidLegend.tsx                 # Process color legend
│   │   ├── RamBar.tsx                    # 100 RAM frames colored by process
│   │   ├── SetupScreen.tsx               # Seed, algorithm, file or P and N, file download
│   │   ├── SimulationScreen.tsx          # Controls and OPT vs. selected algorithm view
│   │   └── StatsPanel.tsx                # Required metrics for one algorithm
│   ├── hooks/
│   │   └── useSimulation.ts              # Playback timer, play / pause / step, speed
│   ├── sim/                            # Simulator core (plain TypeScript, no React)
│   │   ├── algorithms/
│   │   │   ├── createAlgorithm.ts          # Algorithm factory
│   │   │   ├── fifo.ts                     # First In, First Out
│   │   │   ├── lfu.ts                      # Least Frequently Used
│   │   │   ├── lru.ts                      # Least Recently Used
│   │   │   ├── optimal.ts                  # Bélády's optimal algorithm (OPT)
│   │   │   ├── pagingAlgorithm.ts          # Common algorithm interface
│   │   │   ├── pickFirst.ts                # Single-pass victim selection helper
│   │   │   └── secondChance.ts             # Second Chance (reference bit)
│   │   ├── constants.ts                  # Machine parameters (page size, RAM, clock costs)
│   │   ├── generator.ts                  # Seeded operation generator following the spec rules
│   │   ├── memory.ts                     # Pages needed per allocation
│   │   ├── metrics.ts                    # KB and percentage conversions for the UI
│   │   ├── mmu.ts                        # MMU: memory map, RAM frames, disk, clock, metrics
│   │   ├── parser.ts                     # Operations file parser
│   │   ├── random.ts                     # Seeded PRNG (mulberry32)
│   │   ├── serializer.ts                 # Operations to downloadable text
│   │   ├── session.ts                    # Runs OPT and the selected algorithm in lockstep
│   │   ├── types.ts                      # Core types (Operation, Page, stats)
│   │   └── validator.ts                  # Semantic checks of a sequence before simulating
│   ├── ui/
│   │   ├── download.ts                   # Browser file download
│   │   └── pidColor.ts                   # Stable color per process
│   ├── App.tsx                         # Switches between setup and simulation screens
│   ├── index.css                       # Styles (light and dark themes)
│   └── main.tsx                        # Entry point
├── tests/                              # Automated tests of the simulator core (node:test)
│   ├── fixtures/
│   │   ├── annex1.ts                     # Annex 1 example, verbatim, and its expected operations
│   │   └── pages.ts                      # Page and eviction context builders
│   ├── comparison.test.ts                # All algorithms on generated workloads (OPT never worse)
│   ├── fifo.test.ts
│   ├── generator.test.ts                 # Spec rules for every P and N, repeatability
│   ├── lfu.test.ts
│   ├── lru.test.ts
│   ├── metrics.test.ts                   # KB and percentages (V-RAM as % of RAM)
│   ├── mmu.test.ts                       # Hand calculation of Annex 1, pinning, release
│   ├── optimal.test.ts
│   ├── parser.test.ts
│   ├── random.test.ts
│   ├── secondChance.test.ts
│   ├── serializer.test.ts
│   ├── session.test.ts                   # Lockstep execution of both algorithms
│   └── validator.test.ts
├── .gitignore
├── .npmrc                              # Enforces the required Node.js version
├── .oxlintrc.json                      # Linter config
├── index.html
├── package.json                        # Scripts and dependencies
├── package-lock.json                   # Exact dependency versions
├── README.md
├── tsconfig.app.json                   # TypeScript config for the app
├── tsconfig.json                       # References the app and Node configs
├── tsconfig.node.json                  # TypeScript config for vite.config.ts
├── tsconfig.test.json                  # TypeScript config for the tests
└── vite.config.ts
```


## Development environment

| Component | Version |
|---|---|
| OS | Debian 13.7 "Trixie" (64-bit, GNOME) |
| Virtualization | Oracle VirtualBox on a Windows 10 Pro host (4 vCPUs, ~8 GB RAM) |
| Runtime | Node.js 20.19.2 and npm 9.2.0 (Debian packages) |
| Language | TypeScript 6.0 |
| UI library | React 19.2 |
| Build tool | Vite 8.3 |
| Linter | Oxlint |
| Tests | Node.js built-in test runner (`node:test`) |
| Browser | Firefox ESR 140 |
| Editor | Visual Studio Code |

Install the dependencies on Debian (`nodejs` and `npm` are separate packages):

```bash
sudo apt update
sudo apt install git nodejs npm
node --version
```

`node --version` must print `v20.19.0` or newer.


## Installation / Use

### 1. Clone the repository

```bash
git clone https://github.com/valeriehernandez-7/RAMpage.git
cd RAMpage
```

### 2. Install the dependencies

```bash
npm ci
```

Installs the exact versions recorded in `package-lock.json`.

### 3. Build

```bash
npm run build
```

Other scripts:

| Command | Description |
|---|---|
| `npm run build` | Type-check and build the app into `dist/` |
| `npm run preview` | Serve the built app at http://localhost:4173/ |
| `npm run dev` | Development server with live reload at http://localhost:5173/ |
| `npm test` | Run the automated tests of the simulator core (optional) |
| `npm run lint` | Run the linter |

### 4. Run

```bash
npm run preview
```

Open **http://localhost:4173/** in the browser. Stop the server with `Ctrl+C`.

The built app must be served over HTTP: opening `dist/index.html` directly from the file system shows a blank page, because browsers block ES modules loaded through `file://`.

### 5. Verify the build (optional)

```bash
npm test
```

Runs the 74 tests of the simulator core, including the hand calculation of Annex 1 (28 s, 8 hits, 4 faults) and a check that OPT never has more page faults than any other algorithm on generated workloads.

### 6. Setup screen

- **Algorithm to compare against OPT**: FIFO, SC, LRU or LFU.
- **Generate from a seed**: seed, processes (P) and operations (N). **Download operations file** saves the generated sequence before starting.
- **Load a file**: an operations file in the format below; it is validated as soon as it is selected.
- **Start simulation** is enabled once the configuration is valid.

### 7. Simulation screen

- **Play / Pause** runs the simulation at the selected speed; **Step** executes one operation while paused.
- Pages used by the last operation are marked with `▶` and outlined in RAM; pages moved to disk are shown in red with `↓`.
- When the simulation ends, a summary compares the selected algorithm against OPT.
- **New simulation** returns to the setup screen.

### Operations file format

One instruction per line, as in Annex 1 of the specification. Pointers are numbered by order of appearance of `new`, starting at 1.

```text
new(1,500)
use(1)
new(1,1000)
use(1)
use(2)
delete(1)
kill(1)
```

| Instruction | Description |
|---|---|
| `new(pid,size)` | Allocates `size` bytes for process `pid` and returns the next pointer |
| `use(ptr)` | Accesses every page of the pointer |
| `delete(ptr)` | Frees the pointer and its pages |
| `kill(pid)` | Frees all the memory of the process; it runs no more instructions |

> Instructions may also be separated by commas or semicolons. Windows line endings, blank lines, extra spaces and upper-case names are accepted.

### Simulation model

| Parameter | Value |
|---|---|
| RAM | 400 KB = 100 pages |
| Page size | 4 KB |
| Virtual memory (disk) | Unbounded |
| Page hit | 1 s |
| Page fault | 5 s (also added to thrashing) |
| New page | Always counts as a page fault |
| `delete` / `kill` | 0 s (they access no pages) |


## Contributors

- [Valerie M. Hernández Fernández](https://github.com/valeriehernandez-7)


## Academic information

| | |
|---|---|
| **University** | [Costa Rica Institute of Technology](https://www.tec.ac.cr/) |
| **Site** | [San José Local Technological Campus](https://www.tec.ac.cr/campus-tecnologico-local-san-jose) |
| **Degree** | [Computer Engineering](https://www.tec.ac.cr/ingenieria-computacion) |
| **Course** | [IC6600 - Operating System Principles](https://www.tec.ac.cr/plan-bachillerato-ingenieria-computacion) |
| **Assignment** | Project 2 |
| **Semester** | II 2026 |
