# Component Reference - CoffeeFlow

Every component lives in `src/components/`. **Reuse these before building anything new.** If a component already exists, import it — don't recreate it inline or create a duplicate.

---

## Icon

**File:** `src/components/Icons.tsx`

Renders a Material Symbols Outlined icon. Self-hosted via `@fontsource/material-symbols-outlined` — no CDN.

```tsx
import { Icon } from '../components/Icons';

// Basic icon
<Icon name="coffee_maker" />

// Filled icon (active state)
<Icon name="star" className="text-yellow-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} />

// With size
<Icon name="arrow_back" className="text-[24px]" />
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Material Symbols icon name (e.g. `"coffee_maker"`, `"star"`, `"arrow_back"`) |
| `className` | `string?` | Tailwind classes for size/color |
| `style` | `React.CSSProperties?` | Use for `fontVariationSettings` to toggle FILL |

**When to use:** Every icon in the app. Never use raw `<span className="material-symbols-outlined">` directly — always use the `Icon` component.

---

Also exports `SplashLogoIcon` — a custom SVG coffee cup logo:

```tsx
import { SplashLogoIcon } from '../components/Icons';

<SplashLogoIcon className="w-6 h-6 text-primary" />
```

Used in: splash screen, empty states, SmartImportModal header, import brand identity.

---

## Modal

**File:** `src/components/Modal.tsx`

Centered confirmation dialog with icon, title, message, confirm/cancel buttons. Used for destructive actions (delete, stop brew, clear data).

```tsx
import { Modal } from '../components/Modal';

const [isOpen, setIsOpen] = useState(false);

<Modal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onConfirm={() => { /* handle confirm */ }}
    title="Delete Recipe?"
    message="Are you sure? This cannot be undone."
    confirmText="Delete"
    cancelText="Cancel"
    type="error"
/>
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Called on cancel or backdrop click |
| `onConfirm` | `() => void` | — | Called when confirm is clicked |
| `title` | `string` | required | Dialog title |
| `message` | `string` | required | Dialog body text |
| `confirmText` | `string` | `"Confirm"` | Confirm button label |
| `cancelText` | `string` | `"Cancel"` | Cancel button label |
| `type` | `'warning' \| 'info' \| 'error' \| 'success'` | `"info"` | Icon + color variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `"sm"` | Dialog width: `max-w-sm` / `max-w-md` / `max-w-lg` |

**Type variants:**
- `"warning"` — yellow warning icon
- `"error"` — red error icon
- `"info"` — primary-colored info icon
- `"success"` — green success icon

**When to use:** Any destructive or irreversible action. Never use `window.confirm()` or `alert()` for user-facing confirmations.

---

## Toast

**File:** `src/components/Toast.tsx`

Inline feedback bar with success icon and optional action button.

```tsx
import { Toast } from '../components/Toast';

<Toast
    message="Recipe saved successfully"
    actionLabel="Undo"
    onAction={() => handleUndo()}
/>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `message` | `string` | Toast message text |
| `actionLabel` | `string?` | Optional action button label |
| `onAction` | `() => void?` | Called when action button is clicked |

**When to use:** Non-blocking success/error feedback. The toast does not auto-dismiss — it stays until the parent removes it. Manage visibility with a state variable.

---

## Button

**File:** `src/components/Button.tsx`

Reusable button with variant and size presets. Uses `twMerge` for class merging.

```tsx
import { Button } from '../components/Button';

// Primary (default)
<Button onClick={handleSave}>Save Recipe</Button>

// Secondary
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>

// Ghost (text-only)
<Button variant="ghost" onClick={handleBack}>Back</Button>

// Leading icon
<Button icon={<Icon name="save" className="text-[20px]" />} onClick={handleSave}>
    Save
</Button>

// Toggle chip (active)
<Button size="sm" variant="secondary" active>Selected</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Disabled
<Button disabled={!isReady}>Start Timer</Button>
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'filled' \| 'secondary' \| 'ghost'` | `"filled"` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `"md"` | Button size |
| `active` | `boolean` | `false` | Selected/toggle highlight (secondary-container). Use for filter chips |
| `icon` | `ReactNode` | — | Optional leading icon element |
| `disabled` | `boolean` | — | Disables the button with opacity + cursor |
| `children` | `ReactNode` | required | Button content |
| All `ButtonHTMLAttributes` | — | — | Passes through `onClick`, `type`, `className`, etc. |

**Variant styles:**
- `filled` (default): filled coffee brown, white text
- `secondary`: secondary-container with on-secondary-container text
- `ghost`: transparent with gray hover
- `active`: secondary-container highlight (toggle/selected state)

**When to use:** Any clickable action, including toggle/filter chips — use `active` + `size="sm"` for selection chips. If the existing variants don't match your needs, extend this component rather than creating a new one.

---

## Input

**File:** `src/components/Input.tsx`

Text input with optional label, error state, icon, and right element.

```tsx
import { Input } from '../components/Input';

// Basic
<Input
    placeholder="Enter recipe name"
    value={name}
    onChange={(e) => setName(e.target.value)}
/>

