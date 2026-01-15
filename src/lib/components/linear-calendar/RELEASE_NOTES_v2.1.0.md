# LinearCalendar v2.1.0 Release Notes

**Release Date**: December 15, 2025

## 🎯 Overview

Version 2.1.0 brings **range selection** and **full event customization** to LinearCalendar, making it the most flexible calendar component for JavaScript projects. Users can now select multiple dates with mouse drag and customize every visual aspect of events (colors, opacity, icons, markers) both per-event and globally.

## ✨ Major New Features

### 1. Range Selection 🖱️

Select multiple dates with an intuitive drag interaction:

```javascript
const calendar = new LinearCalendar('#calendar', {
  enableRangeSelection: true,
  onRangeSelect: (startDate, endDate) => {
    console.log(`Selected: ${startDate} to ${endDate}`);

    // Add vacation to entire range
    calendar.addEventToRange(startDate, endDate, 'vacation', {
      label: 'Summer vacation',
      color: '#f59e0b',
      opacity: 0.3
    });
  }
});
```

**Features**:
- Click and drag to select date ranges
- Visual feedback during selection (blue highlight)
- Crosshair cursor in selection mode
- Works in both directions (forward/backward drag)
- `onRangeSelect` callback receives Date objects
- `addEventToRange()` for bulk event creation

**API**:
```javascript
calendar.enableRangeSelection();  // Turn on
calendar.disableRangeSelection(); // Turn off
calendar.addEventToRange(start, end, 'vacation', options);
```

### 2. Full Event Customization 🎨

Customize every visual aspect of events with per-event options:

```javascript
// Custom colors
calendar.addEvent('2025-12-25', 'holiday', {
  label: 'Christmas',
  color: '#dc2626',      // Custom red
  opacity: 0.5           // 50% transparency
});

// Custom icons
calendar.addEvent('2025-07-04', 'holiday', {
  label: 'Independence Day',
  icon: '🇺🇸',          // Custom emoji
  showIcon: true,        // Show in badge
  marker: 'badge'        // Use badge marker
});

// No icons
calendar.addEvent('2025-01-15', 'deadline', {
  label: 'Project due',
  showIcon: false,       // Hide emoji
  marker: 'bar',         // Use bar marker only
  color: '#ef4444'
});
```

**Per-Event Options**:
- `color`: Custom hex color (overrides type default)
- `opacity`: Background opacity 0-1 (overrides global setting)
- `icon`: Custom emoji string (overrides type default)
- `showIcon`: Boolean to show/hide icon (overrides type default)
- `marker`: Marker type override ('dot', 'bar', 'badge')

### 3. Global Type Customization ⚙️

Modify the appearance of all events of a specific type:

```javascript
// Change all vacations to use bars with no icons
calendar.customizeEventType('vacation', {
  color: '#ff6b6b',
  marker: 'bar',
  showIcon: false
});

// Create custom event type appearance
calendar.customizeEventType('custom', {
  color: '#8b5cf6',
  icon: '⭐',
  label: 'Special Event',
  marker: 'badge',
  showIcon: true
});
```

**Benefits**:
- Consistent styling across event types
- Brand matching (use company colors)
- Accessibility improvements (adjust opacity, disable icons)
- Project-specific customization

## 🔧 API Changes

### New Methods

#### Range Selection
- `enableRangeSelection()` - Enable mouse drag selection
- `disableRangeSelection()` - Disable range selection
- `addEventToRange(start, end, type, options)` - Add event to multiple dates

#### Customization
- `customizeEventType(type, config)` - Modify type appearance globally

### Enhanced Methods

#### `addEvent(date, type, options)`

**v2.0.0**:
```javascript
calendar.addEvent('2025-12-25', 'holiday', { label: 'Christmas' });
```

**v2.1.0**:
```javascript
calendar.addEvent('2025-12-25', 'holiday', {
  label: 'Christmas',
  color: '#dc2626',    // NEW
  opacity: 0.4,        // NEW
  icon: '🎅',          // NEW
  showIcon: true,      // NEW
  marker: 'badge'      // NEW
});
```

**Backward compatible**: Old code still works, new options are optional.

### New Options

```javascript
const calendar = new LinearCalendar('#calendar', {
  // ... existing options
  enableRangeSelection: false,  // NEW
  onRangeSelect: (start, end) => { /* ... */ }  // NEW
});
```

### New Event Type

- **`custom`** - Fully customizable type (indigo by default)
- Use for user-defined categories
- Modify with `customizeEventType('custom', {...})`

## 🎨 CSS Additions

### Range Selection Styles

