# Changelog

All notable changes to LinearCalendar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-12-15

### Added

- **Range Selection**: Mouse drag to select multiple dates
  - `enableRangeSelection()` - Turn on range selection mode
  - `disableRangeSelection()` - Turn off range selection mode
  - `onRangeSelect(startDate, endDate)` callback for selection events
  - `addEventToRange(start, end, type, options)` - Bulk add events to range
  - Visual feedback with `.range-selecting` class during drag
  - Crosshair cursor in range selection mode

- **Full Event Customization**: Per-event visual control
  - `color` option - Custom hex color per event (overrides type default)
  - `opacity` option - Per-event opacity 0-1 (overrides global setting)
  - `icon` option - Custom emoji per event (overrides type default)
  - `showIcon` option - Toggle icon visibility per event
  - `marker` option - Override marker type per event (dot/bar/badge)

- **Global Type Customization**:
  - `customizeEventType(type, config)` - Modify type appearance globally
  - Supports: color, icon, label, marker, showIcon properties
  - Create/modify custom event types on the fly

- **New Event Type**:
  - `custom` - Fully customizable event type (indigo by default)
  - Intended for user-defined event categories

- **Enhanced Options**:
  - `enableRangeSelection: false` - Enable range selection mode on init
  - `onRangeSelect: null` - Callback when date range selected

- **Demo Enhancements**:
  - Range selection toggle with enable/disable switch
  - Range info display showing selected dates
  - Color picker for custom event colors
  - Opacity slider for per-event transparency
  - Marker type selector (dot/bar/badge radio buttons)
  - Emoji picker with 12 common emojis
  - "Show Icon" toggle to disable emoji display
  - Custom event creation with full options
  - Apply events to selected ranges

### Changed

- `addEvent()` signature enhanced with customization options:
  - Old: `addEvent(date, type, { label })`
  - New: `addEvent(date, type, { label, color, opacity, icon, showIcon, marker })`

- `createEventIndicator()` now respects per-event overrides
  - Checks event properties before falling back to type defaults
  - Per-event options take precedence: `event.color || eventType.color`

- `generateDayCell()` updated for range selection:
  - Conditional mouse event handlers based on `enableRangeSelection` flag
  - Adds `mousedown`, `mouseenter`, `mouseup` handlers for drag selection
  - Falls back to click handler when range selection disabled

- Event type objects enhanced:
  - Added `showIcon` boolean property to all types
  - `eventTypes` object is now mutable for `customizeEventType()`

### Fixed

- Range selection handles both forward and backward drag
- Range visual feedback clears properly on selection complete
- Per-event opacity properly applies to background
- Icon visibility respects per-event `showIcon` override

### CSS

- `.range-selecting` class for selected dates during drag
  - Background: `rgba(14, 99, 156, 0.25)` (25% opacity blue)
  - Border: `2px solid var(--calendar-accent)`
  - Z-index: `10` (above other cells)

- `.range-selecting.today` override
  - Maintains full accent background for today visibility

- `[data-range-mode="true"]` cursor styling
  - Crosshair cursor for all day cells in selection mode

### Performance

- Range selection uses document fragment for batch visual updates
- Event customization uses property checks instead of deep merges
- Minimal re-renders during range drag (only affected cells)

---

## [2.0.0] - 2025-12-15

### Added

- **Typed Events System**: Support for 8 event types
  - `holiday` - Public holidays with badge marker (🎉)
  - `vacation` - Vacation days with bar marker (✈️)
  - `note` - Notes/journal entries with dot marker (📝)
  - `appointment` - Medical/personal appointments with dot marker (📅)
  - `meeting` - Business meetings with dot marker (🤝)
  - `birthday` - Birthday celebrations with badge marker (🎂)
  - `deadline` - Project deadlines with bar marker (⏰)
  - `reminder` - Task reminders with dot marker (🔔)

- **Visual Event Markers** (inspired by Outlook & Google Calendar):
  - **Dots**: Small colored circles at bottom (default for most events)
  - **Bars**: Vertical colored bars on left edge (vacations, deadlines)
  - **Badges**: Icon badges with emoji (holidays, birthdays)

- **New API Methods**:
  - `addEvent(date, type, options)` - Add single typed event
  - `addEvents(events)` - Add multiple events at once
  - `removeEvent(date, type)` - Remove event(s) from date
  - `getEvents(date)` - Get events for specific date
  - `getAllEvents()` - Get all events map
  - `clearAllEvents()` - Remove all events
  - `setWeekendOpacity(opacity)` - Adjust weekend background (0-1)
  - `setMarkedDateOpacity(opacity)` - Adjust event background (0-1)

- **Options**:
  - `weekendOpacity: 0.15` - Adjustable weekend background opacity
  - `markedDateOpacity: 0.25` - Adjustable event background opacity
  - Updated `onDayClick(date, events, e)` callback with events parameter

- **CSS Improvements**:
  - CSS custom property `--weekend-opacity` for dynamic weekend tint
  - CSS custom property `--marked-opacity` for dynamic event tint
  - Styles for `.event-dot`, `.event-bar`, `.event-badge`
  - `.event-indicators` container for multiple events per day
  - `.has-events` class for days with typed events

- **Enhanced Demo**:
  - Opacity sliders with 3 preset modes (Light, Medium, Strong)
  - Event type buttons for quick testing
  - Real-time event counter and breakdown
  - Sample events with varied types

### Changed

- **BREAKING**: Removed gradient backgrounds for weekends
  - Now uses solid color with adjustable opacity via `color-mix()`
  - Weekend styling more consistent and customizable

- **BREAKING**: `onDayClick` signature changed
  - Old: `onDayClick(date)`
  - New: `onDayClick(date, events, mouseEvent)`

- Day cell structure refactored:
  - Day number wrapped in `.calendar-day-number` span
  - Event indicators in separate `.event-indicators` container
  - Better separation of content and styling

- Internal state management:
  - Added `events` Map for typed events
  - Added `eventTypes` configuration object
  - Legacy `markedDates` Set still supported

### Deprecated

- `markDates()`, `unmarkDates()`, `clearMarkedDates()`, `getMarkedDates()` - Still functional but marked as legacy
  - Use new typed events API (`addEvent`, `removeEvent`, etc.) for better functionality
  - Simple dot marker vs. rich visual markers with types

### Fixed

- Weekend opacity now dynamically adjustable without re-render
- Event markers properly positioned and styled
- Multiple events on same day properly displayed with visual indicators
- Click handlers properly attached to event-marked days

### Performance

- Optimized `updateDayCell()` for single cell updates
- Event indicator rendering uses CSS classes for better performance
- Color mixing via CSS `color-mix()` instead of JavaScript calculations

---

## [1.0.0] - 2025-12-15

### Added

- Initial release
- Infinite vertical scroll calendar
- Week-based layout with 12-color month visualization
- Configurable week start (Monday/Sunday)
- Date marking with simple dot indicators
- Weekend detection with gradient backgrounds
- Month transition borders
- Today indicator
- Locale-aware weekday names
- Click handlers for marked dates
- Responsive design
- Zero dependencies (vanilla JavaScript ES6+)
- UMD module format (CDN + npm compatible)