// With label
<Input
    label="Recipe Name"
    placeholder="e.g. Even Extraction Flow"
    value={name}
    onChange={(e) => setName(e.target.value)}
/>

// With error
<Input
    label="Ratio"
    value={ratio}
    error="Use a valid ratio, e.g. 1:15"
    onChange={(e) => setRatio(e.target.value)}
/>

// With icon
<Input
    icon="search"
    placeholder="Search recipes..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
/>

// With right element (e.g. unit suffix)
<Input
    label="Water"
    value={water}
    rightElement={<span className="text-sm text-gray-400">ml</span>}
    onChange={(e) => setWater(e.target.value)}
/>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `label` | `string?` | Label above input |
| `error` | `string?` | Error message below input (also changes border to red) |
| `icon` | `string?` | Material icon name shown left of input |
| `rightElement` | `ReactNode?` | Element shown at right edge inside input |
| `active` | `boolean?` | Visual active state (primary border + glow) |
| All `InputHTMLAttributes` | — | Passes through `type`, `value`, `onChange`, `placeholder`, etc. |

**When to use:** Any text/number input in forms. For dropdowns, use `Dropdown` instead.

---

## Dropdown

**File:** `src/components/Dropdown.tsx`

Custom select dropdown with label, icon, and click-outside close.

```tsx
import { Dropdown } from '../components/Dropdown';

<Dropdown
    label="Brewing Method"
    icon="coffee_maker"
    options={[
        { value: 'v60', label: 'V60' },
        { value: 'aeropress', label: 'AeroPress' },
        { value: 'french_press', label: 'French Press' },
    ]}
    value={method}
    onChange={setMethod}
    placeholder="Select a method..."
    required
/>

// With disabled options
<Dropdown
    label="Grind Size"
    options={[
        { value: 'fine', label: 'Fine' },
        { value: 'medium', label: 'Medium' },
        { value: 'coarse', label: 'Coarse', disabled: true },
    ]}
    value={grind}
    onChange={setGrind}
/>
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string?` | — | Label above dropdown |
| `options` | `Option[]` | required | Array of `{ value: string, label: string, disabled?: boolean }` |
| `value` | `string` | required | Currently selected value |
| `onChange` | `(value: string) => void` | required | Called when selection changes |
| `placeholder` | `string` | `"Select an option"` | Placeholder when nothing is selected |
| `className` | `string` | `""` | Wrapper div classes |
| `buttonClassName` | `string` | `""` | Button trigger classes (e.g. `"py-3 bg-gray-50 border-gray-100"`) |
| `icon` | `string?` | — | Material icon name in label |

**When to use:** Any selection from a finite list of options. Don't use for search/filter inputs — use `Input` with `icon="search"` instead.

---

## Card

**File:** `src/components/Card.tsx`

Basic card wrapper with white background, rounded corners, border, and shadow.

```tsx
import { Card } from '../components/Card';

<Card>
    <div className="p-4">
        <h3 className="font-bold">Card Title</h3>
        <p className="text-sm text-gray-500">Card content</p>
    </div>
</Card>

// With custom classes
<Card className="hover:border-primary/30">
    ...
</Card>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `children` | `ReactNode` | Card content |
| `className` | `string?` | Additional classes (merged via `twMerge`) |
| All `HTMLAttributes<HTMLDivElement>` | — | Passes through `onClick`, `id`, etc. |

**Default styles:** `bg-surface-light rounded-xl overflow-hidden shadow-sm border border-neutral-border`

**When to use:** Wrapping content in a white card. However, most pages currently use raw `<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">` instead. Both patterns exist — prefer `Card` for new code to keep consistency.

---

## Chip

*Deprecated — merged into `Button`.* The `Chip` component has been removed to avoid a redundant button primitive. Use `Button` with the `active` prop for filter/toggle chips:

```tsx
import { Button } from '../components/Button';

// Selected (active)
<Button size="sm" variant="secondary" active>Favorites</Button>

// Unselected
<Button size="sm" variant="ghost">All</Button>

// With a leading icon
<Button size="sm" variant="ghost" icon={<Icon name="check" className="text-[16px]" />}>
    Light Roast
</Button>
```

**When to use:** Filter chips on list pages (e.g. recipe filters: All, Favorites, Personal, Community) — use `size="sm"` with `active` for the selected look. Not for standalone toggle buttons — use `Button` instead.

---

## Badge

**File:** `src/components/Badge.tsx`

Small status/label badge.

```tsx
import { Badge } from '../components/Badge';

// Default (primary)
<Badge>v60</Badge>

// Success
<Badge variant="success">Beginner</Badge>

// Warning
<Badge variant="warning">Low Stock</Badge>

// Error
<Badge variant="error">Advanced</Badge>

// Custom classes
<Badge className="uppercase tracking-widest">Custom</Badge>
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'default' \| 'success' \| 'warning' \| 'error'` | `"default"` | Color variant |
| `children` | `ReactNode` | required | Badge text |
| All `HTMLAttributes<HTMLSpanElement>` | — | — | Passes through `className`, etc. |

**Variant styles:**
- `default`: `bg-primary/10 text-primary`
- `success`: `bg-green-100 text-green-700`
- `warning`: `bg-yellow-100 text-yellow-700`
- `error`: `bg-red-100 text-red-700`