```css
/* Selected dates during drag */
.range-selecting {
  background: rgba(14, 99, 156, 0.25) !important;
  border: 2px solid var(--calendar-accent);
  z-index: 10;
}

/* Preserve today styling */
.range-selecting.today {
  background: var(--calendar-accent) !important;
}

/* Crosshair cursor in selection mode */
[data-range-mode="true"] .calendar-day {
  cursor: crosshair;
}
```

## 📊 Use Cases

### Vacation Planning
```javascript
// Select vacation dates
calendar.enableRangeSelection();
// User drags from July 14 to July 21
// In onRangeSelect callback:
calendar.addEventToRange(startDate, endDate, 'vacation', {
  label: 'Summer vacation',
  color: '#f59e0b'
});
```

### Project Timelines
```javascript
// Different colors for different projects
calendar.addEvent('2025-01-15', 'deadline', {
  label: 'Alpha release',
  color: '#3b82f6',    // Blue for project A
  marker: 'bar'
});

calendar.addEvent('2025-02-01', 'deadline', {
  label: 'Beta release',
  color: '#10b981',    // Green for project B
  marker: 'bar'
});
```

### Habit Tracking
```javascript
// Track workouts with custom icons
calendar.addEvent('2025-12-15', 'custom', {
  icon: '💪',
  showIcon: true,
  marker: 'badge',
  color: '#22c55e'
});

// Or without icons for minimal look
calendar.addEvent('2025-12-16', 'custom', {
  showIcon: false,
  marker: 'dot',
  color: '#22c55e'
});
```

### Brand Matching
```javascript
// Use company colors
calendar.customizeEventType('meeting', {
  color: '#FF5722',  // Company orange
  showIcon: false    // Minimal look
});
```

## 🔄 Migration from v2.0.0

### No Breaking Changes

All v2.0.0 code works unchanged in v2.1.0:

```javascript
// v2.0.0 code - still works
calendar.addEvent('2025-12-25', 'holiday', { label: 'Christmas' });
```

### Optional Enhancements

To use new features:

1. **Enable range selection**:
```javascript
// Add to options
enableRangeSelection: true,
onRangeSelect: (start, end) => { /* handle selection */ }

// Or enable/disable dynamically
calendar.enableRangeSelection();
```

2. **Customize events**:
```javascript
// Add options to existing addEvent calls
calendar.addEvent('2025-12-25', 'holiday', {
  label: 'Christmas',
  color: '#dc2626',  // Add custom color
  opacity: 0.5       // Add custom opacity
});
```

3. **Customize types globally**:
```javascript
// After calendar creation
calendar.customizeEventType('vacation', {
  color: '#ff6b6b',
  marker: 'bar',
  showIcon: false
});
```

## 📦 Demo Updates

The demo now includes:

1. **Range Selection Panel**:
   - Enable/disable toggle
   - Selected range display
   - Instructions

2. **Custom Event Creator**:
   - Color picker (hex input + visual picker)
   - Opacity slider (0-100%)
   - Marker type selector (dot/bar/badge)
   - Show icon toggle
   - Emoji picker (12 common emojis)

3. **Smart Behavior**:
   - Custom events apply to selected range if active
   - Falls back to random date if no range selected
   - Visual feedback on range application

## 🚀 Performance

- Range selection uses minimal re-renders (only affected cells)
- Event customization uses property checks (no deep merges)
- CSS-driven visual feedback (no JavaScript animations)
- Efficient event handling with conditional listeners

## 📝 Documentation

Updated documentation includes:

- [README.md](README.md) - Complete API reference with range selection and customization
- [CHANGELOG.md](CHANGELOG.md) - Detailed v2.1.0 changes
- [demo.html](demo.html) - Interactive demo with all new features

## 🐛 Bug Fixes

- Range selection handles both forward and backward drag correctly
- Range visual feedback clears properly on selection complete
- Per-event opacity applies correctly to background
- Icon visibility respects per-event `showIcon` override

## 🎯 What's Next

Potential future enhancements (not yet implemented):

- Touch support for range selection on mobile
- Multi-select (non-contiguous dates)
- Keyboard navigation for range selection
- Range selection via Shift+Click
- Event templates for quick creation
- Import/export events (JSON, iCal)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/stephanedenis/pensine-web/issues)
- **Discussions**: [GitHub Discussions](https://github.com/stephanedenis/pensine-web/discussions)
- **Demo**: [Live Demo](https://stephanedenis.github.io/pensine-web/lib/components/linear-calendar/demo.html)

---

**Thank you for using LinearCalendar!** 🎉

We hope these new features make your calendar experience more flexible and powerful. Please report any issues or suggestions on GitHub.

**Team Pensine**
