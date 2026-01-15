# LinearCalendar

**v2.1.0** - Standalone infinite scrolling linear calendar with range selection, typed events, full customization, and adjustable opacity.

## ✨ Features

- **Infinite vertical scroll**: Dynamically loads past/future weeks as you scroll
- **Range selection**: Drag to select multiple dates for bulk event creation
- **Full event customization**: Per-event colors, opacity, icons, and marker types
- **12-color month palette**: High-contrast colors differentiate adjacent months
- **Week-based layout**: Compact grid showing one week per row
- **Typed events**: Support for 8 built-in event types + custom type
- **Visual markers**: Dots, bars, and badges inspired by Outlook and Google Calendar
- **Adjustable opacity**: Configure weekend and event background opacity
- **Configurable week start**: Monday or Sunday as first day
- **Locale-aware**: Weekday names in any language
- **Weekend detection**: Customizable background tint for weekends
- **Month transitions**: Visual borders at month boundaries
- **Today indicator**: Highlighted current date with distinct styling
- **Zero dependencies**: Pure vanilla JavaScript ES6+

## 📦 Installation

### CDN (fastest)

```html
<link rel="stylesheet" href="https://unpkg.com/@pensine/linear-calendar/linear-calendar.css">
<script src="https://unpkg.com/@pensine/linear-calendar/linear-calendar.js"></script>
```

### npm

```bash
npm install @pensine/linear-calendar
```

```javascript
import LinearCalendar from '@pensine/linear-calendar';
import '@pensine/linear-calendar/linear-calendar.css';
```

### Local

```html
<link rel="stylesheet" href="path/to/linear-calendar.css">
<script src="path/to/linear-calendar.js"></script>
```

## 🚀 Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="linear-calendar.css">
</head>
<body>
    <div id="calendar" style="width: 600px; height: 400px;"></div>

    <script src="linear-calendar.js"></script>
    <script>
        const calendar = new LinearCalendar('#calendar', {
            weekStartDay: 1, // Monday
            markedDates: ['2025-12-15', '2025-12-20'],
            onDayClick: (date) => {
                console.log('Clicked:', date);
                calendar.markDates([date]);
            }
        });
    </script>
