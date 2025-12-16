/**
 * LinearCalendar - Infinite scrolling linear calendar component
 * @version 2.1.0
 * @license MIT
 * @author Stéphane Denis
 *
 * Features:
 * - Infinite vertical scroll (week-based)
 * - 12-color month visualization
 * - Customizable week start day
 * - Date marking/highlighting
 * - Click handlers
 * - Weekend detection
 * - Month transition borders
 * - Responsive design
 * - Standardized configuration interface via ConfigurableComponent
 *
 * Usage:
 * const calendar = new LinearCalendar(container, {
 *   weekStartDay: 1,              // 0 = Sunday, 1 = Monday
 *   weeksToLoad: 52,              // Initial weeks (1 year)
 *   locale: 'fr-CA',              // Date formatting locale
 *   markedDates: ['2025-01-15'],  // Dates to highlight
 *   onDayClick: (date) => {...}   // Click callback
 * });
 */

class LinearCalendar extends ConfigurableComponent {
  constructor(container, options = {}) {
    // Define default options before calling super
    const defaultOptions = {
      weekStartDay: 1,               // Monday by default
      monthFormat: 'short',          // 'short' or 'long' month names
      weeksToLoad: 52,               // 1 year
      locale: 'fr-CA',               // Date formatting
      markedDates: [],               // Dates to mark (YYYY-MM-DD format)
      onDayClick: null,              // Callback(date, events, mouseEvent)
      onWeekLoad: null,              // Callback(direction, weekStart)
      onRangeSelect: null,           // Callback(startDate, endDate)
      autoScroll: true,              // Auto-scroll to current week on init
      showWeekdays: true,            // Show weekday header
      infiniteScroll: true,          // Enable infinite scroll
      monthColors: true,             // Use 12-color scheme
      weekendOpacity: 0.15,          // Weekend background opacity (0-1)
      markedDateOpacity: 0.25,       // Marked date background opacity (0-1)
      enableRangeSelection: false,   // Enable date range selection
      dayNumberPosition: 'center',   // 'center' or 'top-left'
      dayHeight: 28,                 // Day cell height in pixels
      ...options
    };

    // Call parent constructor (ConfigurableComponent)
    super(container, defaultOptions);

    // Validate container (after super sets this.container)
    if (!this.container) {
      throw new Error('Container element not found');
    }

    // Internal state
    this.state = {
      weeksLoaded: {
        earliest: null,
        latest: null
      },
      markedDates: new Set(this.options.markedDates),
      events: new Map(), // Map<date, Array<{type, color, label, icon, opacity}>>
      isLoading: false,
      isInitialized: false,
      rangeSelection: {
        isSelecting: false,
        startDate: null,
        currentDate: null
      }
    };

    // Event types configuration (can be customized)
    this.eventTypes = {
      holiday: { color: '#dc2626', icon: '🎉', label: 'Holiday', marker: 'badge', showIcon: true },
      vacation: { color: '#f59e0b', icon: '✈️', label: 'Vacation', marker: 'bar', showIcon: true },
      note: { color: '#3b82f6', icon: '📝', label: 'Note', marker: 'dot', showIcon: false },
      appointment: { color: '#8b5cf6', icon: '📅', label: 'Appointment', marker: 'dot', showIcon: false },
      meeting: { color: '#10b981', icon: '🤝', label: 'Meeting', marker: 'dot', showIcon: false },
      birthday: { color: '#ec4899', icon: '🎂', label: 'Birthday', marker: 'badge', showIcon: true },
      deadline: { color: '#ef4444', icon: '⏰', label: 'Deadline', marker: 'bar', showIcon: false },
      reminder: { color: '#06b6d4', icon: '🔔', label: 'Reminder', marker: 'dot', showIcon: false },
      custom: { color: '#6366f1', icon: '⭐', label: 'Custom', marker: 'dot', showIcon: false }
    };

    // Bind methods
    this.handleScroll = this.handleScroll.bind(this);
    this.handleDayClick = this.handleDayClick.bind(this);

    // Initialize
    this.init();

    // Mark as initialized for ConfigurableComponent
    this._initialized = true;
  }

