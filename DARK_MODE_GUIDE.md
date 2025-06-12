# 🌙 Dark Mode Implementation Guide

## Overview

ReallyGoodJob now features a beautiful, comprehensive dark mode implementation that provides users with a comfortable viewing experience in low-light environments. The dark mode system is built with modern web standards, accessibility in mind, and seamless user experience.

## ✨ Features

- **Automatic System Detection**: Respects user's system preference (prefers-color-scheme)
- **Manual Toggle**: Users can manually switch between light and dark modes
- **Persistent Preference**: User's choice is saved in localStorage
- **Smooth Transitions**: All theme changes include smooth CSS transitions
- **Accessibility**: Full keyboard navigation and screen reader support
- **Comprehensive Coverage**: All components, forms, modals, and UI elements support both themes

## 🏗️ Architecture

### File Structure

```
src/styles/
├── _variables.scss     # Color tokens and design system variables
├── _mixins.scss       # Theme-aware mixins and utilities
├── _components.scss   # Component-specific dark mode styles
└── main.scss         # Main stylesheet importing all partials

public/js/
└── theme.js          # JavaScript theme management system
```

### Color System

#### Light Mode Colors
- **Primary**: `#4f46e5` (Indigo)
- **Background**: `#ffffff` (White)
- **Secondary Background**: `#f9fafb` (Gray 50)
- **Text Primary**: `#1f2937` (Gray 800)
- **Text Secondary**: `#6b7280` (Gray 500)
- **Borders**: `#e5e7eb` (Gray 200)

#### Dark Mode Colors
- **Primary**: `#6366f1` (Brighter Indigo)
- **Background**: `#111827` (Gray 900)
- **Secondary Background**: `#1f2937` (Gray 800)
- **Text Primary**: `#f9fafb` (Gray 50)
- **Text Secondary**: `#d1d5db` (Gray 300)
- **Borders**: `#374151` (Gray 700)

## 🎨 SCSS Implementation

### Theme-Aware Mixins

```scss
// Apply different values for light and dark modes
@mixin theme-property($property, $light-value, $dark-value) {
  #{$property}: #{$light-value};
  
  [data-theme="dark"] & {
    #{$property}: #{$dark-value};
  }
}

// Dark mode specific styles
@mixin dark-mode {
  [data-theme="dark"] & {
    @content;
  }
}
```

### Usage Examples

```scss
.my-component {
  @include theme-property(background-color, $light-bg-primary, $dark-bg-primary);
  @include theme-property(color, $light-text-primary, $dark-text-primary);
  
  &:hover {
    @include dark-mode {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
  }
}
```

## 🔧 JavaScript API

### ThemeManager Class

The `ThemeManager` class provides a comprehensive API for theme management:

```javascript
// Get the theme manager instance
const themeManager = window.themeManager;

// Check current theme
themeManager.isDarkMode();     // boolean
themeManager.isLightMode();    // boolean
themeManager.getCurrentTheme(); // 'light' | 'dark'

// Set theme programmatically
themeManager.setDarkMode();
themeManager.setLightMode();
themeManager.toggleTheme();

// Reset to system preference
themeManager.resetToSystemPreference();
```

### Event Listening

```javascript
// Listen for theme changes
document.addEventListener('themechange', function(e) {
  console.log('Theme changed to:', e.detail.theme);
  console.log('Is dark mode:', e.detail.isDark);
});
```

## 🎯 HTML Implementation

### Theme Toggle Button

```html
<button 
  data-theme-toggle 
  class="theme-toggle" 
  aria-label="Toggle dark mode"
  title="Toggle dark mode"
>
  <span class="theme-toggle__icon theme-toggle__sun">☀️</span>
  <span class="theme-toggle__icon theme-toggle__moon">🌙</span>
</button>
```

### Theme-Aware Components

All components automatically adapt to the current theme through CSS custom properties and the `data-theme` attribute on the document root.

## 🧩 Component Coverage

### ✅ Fully Implemented Components

- **Buttons**: All variants (primary, secondary, success, warning, error)
- **Cards**: Dashboard cards, feature cards, admin cards
- **Forms**: Inputs, selects, textareas, radio buttons
- **Modals**: Headers, bodies, overlays
- **Tables**: Headers, rows, hover states
- **Status Badges**: Success, pending, error, info states
- **Alerts**: All alert types with proper contrast
- **Navigation**: Headers, footers, admin panels
- **Loading States**: Spinners and loading text