</body>
</html>
```

## 📖 API Reference

### Constructor

```javascript
new LinearCalendar(container, options)
```

**Parameters:**

- `container` (String|HTMLElement) - CSS selector or DOM element
- `options` (Object) - Configuration object

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `weekStartDay` | Number | `1` | First day of week (0=Sunday, 1=Monday) |
| `weeksToLoad` | Number | `52` | Initial weeks to load centered on today |
| `locale` | String | `'en-US'` | Locale for weekday names |
| `markedDates` | Array | `[]` | Initial dates to highlight (YYYY-MM-DD) - legacy |
| `weekendOpacity` | Number | `0.15` | Weekend background opacity (0-1) |
| `markedDateOpacity` | Number | `0.25` | Event background opacity (0-1) |
| `enableRangeSelection` | Boolean | `false` | Enable mouse drag range selection |
| `onDayClick` | Function | `null` | Callback when day clicked: `(date, events, e) => {}` |
| `onRangeSelect` | Function | `null` | Callback when range selected: `(startDate, endDate) => {}` |
| `onWeekLoad` | Function | `null` | Callback when weeks loaded: `(direction) => {}` |
| `infiniteScroll` | Boolean | `true` | Enable infinite scroll loading |
| `monthColors` | Array | `[...]` | 12 custom hex colors for months |

### Methods

#### `scrollToToday()`

Scroll calendar to current week with smooth animation.

```javascript
calendar.scrollToToday();
```

#### `scrollToDate(date)`

Scroll calendar to specific date. Loads weeks if needed.

```javascript
calendar.scrollToDate('2025-12-15');
calendar.scrollToDate(new Date('2025-12-15'));
```

#### `addEvent(date, type, options)`

Add a typed event to a specific date.

```javascript
calendar.addEvent('2025-12-25', 'holiday', {
  label: 'Christmas Day',
  color: '#dc2626' // optional custom color
});
```

**Event Types**: `holiday`, `vacation`, `note`, `appointment`, `meeting`, `birthday`, `deadline`, `reminder`

**Visual Markers**:
- **Dots** (note, appointment, meeting, reminder): Small colored circles at bottom
- **Bars** (vacation, deadline): Vertical colored bars on left edge
- **Badges** (holiday, birthday): Icon badges with emoji

#### `addEvents(events)`

Add multiple events at once.

```javascript
calendar.addEvents([
  { date: '2025-12-25', type: 'holiday', label: 'Christmas' },
  { date: '2025-12-31', type: 'birthday', label: 'New Year' }
]);
```

#### `removeEvent(date, type)`

Remove event(s) from a date.

```javascript
calendar.removeEvent('2025-12-25'); // Remove all events
calendar.removeEvent('2025-12-25', 'holiday'); // Remove specific type
```

#### `getEvents(date)`

Get all events for a specific date.

```javascript
const events = calendar.getEvents('2025-12-25');
console.log(events); // [{type: 'holiday', label: '...', ...}]
```

#### `getAllEvents()`

Get all events in the calendar.

```javascript
const allEvents = calendar.getAllEvents(); // Map<date, events[]>
```

#### `clearAllEvents()`

Remove all events from calendar.

```javascript
calendar.clearAllEvents();
```

#### `setWeekendOpacity(opacity)`

Adjust weekend background opacity (0-1).

```javascript
calendar.setWeekendOpacity(0.3); // 30% opacity
```

#### `setMarkedDateOpacity(opacity)`

Adjust event background opacity (0-1).

```javascript
calendar.setMarkedDateOpacity(0.4); // 40% opacity
```

### Range Selection

#### `enableRangeSelection()`

Enable range selection mode. Users can click and drag to select multiple dates.

```javascript
calendar.enableRangeSelection();
```

#### `disableRangeSelection()`

Disable range selection mode.

```javascript
calendar.disableRangeSelection();
```

#### `addEventToRange(startDate, endDate, type, options)`

Add an event to all dates in a range (inclusive).

```javascript
// Add vacation to a week
calendar.addEventToRange('2025-07-14', '2025-07-21', 'vacation', {
  label: 'Summer vacation',
  color: '#f59e0b',
  opacity: 0.3
});
```

**Parameters**:
- `startDate`: Start date (Date object or string)
- `endDate`: End date (Date object or string)
- `type`: Event type (string)
- `options`: Customization options (see Event Customization below)

### Event Customization

Events support per-instance customization of colors, opacity, icons, and marker types.

#### Per-Event Options

```javascript
calendar.addEvent('2025-12-25', 'holiday', {
  label: 'Christmas',
  color: '#dc2626',       // Custom red color
  opacity: 0.4,           // 40% background opacity
  icon: '🎅',             // Custom emoji
  showIcon: true,         // Show the icon in badge
  marker: 'badge'         // Use badge marker (instead of default dot)
});
```

**Options**:
- `label`: Event description (string)
- `color`: Custom hex color (overrides type default)
- `opacity`: Background opacity 0-1 (overrides global markedDateOpacity)
- `icon`: Custom emoji string (overrides type default)
- `showIcon`: Boolean to show/hide icon (overrides type default)
- `marker`: Marker type: 'dot', 'bar', or 'badge' (overrides type default)

#### Global Type Customization

Modify the appearance of all events of a specific type.

```javascript
// Change all vacation events to use bars with no icons
calendar.customizeEventType('vacation', {
  color: '#ff6b6b',
  marker: 'bar',
  showIcon: false
});

// Customize the custom type
calendar.customizeEventType('custom', {
  color: '#8b5cf6',
  icon: '⭐',
  label: 'Special',
  marker: 'badge',
  showIcon: true
});
```

**Configuration Properties**:
- `color`: Hex color code (e.g., '#ff6b6b')
- `icon`: Emoji string (e.g., '🎯')
- `label`: Default label (string)
- `marker`: Default marker type ('dot', 'bar', 'badge')
- `showIcon`: Boolean for default icon visibility

#### Customization Precedence

Per-event options override type defaults:

```javascript
// Type default: vacation uses dots
calendar.eventTypes.vacation.marker; // 'dot'

