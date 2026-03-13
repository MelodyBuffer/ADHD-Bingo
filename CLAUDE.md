# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ADHD Bingo** (also known as "Life Bingo") is a single-page Progressive Web App (PWA) for gamifying daily task tracking using a bingo-style grid. Users mark tasks as complete, and the app tracks progress, streaks, and achievements.

### Architecture

This is a **pure vanilla JavaScript application** contained entirely within a single `index.html` file (~3900 lines). No build system, package manager, or framework is required.

**Key Design Decisions:**
- All CSS embedded in `<style>` tags in index.html
- All JavaScript embedded in `<script>` tags at the end of index.html
- Data persisted to localStorage (with cookie fallback for user authentication)
- Service Worker (`sw.js`) provides offline-first PWA capabilities
- All state management is manual via global variables

### File Structure

```
/
├── index.html       # Complete application (HTML + CSS + JS)
├── sw.js           # Service Worker (offline caching)
├── manifest.json   # PWA manifest
└── TODOs.md        # Project roadmap (Chinese)
```

## Development Workflow

### Local Development

No build process required. Simply serve the directory:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Testing Changes

1. Edit `index.html` directly
2. Refresh browser (Ctrl+R / Cmd+R)
3. For Service Worker changes: unregister via DevTools → Application → Service Workers or open in incognito

### Production Deployment

Simply deploy the entire directory to any static hosting service (Netlify, Vercel, GitHub Pages, etc.). No build step needed.

## Core Architecture

### State Management (lines 1003-1019)

Global state variables:
```javascript
let gridSize = 5;                    // 5x5 grid by default
let state = [];                       // Array of cell completion states (0/1)
let order = [];                       // Task name ordering for grid cells
let groups = [];                      // Task groups with active/inactive tasks
let details = {};                     // Task metadata (notes, todos)
let mandatory = new Set();            // Required task names
let appName = 'Life Bingo';
let timestamps = {};                  // Task completion timestamps
let currentUser = null;               // {username, passwordHash}
let viewingDate = null;               // null=today, or 'YYYY-MM-DD' for history
```

### Data Storage Schema

All localStorage keys are prefixed with `adhd_bingo_` (constant `KP`):

| Key Pattern | Description | Example |
|-------------|-------------|---------|
| `adhd_bingo_groups` | Task groups with active flags | `[{name:"默认分组", tasks:[...]}]` |
| `adhd_bingo_details` | Per-task metadata | `{"taskName": {note:"", todos:[]}}` |
| `adhd_bingo_mandatory` | Required tasks | `["task1", "task2"]` |
| `adhd_bingo_appname` | App title | `"Life Bingo"` |
| `adhd_bingo_theme` | Current theme ID | `"matcha"` |
| `adhd_bingo_gridsize` | Grid size (3-6) | `5` |
| `adhd_bingo_user` | Logged-in user | `{username, passwordHash}` |
| `adhd_bingo_YYYY-MM-DD` | Daily completion state | `{state:[], order:[]}` |
| `adhd_bingo_u_{username}_*` | Per-user data | User-isolated keys |

### Key Data Flow

1. **Initialization** (line 3907-3924):
   ```javascript
   loadAll(); load(); loadTheme(); buildGrid(); render();
   ```

2. **Daily State Load** (`load()` function, line 1154):
   - Reads `adhd_bingo_YYYY-MM-DD` from localStorage
   - Parses `{state:[], order:[]}` JSON
   - Falls back to empty state if not found

3. **Grid Rendering** (`buildGrid()` function):
   - Distributes active tasks across grid cells
   - Creates DOM elements for each cell
   - Applies state classes (active, bingo-line, locked, mandatory)

4. **Task Completion** (cell click handlers):
   - Updates `state[]` array
   - Calls `save()` to persist to localStorage
   - Triggers `render()` to update UI
   - Checks for bingo line completions
   - Plays sound/vibration feedback

### User Authentication System

**Current implementation (to be removed per TODOs.md):**
- Login/register modal (lines 714-740)
- Password hashing using Web Crypto API
- User-specific data prefixing: `adhd_bingo_u_{username}_*`
- Cookie fallback for user session persistence
- Auto-show login modal on first visit (line 3920-3924)

**Key functions:**
- `doLogin()` / `doRegister()` (lines ~3650-3680)
- `switchLoginTab()` (line ~3645)
- `updateUserBadge()` (line 3697)

### Theme System

