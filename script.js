/**
 * Modern Responsive Calculator Web Application
 * Features:
 *  - Core arithmetic engine (+, -, ×, ÷, %)
 *  - Decimal and backspace handling with floating-point precision correction
 *  - Division by zero error protection
 *  - Dual themes (Dark/Light mode) with persistent localStorage
 *  - Calculation history drawer with recall and clear functionality
 *  - Full keyboard shortcuts support with tactile visual feedback
 */

// ==========================================================================
// 1. Calculator Core Class
// ==========================================================================
class Calculator {
  /**
   * @param {HTMLElement} previousOperandTextElement
   * @param {HTMLElement} currentOperandTextElement
   * @param {Function} onCalculationComplete - Callback fired when an equation evaluates
   */
  constructor(previousOperandTextElement, currentOperandTextElement, onCalculationComplete) {
    this.previousOperandTextElement = previousOperandTextElement;
    this.currentOperandTextElement = currentOperandTextElement;
    this.onCalculationComplete = onCalculationComplete;
    this.clear();
  }

  /**
   * Resets calculator to default initial state.
   */
  clear() {
    this.currentOperand = '0';
    this.previousOperand = '';
    this.operation = undefined;
    this.waitingForOperand = false;
    this.shouldResetScreen = false;
    this.hasError = false;
  }

  /**
   * Deletes the last digit from the current input.
   */
  delete() {
    // If screen is in an error state or calculation just finished, reset to 0
    if (this.hasError || this.shouldResetScreen) {
      this.clear();
      return;
    }

    // If waiting for the second operand, ignore delete
    if (this.waitingForOperand) return;

    // If current input is single character or already 0, reset to '0'
    if (this.currentOperand.length === 1 || this.currentOperand === '0') {
      this.currentOperand = '0';
      return;
    }

    // Remove the trailing character
    this.currentOperand = this.currentOperand.slice(0, -1);

    // If only a negative sign remains, reset to '0'
    if (this.currentOperand === '-' || this.currentOperand === '') {
      this.currentOperand = '0';
    }
  }

  /**
   * Appends a digit or decimal point to the current operand.
   * @param {string} number
   */
  appendNumber(number) {
    // If an error occurred or result was just computed, start a fresh entry
    if (this.hasError || this.shouldResetScreen) {
      this.currentOperand = '';
      this.previousOperand = '';
      this.operation = undefined;
      this.shouldResetScreen = false;
      this.hasError = false;
    }

    // If waiting for next operand after selecting an operator
    if (this.waitingForOperand) {
      this.currentOperand = number === '.' ? '0.' : number;
      this.waitingForOperand = false;
      return;
    }

    // Prevent multiple decimal points in a single operand
    if (number === '.' && this.currentOperand.includes('.')) return;

    // Prevent redundant leading zeroes
    if (this.currentOperand === '0' && number !== '.') {
      this.currentOperand = number;
      return;
    }

    // If starting with decimal point on empty display
    if (this.currentOperand === '' && number === '.') {
      this.currentOperand = '0.';
      return;
    }

    // Limit length to 15 digits to maintain display aesthetic
    const rawDigits = this.currentOperand.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 15) return;

