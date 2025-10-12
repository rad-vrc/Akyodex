# Akyoずかん Test Suite

## Overview
This test suite validates the chatbot widget positioning changes in `index.html`.

## Changes Tested
The following CSS properties were added to `#dify-chatbot-bubble-window`:
- `position: fixed !important;` - Fixes the chatbot to the viewport
- `inset: auto 1rem 1rem auto;` - Positions it in the bottom-right corner with 1rem spacing

## Test Categories

### 1. HTML Structure Tests (`index.html.test.js`)
- **Chatbot Integration**: Validates that the Dify chatbot embed script is present
- **CSS Rules Validation**: Ensures all CSS properties are correctly defined
- **Positioning Logic**: Verifies the new `position: fixed` and `inset` properties
- **Selector Specificity**: Validates ID selectors and !important usage
- **Syntax Validation**: Checks for valid CSS syntax and proper formatting
- **Responsive Design**: Ensures dimensions work on mobile devices

### 2. Visual Tests (`chatbot-positioning.spec.js`)
- **Fixed Positioning**: Validates that the chatbot has `position: fixed` in computed styles
- **Bottom-Right Placement**: Ensures the chatbot is positioned correctly
- **Dimension Validation**: Verifies width (24rem) and height (40rem)
- **Viewport Responsiveness**: Tests behavior across different screen sizes
- **Layout Integrity**: Ensures chatbot doesn't interfere with page layout

## Running Tests

### Install Dependencies
```bash
npm install
npm run install:playwright
```

### Run All Tests
```bash
npm test              # Run Node.js tests
npm run test:visual   # Run Playwright visual tests
```

### Watch Mode
```bash
npm run test:watch
```

## Test Coverage

### Happy Path Scenarios ✅
- Chatbot styles are present and correctly formatted
- Fixed positioning is applied
- Inset values position the chatbot in bottom-right corner
- All !important flags are present for style override
- Dimensions are mobile-friendly

### Edge Cases ✅
- Multiple viewport sizes (desktop, tablet, mobile)
- CSS specificity with ID selectors and !important
- No conflicting position or inset properties
- Proper use of shorthand inset property vs individual properties
- Style tag placement and closing

### Failure Conditions ✅
- Invalid CSS syntax detection
- Missing required properties
- Incorrect inset value format
- Mispositioned style tags
- Browser compatibility checks

## Key Test Insights

### Why These Tests Matter
1. **Fixed Positioning**: Ensures the chatbot stays visible while scrolling
2. **Inset Shorthand**: Modern CSS property that's more concise than top/right/bottom/left
3. **!important Usage**: Necessary to override chatbot library's default styles
4. **Bottom-Right Placement**: Standard UX pattern for chat widgets
5. **Responsive Spacing**: 1rem provides consistent spacing across devices

### CSS Property Breakdown
```css
position: fixed !important;
/* Fixes element to viewport, not document */

inset: auto 1rem 1rem auto;
/* Equivalent to:
   top: auto;    (don't set top)
   right: 1rem;  (16px from right)
   bottom: 1rem; (16px from bottom)
   left: auto;   (don't set left)
   Result: Anchored to bottom-right corner */
```

## Maintenance Notes
- Tests are framework-agnostic and use Node.js built-in test runner
- Playwright tests may skip if chatbot doesn't load (external dependency)
- Tests validate both static HTML and computed runtime styles
- All tests follow AAA pattern (Arrange, Act, Assert)