// This specific event uses a badge
calendar.addEvent('2025-07-15', 'vacation', {
  marker: 'badge',
  icon: '🏖️',
  showIcon: true
});
```

#### `markDates(dates)` (Legacy)

Add highlighted dates (simple dot indicator).

```javascript
calendar.markDates(['2025-12-15', '2025-12-20']);
```

#### `unmarkDates(dates)` (Legacy)

Remove highlighted dates.

```javascript
calendar.unmarkDates(['2025-12-15']);
```

#### `clearMarkedDates()` (Legacy)

Remove all highlighted dates.

```javascript
calendar.clearMarkedDates();
```

#### `getMarkedDates()` (Legacy)

Get array of currently marked dates (YYYY-MM-DD format).

```javascript
const dates = calendar.getMarkedDates();
console.log(dates); // ['2025-12-15', '2025-12-20']
```

#### `refresh()`

Re-render all visible weeks (useful after state changes).

```javascript
calendar.refresh();
```

#### `destroy()`

Remove all event listeners and DOM elements.

```javascript
calendar.destroy();
```

## 🎨 Customization

### Month Colors

Override the default 12-color palette:

```javascript
const calendar = new LinearCalendar('#calendar', {
    monthColors: [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
        '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e',
        '#e17055', '#74b9ff', '#a29bfe', '#55efc4'
    ]
});
```

### CSS Variables

```css
.linear-calendar-container {
    /* Theme colors */
    --calendar-bg: #f9fafb;
    --calendar-bg-secondary: #ffffff;
    --calendar-bg-tertiary: #f3f4f6;
    --calendar-border: #e5e7eb;
    --calendar-text: #374151;
    --calendar-text-secondary: #6b7280;
    --calendar-accent: #0e639c;
    --calendar-accent-hover: #0a4d7a;
    --calendar-success: #10b981;

    /* Month colors (override individually) */
    --month-color-0: #f97316;  /* January */
    --month-color-1: #2563eb;  /* February */
    /* ... */
}
```

### Dark Mode

Automatically adapts to `prefers-color-scheme: dark`:

```css
@media (prefers-color-scheme: dark) {
    .linear-calendar-container {
        --calendar-bg: #1f2937;
        --calendar-bg-secondary: #111827;
        /* ... */
    }
}
```

## 💡 Examples

### Journal/Note-Taking App

```javascript
const calendar = new LinearCalendar('#calendar', {
    weekStartDay: 1,
    weekendOpacity: 0.15,
    onDayClick: async (date, events) => {
        if (events.length > 0) {
            // Load existing entries
            const entry = await loadJournalEntry(date);
            displayEditor(entry);
        } else {
            // Create new entry
            createNewJournalEntry(date);
        }
    }
});

// Mark dates with journal entries
calendar.addEvents(
    journalDates.map(date => ({ date, type: 'note', label: 'Journal Entry' }))
);
```

### Event Calendar

```javascript
const calendar = new LinearCalendar('#calendar', {
    weekStartDay: 0, // Sunday
    weekendOpacity: 0.2,
    markedDateOpacity: 0.3
});

// Add different event types
calendar.addEvents([
    { date: '2025-12-25', type: 'holiday', label: 'Christmas' },
    { date: '2025-12-20', type: 'meeting', label: 'Team Standup' },
    { date: '2025-12-22', type: 'birthday', label: 'Sarah\'s Birthday' },
    { date: '2025-12-27', type: 'vacation', label: 'Winter Break' }
]);
```

### Habit Tracker

```javascript
const calendar = new LinearCalendar('#calendar', {
    weekendOpacity: 0.1,
    onDayClick: (date, events) => {
        const dateStr = calendar.formatDate(date);
        if (events.length > 0) {
            calendar.removeEvent(dateStr, 'note');
        } else {
            calendar.addEvent(dateStr, 'note', { label: 'Completed' });
        }
    }
});
```

## 🧪 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires ES6+ support. For older browsers, use a transpiler.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🐛 Bug Reports

Report issues at: https://github.com/stephanedenis/pensine-web/issues

## 📚 Related

Part of the [Pensine Web](https://github.com/stephanedenis/pensine-web) project - a knowledge management system using GitHub as backend.