**Current implementation:**
- Theme button cycles through 7 themes (line 1591 `toggleTheme()`)
- Themes applied via CSS classes on `<body>`: `theme-matcha`, `theme-ocean`, etc.
- Theme definitions in CSS (lines 24-213)
- Theme preference stored in localStorage

**Themes:**
1. `color` - Default (no class)
2. `matcha` - Green tea theme
3. `ocean` - Deep blue theme
4. `mono` - Monochrome
5. `cyber` - Cyberpunk 2077
6. `vapor` - Vaporwave
7. `zen` - Minimalist zen

**Per TODOs.md requirement:** Change from cycling to popup selector menu.

### Achievement System

**Structure:**
- `DEFAULT_ACHIEVEMENTS` array (line 1026): 14 built-in achievements
- `achUserDefined` array: User-created achievements
- `achUnlocked` Set: IDs of unlocked achievements
- `achCustom` object: User overrides for title/desc

**Achievement types:**
- `tasks_today` - Tasks completed today
- `lines_today` - Bingo lines today
- `full_board` - All cells completed
- `streak` - Consecutive days with bingo
- `tasks_total` - Lifetime task completions
- `hour_before` / `hour_after` - Time-based
- `mandatory` - Required task completed

### Bingo Line Detection

Algorithm (in `render()` function, ~line 1810):
1. Reshape state[] to gridSize x gridSize matrix
2. Check all rows for completion
3. Check all columns for completion
4. Check main diagonal (top-left to bottom-right)
5. Check anti-diagonal (top-right to bottom-left)
6. Apply `bingo-line` class to completed cells
7. Trigger celebration effects for new lines

## Important Implementation Notes

### Data Migration

- Version stored in `adhd_bingo_version` (current: `3.0.0`)
- `runMigration()` function (line 1105) handles schema upgrades
- Always bump `APP_VERSION` constant when breaking changes

### Service Worker Strategy

- **Cache First** for app shell (index.html)
- **Network First** for Google Fonts CSS
- **Cache First** for font files
- Analytics pass-through (fail silently)
- Update `CACHE_VERSION` in `sw.js` to force cache refresh

### Browser Compatibility

- Uses modern JavaScript (ES6+): arrow functions, async/await, template literals
- CSS custom properties (CSS variables) for theming
- Web Crypto API for password hashing
- Canvas API for confetti effects
- Web Audio API for sound effects
- Navigator.vibrate() for haptic feedback

### Performance Considerations

- No virtual DOM - direct DOM manipulation
- Event delegation would be better but individual listeners used
- localStorage operations synchronous (OK for small data)
- Animation triggers via CSS classes
- Confetti canvas cleaned up after animation

### Known Limitations

1. **No backend**: All data local, device-specific
2. **No sync**: Multiple devices don't sync
3. **Data loss risk**: Clearing browser cache = data loss (mitigated by export/import)
4. **Single-user focused**: Multi-user support exists but is basic
5. **No undo**: Can't undo task completion (only toggle off)

## Future Plans (from TODOs.md)

### Phase 1: Web端优化
1. **Remove login/register modal** - Use localStorage directly
2. **Theme selector popup** - Replace cycling with popup menu
3. Other optimizations TBD

### Phase 2: Tauri Desktop App
1. Package with Tauri
2. Replace localStorage with `tauri-plugin-fs`
3. Persistent file-based storage

### Implementation Principles
- Maintain original UI/UX design exactly
- Don't break existing functionality
- Phase-by-phase approach with validation
- Document implementation decisions in TODOs.md

## Key Constants

```javascript
const KP = 'adhd_bingo_';           // Storage key prefix
const APP_VERSION = '3.0.0';        // Current version
const DEFAULT_TASKS = [...];        // 30 default task names
const CIRC = 157.08;                // Circle circumference for progress ring
```

## Common Tasks

### Adding a New Theme

1. Add CSS rules in `<style>` section (follow existing pattern: `body.theme-{name}`)
2. Add to `THEMES` array (line 1561): `{id:'name', label:'Display Name', emoji:'🎨'}`
3. Add CSS class to `THEME_CLASSES` (auto-generated)

### Modifying Task Groups

Groups stored in `adhd_bingo_groups`:
```javascript
[{
  name: "分组名称",
  tasks: [
    {name: "任务名", active: true/false}
  ]
}]
```

### Export/Import Format

- Export: Base64-encoded JSON of all localStorage keys
- Schema version: `EXPORT_SCHEMA_VERSION = '1.0'`
- Compatible with WeChat miniprogram format
- Handles user prefix mapping for cross-user imports