    this.currentOperand = this.currentOperand.toString() + number.toString();
  }

  /**
   * Chooses the arithmetic operator (+, -, ×, ÷).
   * @param {string} operation
   */
  chooseOperation(operation) {
    if (this.hasError) return;

    // Normalize operator display symbols
    if (operation === '*') operation = '×';
    if (operation === '/') operation = '÷';

    // If user changes their mind and clicks another operator immediately
    if (this.waitingForOperand) {
      this.operation = operation;
      return;
    }

    // If an operation is already pending, compute it first
    if (this.operation && this.previousOperand !== '') {
      this.compute(false);
      if (this.hasError) return;
    }

    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.waitingForOperand = true;
    this.shouldResetScreen = false;
  }

  /**
   * Resolves floating point quirks in JavaScript (e.g. 0.1 + 0.2 = 0.30000000000000004).
   * @param {number} num
   * @returns {number}
   */
  cleanPrecision(num) {
    if (!isFinite(num)) return num;
    return parseFloat(num.toPrecision(12));
  }

  /**
   * Handles percentage calculation:
   * - In compound expressions (e.g. 100 + 10% -> 10% of 100 = 10 -> 100 + 10)
   * - Standalone (e.g. 50% -> 0.5)
   */
  percentage() {
    if (this.hasError || this.currentOperand === '') return;

    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    let result;
    if (this.previousOperand !== '' && (this.operation === '+' || this.operation === '-')) {
      const prev = parseFloat(this.previousOperand);
      result = (prev * current) / 100;
    } else {
      result = current / 100;
    }

    this.currentOperand = this.cleanPrecision(result).toString();
    this.waitingForOperand = false;
    this.shouldResetScreen = false;
  }

  /**
   * Computes the mathematical result of the pending calculation.
   * @param {boolean} recordHistory - Whether to save this calculation in history
   */
  compute(recordHistory = true) {
    if (this.hasError) return;
    if (!this.operation || this.previousOperand === '') return;

    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);

    if (isNaN(prev) || isNaN(current)) return;

    let computation;
    switch (this.operation) {
      case '+':
        computation = prev + current;
        break;
      case '-':
        computation = prev - current;
        break;
      case '×':
      case '*':
        computation = prev * current;
        break;
      case '÷':
      case '/':
        // Protect against division by zero
        if (current === 0) {
          this.currentOperand = 'Cannot divide by 0';
          this.previousOperand = '';
          this.operation = undefined;
          this.hasError = true;
          this.waitingForOperand = false;
          this.shouldResetScreen = true;
          return;
        }
        computation = prev / current;
        break;
      default:
        return;
    }

    computation = this.cleanPrecision(computation);

    // Save to history before clearing previous operand
    if (recordHistory && typeof this.onCalculationComplete === 'function') {
      const formattedPrev = this.formatDisplayNumber(this.previousOperand);
      const formattedCurr = this.formatDisplayNumber(this.currentOperand);
      const formattedResult = this.formatDisplayNumber(computation);
      this.onCalculationComplete({
        expression: `${formattedPrev} ${this.operation} ${formattedCurr}`,
        result: formattedResult,
        rawValue: computation.toString()
      });
    }

    this.currentOperand = computation.toString();
    this.previousOperand = '';
    this.operation = undefined;
    this.waitingForOperand = false;
    this.shouldResetScreen = true;
  }

  /**
   * Sets the current operand directly (e.g. when recalling from history).
   * @param {string} value
   */
  setOperand(value) {
    this.currentOperand = value;
    this.previousOperand = '';
    this.operation = undefined;
    this.waitingForOperand = false;
    this.shouldResetScreen = true;
    this.hasError = false;
  }

  /**
   * Formats numbers with commas (e.g. 1,000,000) while keeping active decimal typing intact.
   * @param {string|number} number
   * @returns {string}
   */
  formatDisplayNumber(number) {
    if (this.hasError) return number.toString();
    const stringNumber = number.toString();
    if (stringNumber === '') return '';

    // Handle exponential scientific notation
    if (stringNumber.includes('e')) return stringNumber;

    const isNegative = stringNumber.startsWith('-');
    const cleanNumber = isNegative ? stringNumber.slice(1) : stringNumber;

    const parts = cleanNumber.split('.');
    const integerDigits = parseFloat(parts[0]);
    const decimalDigits = parts[1];

    let integerDisplay = '';
    if (isNaN(integerDigits)) {
      integerDisplay = '0';
    } else {
      integerDisplay = integerDigits.toLocaleString('en-US', {
        maximumFractionDigits: 0
      });
    }

    const sign = isNegative ? '-' : '';
    if (decimalDigits != null) {
      return `${sign}${integerDisplay}.${decimalDigits}`;
    } else {
      return `${sign}${integerDisplay}`;
    }
  }

  /**
   * Updates the DOM screen elements with the current values.
   */
  updateDisplay() {
    if (this.hasError) {
      this.currentOperandTextElement.textContent = this.currentOperand;
      this.currentOperandTextElement.classList.add('error');
      this.previousOperandTextElement.textContent = '';
      return;
    }

    this.currentOperandTextElement.classList.remove('error');
    this.currentOperandTextElement.textContent = this.formatDisplayNumber(this.currentOperand);

    if (this.operation != null && this.previousOperand !== '') {
      this.previousOperandTextElement.textContent = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation}`;
    } else {
      this.previousOperandTextElement.textContent = '';
    }
  }
}

// ==========================================================================
// 2. Calculation History Manager
// ==========================================================================
class HistoryManager {
  constructor(listElement, onSelectHistoryItem) {
    this.listElement = listElement;
    this.onSelectHistoryItem = onSelectHistoryItem;
    this.storageKey = 'modern_calculator_history';
    this.history = this.loadHistory();
    this.render();
  }

  /**
   * Loads saved calculation history from localStorage.
   * @returns {Array}
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Could not load history from localStorage:', e);
      return [];
    }
  }

  /**
   * Persists history to localStorage.
   */
  saveHistory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (e) {
      console.warn('Could not save history to localStorage:', e);
    }
  }

  /**
   * Adds a new item to history and updates UI.
   * @param {Object} entry { expression, result, rawValue }
   */
  addEntry(entry) {
    // Add to start of array, keep max 30 items
    this.history.unshift(entry);
    if (this.history.length > 30) {
      this.history.pop();
    }
    this.saveHistory();
    this.render();
  }

  /**
   * Clears all history entries.
   */
  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.render();
  }

  /**
   * Renders the history list into the DOM.
   */
  render() {
    this.listElement.innerHTML = '';

    if (this.history.length === 0) {
      this.listElement.innerHTML = `
        <div class="history-empty">
          <svg class="history-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 10"></polyline>
          </svg>
          <p>No calculations yet</p>
        </div>
      `;
      return;
    }

    this.history.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      itemEl.setAttribute('role', 'button');
      itemEl.setAttribute('tabindex', '0');
      itemEl.setAttribute('aria-label', `Use result ${item.result} from ${item.expression}`);

      itemEl.innerHTML = `
        <span class="history-item-equation">${item.expression} =</span>
        <span class="history-item-result">${item.result}</span>
        <span class="history-item-hint">Tap to reuse</span>
      `;

      // Click or Enter to recall this calculation
      const recallHandler = () => {
        if (typeof this.onSelectHistoryItem === 'function') {
          this.onSelectHistoryItem(item.rawValue || item.result);
        }
      };

      itemEl.addEventListener('click', recallHandler);
      itemEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          recallHandler();
        }
      });

      this.listElement.appendChild(itemEl);
    });
  }
}

// ==========================================================================
// 3. Theme Manager (Dark & Light Mode)
// ==========================================================================
class ThemeManager {
  constructor(toggleButton) {
    this.toggleButton = toggleButton;
    this.storageKey = 'modern_calculator_theme';
    this.currentTheme = this.getInitialTheme();
    this.applyTheme(this.currentTheme);
    this.bindEvents();
  }

  /**
   * Determines initial theme from localStorage or OS preference.
   * @returns {string} 'dark' | 'light'
   */
  getInitialTheme() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'light' || saved === 'dark') return saved;

    // Fallback to system color scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  /**
   * Applies the theme to the document and updates button ARIA labels.
   * @param {string} theme 'dark' | 'light'
   */
  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }

    if (this.toggleButton) {
      const isDark = theme === 'dark';
      this.toggleButton.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      this.toggleButton.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  /**
   * Toggles between dark and light themes.
   */
  toggle() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  bindEvents() {
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => this.toggle());
    }

    // Listen for system theme changes if user has no stored preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.storageKey)) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
}

// ==========================================================================
// 4. Main Application Initialization & Event Wiring
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const previousOperandTextElement = document.getElementById('previousOperand');
  const currentOperandTextElement = document.getElementById('currentOperand');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyBackdrop = document.getElementById('historyBackdrop');
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyListElement = document.getElementById('historyList');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // Helper: Open / Close History Drawer
  const openHistory = () => {
    historyDrawer.classList.add('is-open');
    historyDrawer.setAttribute('aria-hidden', 'false');
    if (historyBackdrop) historyBackdrop.classList.add('is-open');
  };

  const closeHistory = () => {
    historyDrawer.classList.remove('is-open');
    historyDrawer.setAttribute('aria-hidden', 'true');
    if (historyBackdrop) historyBackdrop.classList.remove('is-open');
  };

  const toggleHistory = () => {
    const isOpen = historyDrawer.classList.contains('is-open');
    if (isOpen) {
      closeHistory();
    } else {
      openHistory();
    }
  };

  // Helper: Tactile button press feedback
  const triggerButtonAnimation = (button) => {
    if (!button) return;
    button.classList.add('btn-active');
    setTimeout(() => {
      button.classList.remove('btn-active');
    }, 120);
  };

  // 1. Initialize History Manager
  const historyManager = new HistoryManager(historyListElement, (recalledValue) => {
    calculator.setOperand(recalledValue);
    calculator.updateDisplay();
    closeHistory();
  });

  // 2. Initialize Calculator Core
  const calculator = new Calculator(
    previousOperandTextElement,
    currentOperandTextElement,
    (calculationData) => {
      historyManager.addEntry(calculationData);
    }
  );

  // 3. Initialize Theme Manager
  new ThemeManager(themeToggleBtn);

  // History Drawer Button Listeners
  if (historyToggleBtn) historyToggleBtn.addEventListener('click', toggleHistory);
  if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistory);
  if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistory);
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      historyManager.clearHistory();
    });
  }

  // Keypad Button Listeners
  // 1. Number buttons (0–9)
  const numberButtons = document.querySelectorAll('[data-number]');
  numberButtons.forEach((button) => {
    button.addEventListener('click', () => {
      calculator.appendNumber(button.dataset.number);
      calculator.updateDisplay();
    });
  });

  // 2. Decimal point (.)
  const decimalButton = document.querySelector('[data-action="decimal"]');
  if (decimalButton) {
    decimalButton.addEventListener('click', () => {
      calculator.appendNumber('.');
      calculator.updateDisplay();
    });
  }

  // 3. Operator buttons (+, -, ×, ÷)
  const operatorButtons = document.querySelectorAll('[data-action="operator"]');
  operatorButtons.forEach((button) => {
    button.addEventListener('click', () => {
      calculator.chooseOperation(button.dataset.operator);
      calculator.updateDisplay();
    });
  });

  // 4. Equals button (=)
  const equalsButton = document.querySelector('[data-action="calculate"]');
  if (equalsButton) {
    equalsButton.addEventListener('click', () => {
      calculator.compute(true);
      calculator.updateDisplay();
    });
  }

  // 5. Clear button (AC)
  const clearButton = document.querySelector('[data-action="clear"]');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      calculator.clear();
      calculator.updateDisplay();
    });
  }

  // 6. Delete button (DEL)
  const deleteButton = document.querySelector('[data-action="delete"]');
  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      calculator.delete();
      calculator.updateDisplay();
    });
  }

  // 7. Percentage button (%)
  const percentButton = document.querySelector('[data-action="percent"]');
  if (percentButton) {
    percentButton.addEventListener('click', () => {
      calculator.percentage();
      calculator.updateDisplay();
    });
  }

  // ==========================================================================
  // 5. Global Keyboard Support
  // ==========================================================================
  window.addEventListener('keydown', (event) => {
    const key = event.key;
    let targetButton = null;

    // If History drawer is open and user presses Escape, close the drawer first
    if (key === 'Escape' && historyDrawer.classList.contains('is-open')) {
      closeHistory();
      return;
    }

    // Toggle history drawer using 'h' or 'H'
    if (key === 'h' || key === 'H') {
      toggleHistory();
      return;
    }

    // Digits 0 to 9
    if (/^[0-9]$/.test(key)) {
      targetButton = document.querySelector(`[data-number="${key}"]`);
      calculator.appendNumber(key);
      calculator.updateDisplay();
    }
    // Decimal point
    else if (key === '.' || key === ',') {
      targetButton = document.querySelector('[data-action="decimal"]');
      calculator.appendNumber('.');
      calculator.updateDisplay();
    }
    // Addition (+)
    else if (key === '+') {
      targetButton = document.querySelector('[data-operator="+"]');
      calculator.chooseOperation('+');
      calculator.updateDisplay();
    }
    // Subtraction (-)
    else if (key === '-') {
      targetButton = document.querySelector('[data-operator="-"]');
      calculator.chooseOperation('-');
      calculator.updateDisplay();
    }
    // Multiplication (* or x)
    else if (key === '*' || key === 'x' || key === 'X') {
      targetButton = document.querySelector('[data-operator="×"]');
      calculator.chooseOperation('×');
      calculator.updateDisplay();
    }
    // Division (/)
    else if (key === '/') {
      event.preventDefault(); // Prevent browser quick-find shortcut
      targetButton = document.querySelector('[data-operator="÷"]');
      calculator.chooseOperation('÷');
      calculator.updateDisplay();
    }
    // Percentage (%)
    else if (key === '%') {
      targetButton = document.querySelector('[data-action="percent"]');
      calculator.percentage();
      calculator.updateDisplay();
    }
    // Equals / Calculate (Enter or =)
    else if (key === 'Enter' || key === '=') {
      event.preventDefault(); // Prevent accidental button focus submission
      targetButton = document.querySelector('[data-action="calculate"]');
      calculator.compute(true);
      calculator.updateDisplay();
    }
    // Delete (Backspace)
    else if (key === 'Backspace') {
      targetButton = document.querySelector('[data-action="delete"]');
      calculator.delete();
      calculator.updateDisplay();
    }
    // All Clear (Escape or c / C)
    else if (key === 'Escape' || key.toLowerCase() === 'c') {
      targetButton = document.querySelector('[data-action="clear"]');
      calculator.clear();
      calculator.updateDisplay();
    }

    // Trigger visual button animation for keyboard interactions
    if (targetButton) {
      triggerButtonAnimation(targetButton);
    }
  });

  // Initial display render
  calculator.updateDisplay();
});