  /**
   * Get configuration schema
   * @returns {Object} Configuration schema for UI generation
   */
  getConfigSchema() {
    return {
      groups: [
        {
          id: 'display',
          title: 'Display Options',
          icon: '🎨',
          description: 'Visual appearance and layout settings',
          properties: {
            weekStartDay: {
              type: 'select',
              title: 'Week Start Day',
              description: 'First day of the week',
              default: 1,
              options: [
                { value: 0, label: 'Sunday' },
                { value: 1, label: 'Monday' },
                { value: 6, label: 'Saturday' }
              ]
            },
            monthFormat: {
              type: 'select',
              title: 'Month Label Format',
              description: 'Short (Jan) or long (January) month names',
              default: 'short',
              options: [
                { value: 'short', label: 'Short (Jan, Feb...)' },
                { value: 'long', label: 'Long (January, February...)' }
              ]
            },
            locale: {
              type: 'select',
              title: 'Locale',
              description: 'Date formatting locale',
              default: 'fr-CA',
              options: [
                { value: 'fr-CA', label: 'French (Canada)' },
                { value: 'en-US', label: 'English (US)' },
                { value: 'en-GB', label: 'English (UK)' },
                { value: 'es-ES', label: 'Spanish' },
                { value: 'de-DE', label: 'German' }
              ]
            },
            showWeekdays: {
              type: 'boolean',
              title: 'Show Weekday Header',
              description: 'Display weekday names at the top',
              default: true
            },
            monthColors: {
              type: 'boolean',
              title: 'Month Colors',
              description: 'Use 12-color scheme for months',
              default: true
            },
            weekendOpacity: {
              type: 'number',
              title: 'Weekend Opacity',
              description: 'Background opacity for weekend days',
              default: 0.15,
              min: 0,
              max: 1,
              step: 0.05
            },
            markedDateOpacity: {
              type: 'number',
              title: 'Marked Date Opacity',
              description: 'Background opacity for marked dates',
              default: 0.25,
              min: 0,
              max: 1,
              step: 0.05
            },
            dayNumberPosition: {
              type: 'select',
              title: 'Day Number Position',
              description: 'Position of day number in cell',
              default: 'center',
              options: [
                { value: 'center', label: 'Center' },
                { value: 'top-left', label: 'Top Left' }
              ]
            },
            dayHeight: {
              type: 'number',
              title: 'Day Cell Height',
              description: 'Height of day cells in pixels',
              default: 28,
              min: 24,
              max: 80,
              step: 4,
              unit: 'px'
            }
          }
        },
        {
          id: 'behavior',
          title: 'Behavior',
          icon: '⚙️',
          description: 'Interaction and functionality settings',
          properties: {
            weeksToLoad: {
              type: 'number',
              title: 'Initial Weeks',
              description: 'Number of weeks to load initially',
              default: 52,
              min: 4,
              max: 208,
              step: 4,
              unit: 'weeks'
            },
            autoScroll: {
              type: 'boolean',
              title: 'Auto-scroll to Today',
              description: 'Automatically scroll to current week on load',
              default: true
            },
            infiniteScroll: {
              type: 'boolean',
              title: 'Infinite Scroll',
              description: 'Load more weeks when scrolling to edges',
              default: true
            },
            enableRangeSelection: {
              type: 'boolean',
              title: 'Range Selection',
              description: 'Enable date range selection with Shift+Click',
              default: false
            }
          }
        }
      ]
    };
  }

  /**
   * Initialize calendar
   */
  init() {
    if (this.state.isInitialized) return;

    // Create structure
    this.createStructure();

    // Load initial weeks
    this.loadInitialWeeks();

    // Setup scroll listener for infinite scroll
    if (this.options.infiniteScroll) {
      this.scrollContainer.addEventListener('scroll', this.handleScroll);
    }

    // Auto-scroll to current week
    if (this.options.autoScroll) {
      setTimeout(() => this.scrollToToday(), 100);
    }

    this.state.isInitialized = true;
  }

  /**
   * Create DOM structure
   */
  createStructure() {
    this.container.className = 'linear-calendar-container';
    this.container.innerHTML = '';

    // Apply custom styles based on options
    this.container.style.setProperty('--day-height', `${this.options.dayHeight}px`);
    if (this.options.dayNumberPosition === 'top-left') {
      this.container.classList.add('day-number-top-left');
    }

    // Weekdays header (optional)
    if (this.options.showWeekdays) {
      const header = document.createElement('div');
      header.className = 'linear-calendar-weekdays';

      // Weekday names only - no empty cell
      const weekdays = this.getWeekdayNames();
      weekdays.forEach(name => {
        const cell = document.createElement('div');
        cell.className = 'weekday-cell';
        cell.textContent = name;
        header.appendChild(cell);
      });

      this.container.appendChild(header);
    }

    // Scroll container
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'linear-calendar-scroll';
    this.container.appendChild(this.scrollContainer);

    // Weeks container
    this.weeksContainer = document.createElement('div');
    this.weeksContainer.className = 'linear-calendar-weeks';
    this.scrollContainer.appendChild(this.weeksContainer);
  }