### 🎨 Design Tokens

```scss
// Spacing
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;
$spacing-2xl: 3rem;

// Typography
$font-size-xs: 0.75rem;
$font-size-sm: 0.875rem;
$font-size-base: 1rem;
$font-size-lg: 1.125rem;
$font-size-xl: 1.25rem;
$font-size-2xl: 1.5rem;
$font-size-3xl: 2rem;
$font-size-4xl: 2.5rem;

// Transitions
$transition-fast: 0.15s ease;
$transition-base: 0.2s ease;
$transition-slow: 0.3s ease;
```

## 📱 Responsive Design

The dark mode implementation is fully responsive and includes mobile-specific considerations:

```scss
@include mobile {
  .theme-toggle {
    // Mobile-specific theme toggle styles
  }
}

@include tablet {
  // Tablet-specific adjustments
}

@include desktop {
  // Desktop-specific enhancements
}
```

## ♿ Accessibility Features

### Keyboard Navigation
- Theme toggle is fully keyboard accessible (Enter/Space keys)
- Focus indicators are theme-aware
- Tab order is preserved in both themes

### Screen Reader Support
- Proper ARIA labels on theme toggle
- Theme change announcements
- Semantic HTML structure maintained

### Color Contrast
- All color combinations meet WCAG AA standards
- High contrast ratios in both light and dark modes
- Color is never the only means of conveying information

## 🚀 Performance Optimizations

### CSS Optimizations
- Compiled and minified SCSS output
- Efficient CSS custom properties usage
- Minimal runtime style calculations

### JavaScript Optimizations
- Event delegation for theme toggles
- Debounced system preference detection
- Efficient localStorage operations

### Transition Optimizations
- Hardware-accelerated transitions
- Reduced motion support for accessibility
- Optimized animation performance

## 🧪 Testing

### Manual Testing Checklist

- [ ] Theme toggle works on all pages
- [ ] System preference detection works
- [ ] localStorage persistence works
- [ ] All components render correctly in both themes
- [ ] Smooth transitions between themes
- [ ] Keyboard navigation works
- [ ] Mobile responsiveness maintained

### Browser Support

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

## 🔄 Migration Guide

### For Existing Components

1. Replace hardcoded colors with theme-aware mixins:
```scss
// Before
.my-component {
  background: #ffffff;
  color: #1f2937;
}

// After
.my-component {
  @include theme-property(background-color, $light-bg-primary, $dark-bg-primary);
  @include theme-property(color, $light-text-primary, $dark-text-primary);
}
```

2. Add theme toggle to new pages:
```html
<script src="/js/theme.js"></script>
<!-- Add theme toggle button -->
```

### For New Components

1. Use the provided mixins and variables
2. Test in both light and dark modes
3. Ensure proper contrast ratios
4. Add to the demo page for testing

## 📊 Demo Page

Visit `/demo.html` to see all components in action with the dark mode toggle. This page showcases:

- All button variants
- Form components
- Status badges
- Cards and layouts
- Tables and data display
- Modals and overlays
- Loading states
- Admin components

## 🐛 Troubleshooting

### Common Issues

**Theme not persisting after page reload**
- Check localStorage permissions
- Verify theme.js is loaded before DOM ready

**Components not switching themes**
- Ensure `data-theme` attribute is on document root
- Check if component uses theme-aware mixins

**Transitions not smooth**
- Verify CSS transition properties are applied
- Check for conflicting CSS rules

**System preference not detected**
- Ensure browser supports `prefers-color-scheme`
- Check media query syntax

## 🔮 Future Enhancements

### Planned Features
- [ ] High contrast mode support
- [ ] Custom theme colors
- [ ] Theme scheduling (auto dark mode at sunset)
- [ ] Theme preview without applying
- [ ] Advanced accessibility options

### Potential Improvements
- [ ] CSS-in-JS integration for dynamic theming
- [ ] Theme-aware image variants
- [ ] Animated theme transitions
- [ ] Theme analytics and usage tracking

## 📝 Contributing

When adding new components or features:

1. Use the established color tokens and mixins
2. Test in both light and dark modes
3. Ensure accessibility standards are met
4. Add examples to the demo page
5. Update this documentation

## 📞 Support

For questions or issues related to the dark mode implementation:

1. Check the demo page for examples
2. Review the SCSS mixins and variables
3. Test with the JavaScript API
4. Refer to this documentation

---

**Happy theming! 🌙✨** 