**Default size:** `px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`

**When to use:** Method labels, difficulty levels, status indicators. Not for interactive elements — use `Button` instead.

---

## ProgressBar

**File:** `src/components/ProgressBar.tsx`

Horizontal progress bar with optional label and value label.

```tsx
import { ProgressBar } from '../components/ProgressBar';

// Basic
<ProgressBar progress={65} />

// With labels
<ProgressBar
    progress={75}
    label="Water"
    valueLabel="168g / 225g"
/>

// Clamped (values outside 0-100 are handled automatically)
<ProgressBar progress={120} />  {/* renders as 100% */}
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `progress` | `number` | Percentage (0-100, clamped automatically) |
| `label` | `string?` | Left label above bar |
| `valueLabel` | `string?` | Right label above bar |

**Style:** `bg-stone-200` track, `bg-primary` fill, `h-2 rounded-full`, `transition-all duration-300`

**When to use:** Stock levels, brew progress, any percentage visualization. The BrewFlowPage uses inline progress bars instead (custom styling) — that's fine for specialized screens, but use this component for standard progress display.

---

## BottomNav

**File:** `src/components/BottomNav.tsx`

Fixed bottom navigation with 4 tabs. Used on every main screen.

```tsx
import { BottomNav } from '../components/BottomNav';

// On Home page
<BottomNav activeTab="home" />

// On Brew Methods page
<BottomNav activeTab="brewing" />

// On Pantry page
<BottomNav activeTab="pantry" />

// On Journal page
<BottomNav activeTab="journal" />
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `activeTab` | `'home' \| 'brewing' \| 'pantry' \| 'journal'` | Which tab is active |

**Tabs (fixed order):**
1. Home → `/home` (icon: `home`)
2. Brewing → `/brew-methods` (icon: `coffee_maker`)
3. Pantry → `/pantry` (icon: `inventory_2`)
4. Journal → `/journal` (icon: `history_edu`)

**When to use:** Every page that is a main destination. Pages accessed via back navigation (detail, edit, preparation) do NOT show BottomNav. The page shell adds `pb-32` to avoid content being hidden behind this nav.

**Do not:** Add a 5th tab. Do not change the tab order. Do not show BottomNav on sub-pages (detail, edit, form, timer).

---

## SmartImportModal

**File:** `src/components/SmartImportModal.tsx`

Full-featured recipe import modal with two modes: offline text parsing and AI-assisted parsing. Supports single and multi-recipe import.

```tsx
import { SmartImportModal, type ImportableRecipe } from '../components/SmartImportModal';

const [isImportOpen, setIsImportOpen] = useState(false);

<SmartImportModal
    isOpen={isImportOpen}
    onClose={() => setIsImportOpen(false)}
    onImport={(recipe, remaining) => {
        // Navigate to edit page pre-filled
        navigate(`/recipes/new/edit?method=${recipe.method_id}`, {
            state: { prefill: recipe }
        });
    }}
    onSaveDirect={async (recipe) => {
        // Save directly to DB without editing
        await brewService.saveRecipe(fullRecipe);
    }}
    initialParsedRecipes={restoredQueue}
/>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Called when modal is closed |
| `onImport` | `(recipe: ImportableRecipe, remaining?: ImportableRecipe[]) => void` | Called when "Edit & Save" is clicked — navigates to editor |
| `onSaveDirect` | `(recipe: ImportableRecipe) => Promise<void>` | Called when "Save Now" is clicked — saves directly to DB |
| `initialParsedRecipes` | `ImportableRecipe[]?` | Pre-populate with parsed recipes (for restored queue from sessionStorage) |

**Modes:**
1. **Paste Text (offline):** Paste recipe caption/notes → local regex parser extracts method, ratio, steps
2. **Use AI:** Copy prompt → paste into Gemini/ChatGPT → paste JSON response back → parse

**When to use:** Recipe import flow from RecipeListPage FAB. For single or batch recipe import from text/links.

---

## Usage Patterns Summary

| Need | Component | Example |
|---|---|---|
| Icon | `Icon` | `<Icon name="star" />` |
| Confirmation dialog | `Modal` | Delete, stop, clear data |
| Success feedback | `Toast` | After save, update |
| Clickable action | `Button` | Primary/secondary/ghost/icon |
| Text input | `Input` | Forms, search |
| Select from list | `Dropdown` | Method, category, difficulty |
| White card wrapper | `Card` | List items, content blocks |
| Filter chip | `Button` (active) | Recipe filters, tag selection |
| Status label | `Badge` | Method, difficulty, stock status |
| Percentage bar | `ProgressBar` | Stock level, brew progress |
| Bottom navigation | `BottomNav` | Every main screen |
| Recipe import | `SmartImportModal` | Recipe list FAB import |

---

## Before Creating a New Component

1. Check this document — does an existing component cover the need?
2. Check `src/components/` — is there a file you missed?
3. If extending: add props to the existing component with sensible defaults. Don't break existing usage.
4. If truly new: place it in `src/components/`, export it, and add it to this document.