  /**
   * Get weekday names based on locale
   */
  getWeekdayNames() {
    const date = new Date(2024, 0, 1); // Start from a Monday
    date.setDate(date.getDate() + (this.options.weekStartDay - date.getDay() + 7) % 7);

    const names = [];
    for (let i = 0; i < 7; i++) {
      names.push(date.toLocaleDateString(this.options.locale, { weekday: 'short' }));
      date.setDate(date.getDate() + 1);
    }
    return names;
  }

  /**
   * Load initial weeks centered on today
   */
  loadInitialWeeks() {
    this.weeksContainer.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentWeekStart = this.getWeekStart(today);

    // Load weeks before and after current week
    const weeksToLoad = this.options.weeksToLoad;
    const weeksBefore = Math.floor(weeksToLoad / 2);
    const weeksAfter = weeksToLoad - weeksBefore;

    const startDate = new Date(currentWeekStart);
    startDate.setDate(startDate.getDate() - (weeksBefore * 7));

    this.state.weeksLoaded.earliest = new Date(startDate);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < weeksToLoad; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      const weekElement = this.generateWeekRow(weekStart);
      fragment.appendChild(weekElement);

      this.state.weeksLoaded.latest = new Date(weekStart);
    }

    this.weeksContainer.appendChild(fragment);
  }

  /**
   * Calculate how many weeks a month spans in the visible area
   */
  calculateMonthWeeks(weekStart, month) {
    let count = 1;
    let currentWeek = new Date(weekStart);

    // Look ahead to count consecutive weeks containing at least 1 day of this month
    for (let i = 0; i < 6; i++) { // Max 6 weeks per month
      currentWeek.setDate(currentWeek.getDate() + 7);

      // Check if this week contains any day from the target month
      let hasMonthDay = false;
      for (let j = 0; j < 7; j++) {
        const dayDate = new Date(currentWeek);
        dayDate.setDate(dayDate.getDate() + j);
        if (dayDate.getMonth() === month) {
          hasMonthDay = true;
          break;
        }
      }

      if (hasMonthDay) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Check if this month is the first or last visible month
   */
  isFirstOrLastMonth(weekStart, month) {
    if (!this.state.loadedWeeks || this.state.loadedWeeks.length === 0) {
      return false;
    }

    // Find all unique months in loaded weeks
    const months = new Set();
    this.state.loadedWeeks.forEach(week => {
      const date = new Date(week);
      months.add(date.getMonth() + date.getFullYear() * 12); // Unique month+year key
    });

    const sortedMonths = Array.from(months).sort((a, b) => a - b);
    const currentMonthKey = month + new Date(weekStart).getFullYear() * 12;

    return currentMonthKey === sortedMonths[0] ||
      currentMonthKey === sortedMonths[sortedMonths.length - 1];
  }

  /**
   * Get week start date based on weekStartDay option
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day - this.options.weekStartDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Generate a single week row
   */
  generateWeekRow(weekStart) {
    const weekDiv = document.createElement('div');
    weekDiv.className = 'calendar-week';
    weekDiv.dataset.weekStart = weekStart.toISOString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentWeekStart = this.getWeekStart(today);

    // Mark current week
    if (weekStart.getTime() === currentWeekStart.getTime()) {
      weekDiv.classList.add('current-week');
      weekDiv.id = 'current-week';
    }

    // Calculate dominant month for the week (for coloring)
    const daysInMonth = {}; // Count days per month in this week
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      const monthKey = dayDate.getMonth();
      daysInMonth[monthKey] = (daysInMonth[monthKey] || 0) + 1;
    }

    // Find month with most days
    let weekMonth = weekStart.getMonth();
    let maxDays = 0;
    for (const [month, count] of Object.entries(daysInMonth)) {
      if (count > maxDays) {
        maxDays = count;
        weekMonth = parseInt(month);
      }
    }

    // Month start marker - first week containing any day of this month
    let hasFirstDayOfMonth = false;
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      if (dayDate.getMonth() === weekMonth && dayDate.getDate() === 1) {
        hasFirstDayOfMonth = true;
        break;
      }
    }

    // Mark as month-start if this is the first week containing this month
    if (hasFirstDayOfMonth) {
      weekDiv.classList.add('month-start');
      weekDiv.dataset.monthStart = weekMonth;
    }

    // Month color class (use dominant month)
    if (this.options.monthColors) {
      weekDiv.classList.add(`month-color-${weekMonth}`);
    }

    // Generate 7 days (pass weekMonth for consistent coloring)
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);

      const dayDiv = this.generateDayCell(dayDate, weekStart, weekMonth);
      weekDiv.appendChild(dayDiv);
    }

    // Add month label on last day of week for month-start weeks (right side)
    // Append AFTER all cells are added to avoid width issues
    if (weekDiv.classList.contains('month-start')) {
      const lastDay = weekDiv.querySelector('.calendar-day:last-child');
      if (lastDay) {
        const monthLabel = document.createElement('div');
        monthLabel.className = 'calendar-month-label';

        // Find the actual first day of the month in this week to get correct year
        let monthDate = null;
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + i);
          if (dayDate.getMonth() === weekMonth && dayDate.getDate() === 1) {
            monthDate = dayDate;
            break;
          }
        }

        if (!monthDate) {
          // Fallback if no day 1 found (shouldn't happen for month-start weeks)
          monthDate = new Date(weekStart);
          monthDate.setMonth(weekMonth);
        }

        const monthNum = monthDate.getMonth(); // 0=Jan, 11=Dec
        const year = monthDate.getFullYear();

        const format = this.options.monthFormat || 'short';
        const monthName = monthDate.toLocaleDateString(this.options.locale, { month: format });

        // December: "Dec 2024" (year suffix)
        // January: "Jan 2025" (year suffix)
        // Other months: just name
        if (monthNum === 11 || monthNum === 0) { // December or January
          monthLabel.textContent = `${monthName} ${year}`;
        } else {
          monthLabel.textContent = monthName;
        }

        lastDay.appendChild(monthLabel);
      }
    }

    return weekDiv;
  }

  /**
   * Generate a single day cell
   */
  generateDayCell(dayDate, weekStart, weekMonth) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.dataset.date = this.formatDate(dayDate);

    const dayMonth = dayDate.getMonth();
    const dayYear = dayDate.getFullYear();
    const dayOfWeek = dayDate.getDay();

    // Month color - use WEEK month, not day month (for consistent coloring)
    if (this.options.monthColors) {
      const monthColorIndex = weekMonth !== undefined ? weekMonth : dayMonth;
      dayDiv.classList.add(`month-color-${monthColorIndex}`);

      // Add day's own month color for border transitions
      // This ensures borders use the correct color even when day is in a different week month
      if (dayMonth !== monthColorIndex) {
        dayDiv.classList.add(`day-month-color-${dayMonth}`);
      }
    }

    // Weekend (based on weekStartDay)
    if (this.isWeekend(dayOfWeek)) {
      dayDiv.classList.add('weekend');
      dayDiv.style.setProperty('--weekend-opacity', this.options.weekendOpacity);
    }

    // Note: We don't add 'other-month' class anymore for visual consistency
    // All days in a week share the same weekMonth color for coherence

    // Month transitions (borders)
    this.addMonthTransitionBorders(dayDiv, dayDate, dayMonth, dayYear);

    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayDate.getTime() === today.getTime()) {
      dayDiv.classList.add('today');
    }

    // Day number
    const dayNumber = document.createElement('span');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = dayDate.getDate();
    dayDiv.appendChild(dayNumber);

    // Events for this date
    const dateStr = this.formatDate(dayDate);
    const events = this.state.events.get(dateStr) || [];

    if (events.length > 0) {
      dayDiv.classList.add('has-events');

      // Set custom opacity if event has it
      const maxOpacity = Math.max(...events.map(e => e.opacity || this.options.markedDateOpacity));
      dayDiv.style.setProperty('--marked-opacity', maxOpacity);

      // Add event indicators based on marker type
      const indicatorsContainer = document.createElement('div');
      indicatorsContainer.className = 'event-indicators';

      events.forEach(event => {
        const eventType = this.eventTypes[event.type] || this.eventTypes.custom;
        const indicator = this.createEventIndicator(event, eventType);
        indicatorsContainer.appendChild(indicator);
      });

      dayDiv.appendChild(indicatorsContainer);
    }

    // Range selection or click handler
    if (this.options.enableRangeSelection) {
      dayDiv.style.cursor = 'pointer';
      dayDiv.addEventListener('mousedown', (e) => this.handleRangeStart(dayDate, e));
      dayDiv.addEventListener('mouseenter', (e) => this.handleRangeMove(dayDate, e));
      dayDiv.addEventListener('mouseup', (e) => this.handleRangeEnd(dayDate, e));
    } else if (this.options.onDayClick) {
      dayDiv.style.cursor = 'pointer';
      dayDiv.addEventListener('click', (e) => {
        this.options.onDayClick(new Date(dayDate), events, e);
      });
    }

    // Legacy marked dates support
    if (this.state.markedDates.has(dateStr) && events.length === 0) {
      dayDiv.classList.add('marked');

      if (this.options.onDayClick) {
        dayDiv.style.cursor = 'pointer';
        dayDiv.addEventListener('click', () => this.handleDayClick(dayDate));
      }
    }

    return dayDiv;
  }

  /**
   * Create event indicator element
   */
  createEventIndicator(event, eventType) {
    const indicator = document.createElement('div');
    const color = event.color || eventType.color;
    const marker = event.marker || eventType.marker;
    const icon = event.icon !== undefined ? event.icon : eventType.icon;
    const showIcon = event.showIcon !== undefined ? event.showIcon : eventType.showIcon;

    switch (marker) {
      case 'badge':
        indicator.className = 'event-badge';
        indicator.style.backgroundColor = color;
        if (showIcon && icon) {
          indicator.textContent = icon;
        }
        indicator.title = event.label || eventType.label;
        break;

      case 'bar':
        indicator.className = 'event-bar';
        indicator.style.backgroundColor = color;
        if (showIcon && icon) {
          indicator.setAttribute('data-icon', icon);
        }
        indicator.title = event.label || eventType.label;
        break;

      case 'dot':
      default:
        indicator.className = 'event-dot';
        indicator.style.backgroundColor = color;
        indicator.title = event.label || eventType.label;
        break;
    }

    // Custom opacity per indicator
    if (event.opacity !== undefined) {
      indicator.style.opacity = event.opacity;
    }

    return indicator;
  }

  /**
   * Add month transition border classes
   */
  addMonthTransitionBorders(dayDiv, dayDate, dayMonth, dayYear) {
    const dayOfMonth = dayDate.getDate();
    const lastDayOfMonth = new Date(dayYear, dayMonth + 1, 0).getDate();

    // First day of month
    if (dayOfMonth === 1) {
      dayDiv.classList.add('month-start-left');
    }

    // Last day of month
    if (dayOfMonth === lastDayOfMonth) {
      dayDiv.classList.add('month-end-right');
    }

    // Top border (first 7 days)
    if (dayOfMonth <= 7) {
      dayDiv.classList.add('month-start-top');
    }

    // Bottom border (last 7 days)
    if (dayOfMonth > lastDayOfMonth - 7) {
      dayDiv.classList.add('month-end-bottom');
    }
  }

  /**
   * Handle scroll for infinite loading
   */
  handleScroll() {
    if (!this.options.infiniteScroll || this.state.isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer;

    // Load more weeks at top
    if (scrollTop < 200) {
      this.loadMoreWeeks('past');
    }

    // Load more weeks at bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
      this.loadMoreWeeks('future');
    }
  }

  /**
   * Load more weeks in a direction
   */
  async loadMoreWeeks(direction) {
    if (this.state.isLoading) return;

    this.state.isLoading = true;
    const weeksToAdd = 4;

    if (direction === 'past') {
      const startDate = new Date(this.state.weeksLoaded.earliest);
      const fragment = document.createDocumentFragment();

      for (let i = weeksToAdd; i > 0; i--) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() - (i * 7));

        const weekElement = this.generateWeekRow(weekStart);
        fragment.appendChild(weekElement);

        if (i === weeksToAdd) {
          this.state.weeksLoaded.earliest = new Date(weekStart);
        }
      }

      this.weeksContainer.insertBefore(fragment, this.weeksContainer.firstChild);
    } else {
      const startDate = new Date(this.state.weeksLoaded.latest);
      const fragment = document.createDocumentFragment();

      for (let i = 1; i <= weeksToAdd; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (i * 7));

        const weekElement = this.generateWeekRow(weekStart);
        fragment.appendChild(weekElement);

        if (i === weeksToAdd) {
          this.state.weeksLoaded.latest = new Date(weekStart);
        }
      }

      this.weeksContainer.appendChild(fragment);
    }

    // Callback
    if (this.options.onWeekLoad) {
      this.options.onWeekLoad(direction,
        direction === 'past' ? this.state.weeksLoaded.earliest : this.state.weeksLoaded.latest
      );
    }

    this.state.isLoading = false;
  }

  /**     * Load weeks around a specific date
   */
  loadWeeksAround(targetDate) {
    // Load 8 weeks before and 8 weeks after
    const weeksToLoad = 16;
    const fragment = document.createDocumentFragment();

    // Start 8 weeks before target
    const startWeek = this.getWeekStart(targetDate);
    startWeek.setDate(startWeek.getDate() - (8 * 7));

    for (let i = 0; i < weeksToLoad; i++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      const weekElement = this.generateWeekRow(weekStart);
      fragment.appendChild(weekElement);

      // Update loaded range
      if (i === 0) {
        this.state.weeksLoaded.earliest = new Date(weekStart);
      }
      if (i === weeksToLoad - 1) {
        this.state.weeksLoaded.latest = new Date(weekStart);
      }
    }

    // Clear and append
    this.weeksContainer.innerHTML = '';
    this.weeksContainer.appendChild(fragment);
  }

  /**     * Handle day click
   */
  handleDayClick(date) {
    if (this.options.onDayClick) {
      this.options.onDayClick(new Date(date));
    }
  }

  /**
   * Scroll to today's week
   */
  scrollToToday() {
    const currentWeek = this.container.querySelector('#current-week');
    if (currentWeek && this.scrollContainer) {
      const offsetTop = currentWeek.offsetTop - this.scrollContainer.offsetTop;
      this.scrollContainer.scrollTop = offsetTop - 10;
    }
  }

  /**
   * Scroll to specific date
   */
  scrollToDate(date) {
    // Convert string to Date if needed
    let targetDate = date;
    if (typeof date === 'string') {
      // Handle YYYY-MM-DD format
      targetDate = new Date(date + 'T12:00:00');
    } else if (!(date instanceof Date)) {
      console.error('scrollToDate: Invalid date parameter', date);
      return;
    }

    const dateStr = this.formatDate(targetDate);
    let dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);

    // If cell not found, we may need to load more weeks
    if (!dayCell) {
      // Load weeks around target date
      const targetWeek = this.getWeekStart(targetDate);
      this.loadWeeksAround(targetWeek);
      // Try to find cell again
      dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);
    }

    if (dayCell) {
      const weekRow = dayCell.closest('.calendar-week');
      if (weekRow && this.scrollContainer) {
        const offsetTop = weekRow.offsetTop - this.scrollContainer.offsetTop;
        this.scrollContainer.scrollTop = offsetTop - 100;
      }
    } else {
      console.warn('scrollToDate: Could not find or load date', dateStr);
    }
  }

  /**
   * Mark dates (add to marked set and update DOM)
   */
  markDates(dates) {
    dates.forEach(dateStr => {
      this.state.markedDates.add(dateStr);

      // Update existing DOM element if visible
      const dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);
      if (dayCell && !dayCell.classList.contains('marked')) {
        dayCell.classList.add('marked');
        if (this.options.onDayClick) {
          dayCell.style.cursor = 'pointer';
          dayCell.addEventListener('click', () => {
            const date = new Date(dateStr);
            this.handleDayClick(date);
          });
        }
      }
    });
  }

  /**
   * Unmark dates
   */
  unmarkDates(dates) {
    dates.forEach(dateStr => {
      this.state.markedDates.delete(dateStr);

      const dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);
      if (dayCell) {
        dayCell.classList.remove('marked');
        dayCell.style.cursor = 'default';
      }
    });
  }

  /**
   * Clear all marked dates
   */
  clearMarkedDates() {
    this.state.markedDates.clear();
    this.container.querySelectorAll('.calendar-day.marked').forEach(el => {
      el.classList.remove('marked');
      el.style.cursor = 'default';
    });
  }

  /**
   * Check if a day is weekend based on weekStartDay
   * Weekend is defined as the last 2 days of the week
   * @param {number} dayOfWeek - Day of week (0-6, 0=Sunday)
   * @returns {boolean}
   */
  isWeekend(dayOfWeek) {
    const weekStart = this.options.weekStartDay;

    // Calculate the last 2 days of the week
    const lastDay = (weekStart + 6) % 7;
    const secondLastDay = (weekStart + 5) % 7;

    return dayOfWeek === lastDay || dayOfWeek === secondLastDay;
  }

  /**
   * Get all marked dates
   */
  getMarkedDates() {
    return Array.from(this.state.markedDates);
  }

  /**
   * Add event to a specific date
   * @param {string|Date} date - Date in YYYY-MM-DD format or Date object
   * @param {string} type - Event type (holiday, vacation, note, appointment, etc.)
   * @param {Object} options - Additional options { color, label, data, icon, showIcon, marker, opacity }
   */
  addEvent(date, type, options = {}) {
    const dateStr = typeof date === 'string' ? date : this.formatDate(date);

    if (!this.state.events.has(dateStr)) {
      this.state.events.set(dateStr, []);
    }

    const event = {
      type: type,
      color: options.color,
      label: options.label,
      data: options.data,
      icon: options.icon,
      showIcon: options.showIcon,
      marker: options.marker,
      opacity: options.opacity
    };

    this.state.events.get(dateStr).push(event);

    // Update DOM if visible
    this.updateDayCell(dateStr);
  }

  /**
   * Add multiple events
   * @param {Array} events - Array of {date, type, color?, label?}
   */
  addEvents(events) {
    events.forEach(event => {
      this.addEvent(event.date, event.type, {
        color: event.color,
        label: event.label,
        data: event.data
      });
    });
  }

  /**
   * Remove event from a date
   * @param {string|Date} date
   * @param {string} type - Optional, remove specific type only
   */
  removeEvent(date, type = null) {
    const dateStr = typeof date === 'string' ? date : this.formatDate(date);

    if (!this.state.events.has(dateStr)) return;

    if (type) {
      const events = this.state.events.get(dateStr);
      const filtered = events.filter(e => e.type !== type);

      if (filtered.length === 0) {
        this.state.events.delete(dateStr);
      } else {
        this.state.events.set(dateStr, filtered);
      }
    } else {
      this.state.events.delete(dateStr);
    }

    this.updateDayCell(dateStr);
  }

  /**
   * Get events for a specific date
   * @param {string|Date} date
   * @returns {Array} Array of events
   */
  getEvents(date) {
    const dateStr = typeof date === 'string' ? date : this.formatDate(date);
    return this.state.events.get(dateStr) || [];
  }

  /**
   * Get all events
   * @returns {Map} Map of date -> events[]
   */
  getAllEvents() {
    return new Map(this.state.events);
  }

  /**
   * Clear all events
   */
  clearAllEvents() {
    this.state.events.clear();
    this.refresh();
  }

  /**
   * Update a single day cell in DOM
   */
  updateDayCell(dateStr) {
    const dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);
    if (dayCell) {
      // Find parent week to get week start date
      const weekRow = dayCell.closest('.calendar-week');
      if (weekRow) {
        const weekStart = new Date(weekRow.dataset.weekStart);
        const date = new Date(dateStr);
        const newCell = this.generateDayCell(date, weekStart);
        dayCell.replaceWith(newCell);
      }
    }
  }

  /**
   * Set weekend opacity
   * @param {number} opacity - Value between 0 and 1
   */
  setWeekendOpacity(opacity) {
    this.options.weekendOpacity = Math.max(0, Math.min(1, opacity));
    this.container.querySelectorAll('.calendar-day.weekend').forEach(el => {
      el.style.setProperty('--weekend-opacity', this.options.weekendOpacity);
    });
  }

  /**
   * Set marked date opacity
   * @param {number} opacity - Value between 0 and 1
   */
  setMarkedDateOpacity(opacity) {
    this.options.markedDateOpacity = Math.max(0, Math.min(1, opacity));
    this.container.querySelectorAll('.calendar-day.has-events').forEach(el => {
      el.style.setProperty('--marked-opacity', this.options.markedDateOpacity);
    });
  }

  /**
   * Handle range selection start
   */
  handleRangeStart(date, event) {
    if (!this.options.enableRangeSelection) return;

    this.state.rangeSelection.isSelecting = true;
    this.state.rangeSelection.startDate = new Date(date);
    this.state.rangeSelection.currentDate = new Date(date);

    // Clear previous selection visual
    this.clearRangeSelectionVisual();

    // Add selecting class
    const dateStr = this.formatDate(date);
    const dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);
    if (dayCell) {
      dayCell.classList.add('range-selecting');
    }

    event.preventDefault();
  }

  /**
   * Handle range selection move
   */
  handleRangeMove(date, event) {
    if (!this.state.rangeSelection.isSelecting) return;

    this.state.rangeSelection.currentDate = new Date(date);
    this.updateRangeSelectionVisual();
  }

  /**
   * Handle range selection end
   */
  handleRangeEnd(date, event) {
    if (!this.state.rangeSelection.isSelecting) return;

    const startDate = new Date(this.state.rangeSelection.startDate);
    const endDate = new Date(date);

    // Ensure start is before end
    const [start, end] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

    // Clear visual
    this.clearRangeSelectionVisual();

    // Reset state
    this.state.rangeSelection.isSelecting = false;
    this.state.rangeSelection.startDate = null;
    this.state.rangeSelection.currentDate = null;

    // Call callback
    if (this.options.onRangeSelect) {
      this.options.onRangeSelect(start, end);
    }

    event.preventDefault();
  }

  /**
   * Update range selection visual
   */
  updateRangeSelectionVisual() {
    this.clearRangeSelectionVisual();

    const start = new Date(this.state.rangeSelection.startDate);
    const current = new Date(this.state.rangeSelection.currentDate);

    const [begin, finish] = start <= current ? [start, current] : [current, start];

    const dates = this.getDateRange(begin, finish);
    dates.forEach(date => {
      const dateStr = this.formatDate(date);
      const dayCell = this.container.querySelector(`[data-date="${dateStr}"]`);
      if (dayCell) {
        dayCell.classList.add('range-selecting');
      }
    });
  }

  /**
   * Clear range selection visual
   */
  clearRangeSelectionVisual() {
    this.container.querySelectorAll('.range-selecting').forEach(el => {
      el.classList.remove('range-selecting');
    });
  }

  /**
   * Get array of dates between start and end (inclusive)
   */
  getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Add event to date range
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @param {string} type
   * @param {Object} options
   */
  addEventToRange(startDate, endDate, type, options = {}) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const dates = this.getDateRange(start, end);
    dates.forEach(date => {
      this.addEvent(date, type, options);
    });
  }

  /**
   * Enable range selection mode
   */
  enableRangeSelection() {
    this.options.enableRangeSelection = true;
    this.container.querySelectorAll('.calendar-day').forEach(el => {
      el.style.cursor = 'pointer';
    });
  }

  /**
   * Disable range selection mode
   */
  disableRangeSelection() {
    this.options.enableRangeSelection = false;
    this.clearRangeSelectionVisual();
    this.state.rangeSelection.isSelecting = false;
  }

  /**
   * Customize event type appearance
   * @param {string} type - Event type name
   * @param {Object} config - { color, icon, label, marker, showIcon }
   */
  customizeEventType(type, config = {}) {
    if (!this.eventTypes[type]) {
      this.eventTypes[type] = {};
    }

    Object.assign(this.eventTypes[type], config);

    // Refresh to apply changes
    this.refresh();
  }

  /**
   * Get all marked dates
   */
  getMarkedDates() {
    return Array.from(this.state.markedDates);
  }

  /**
   * Refresh calendar (re-render all weeks)
   */
  refresh() {
    if (!this._initialized) return;

    // Save current state
    const earliestDate = this.state.weeksLoaded.earliest ? new Date(this.state.weeksLoaded.earliest) : null;
    const latestDate = this.state.weeksLoaded.latest ? new Date(this.state.weeksLoaded.latest) : null;
    const currentScroll = this.scrollContainer ? this.scrollContainer.scrollTop : 0;

    // Recreate entire structure (header + weeks)
    this.createStructure();

    // Reload weeks if we had any
    if (earliestDate && latestDate) {
      this.weeksContainer.innerHTML = '';

      let currentDate = new Date(earliestDate);
      const fragment = document.createDocumentFragment();

      while (currentDate <= latestDate) {
        const weekElement = this.generateWeekRow(currentDate);
        fragment.appendChild(weekElement);
        currentDate.setDate(currentDate.getDate() + 7);
      }

      this.weeksContainer.appendChild(fragment);

      // Restore scroll position
      if (this.scrollContainer && currentScroll > 0) {
        this.scrollContainer.scrollTop = currentScroll;
      }
    } else {
      // No weeks loaded yet, load initial weeks
      this.loadInitialWeeks();
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Destroy calendar and cleanup
   */
  destroy() {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.state.isInitialized = false;
  }
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinearCalendar;
} else if (typeof define === 'function' && define.amd) {
  define([], () => LinearCalendar);
} else if (typeof window !== 'undefined') {
  window.LinearCalendar = LinearCalendar;
}
