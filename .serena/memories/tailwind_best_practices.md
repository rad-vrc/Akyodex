# Tailwind CSS Best Practices (Context7 学習済み)

## Utility-First Approach

### 基本原則
- **Utility classes直接適用**: HTML/JSXに直接クラスを記述
- **Component抽出は最小限**: 繰り返しが多い場合のみ
- **カスタムCSSは最後の手段**: Tailwindで解決できない場合のみ

### 良い例
```tsx
<button className="rounded-md px-3 py-1.5 font-medium bg-purple-500 hover:bg-purple-700 text-white">
  Save changes
</button>
```

### 避けるべき例
```css
/* カスタムCSSを作りすぎない */
.btn-primary {
  /* ... 多数のスタイル */
}
```

## Responsive Design

### Mobile-First Approach
```tsx
// デフォルト(mobile) → sm → md → lg → xl
<div className="w-16 md:w-32 lg:w-48">
  <img src="..." />
</div>
```

### Breakpoint Variants
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
  {/* モバイル: 2列, タブレット: 3列, デスクトップ: 5列 */}
</div>
```

### Custom Breakpoints
```css
@import "tailwindcss";

@theme {
  --breakpoint-xs: 30rem;
  --breakpoint-3xl: 120rem;
}
```

```tsx
<div className="xs:grid-cols-2 3xl:grid-cols-6">
  {/* カスタムブレークポイント使用 */}
</div>
```

## Dark Mode

### Class-Based Dark Mode (推奨)
```tsx
// HTML要素にdarkクラスを追加/削除
<html className="dark">
  <body>
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      {/* ダークモード対応 */}
    </div>
  </body>
</html>
```

### Dark Mode Utilities
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-8">
  <h3 className="text-gray-900 dark:text-white">Title</h3>
  <p className="text-gray-500 dark:text-gray-400">Description</p>
</div>
```

## State Variants

### Hover & Active States
```tsx
<button className="bg-sky-500 hover:bg-sky-700 active:bg-sky-800">
  Button
</button>
```

### Focus States
```tsx
<input className="border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500" />
```

### Complex Variants
```tsx
// 複数のvariantsを組み合わせ
<button className="dark:lg:data-current:hover:bg-indigo-600">
  {/* ダークモード + 大画面 + data-current + hover */}
</button>
```

## Component Patterns

### Reusable Components (React)
```tsx
export function BrandedButton({ buttonColor, textColor, children }) {
  return (
    <button
      style={{
        backgroundColor: buttonColor,
        color: textColor,
      }}
      className="rounded-md px-3 py-1.5 font-medium"
    >
      {children}
    </button>
  )
}
```

### CSS Variables for Dynamic Theming
```tsx
export function BrandedButton({ buttonColor, buttonColorHover, textColor, children }) {
  return (
    <button
      style={{
        "--bg-color": buttonColor,
        "--bg-color-hover": buttonColorHover,
        "--text-color": textColor,
      }}
      className="bg-(--bg-color) text-(--text-color) hover:bg-(--bg-color-hover)"
    >
      {children}
    </button>
  )
}
```

## Custom Utilities

### @utility API (Tailwind v4)
```css
@utility btn {
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ButtonFace;
}
```

### Component Layer (必要な場合のみ)
```css
@layer components {
  .card {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    padding: --spacing(6);
    box-shadow: var(--shadow-xl);
  }
}
```

## Theme Customization

### Custom Colors
```css
@theme {
  --color-regal-blue: #243c5a;
}
```

```tsx
<p className="text-regal-blue">Custom color</p>
```

### Custom Spacing
```css
@theme {
  --spacing-18: 4.5rem;
}
```

```tsx
<div className="p-18">Custom spacing</div>
```

## Performance Optimization

### Avoid Conflicting Classes
```tsx
// ❌ Bad: 最後のクラスが勝つ
<div className="grid flex">

// ✅ Good: 条件付きで適用
<div className={gridLayout ? "grid" : "flex"}>
```

### Compose Utilities Efficiently
```tsx
// 複数のutilityを組み合わせて効果を構築
<div className="blur-sm grayscale">
  {/* filter: blur() grayscale() */}
</div>
```

## Responsive Images

### Next.js Image with Tailwind
```tsx
<Image
  src={imageUrl}
  alt={alt}
  width={400}
  height={400}
  className="h-48 w-full object-cover md:h-full md:w-48"
  loading="lazy"
/>
```

## Layout Patterns

### Flexbox
```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
  <img className="h-24 rounded-full" src="..." />
  <div className="space-y-2">
    <p className="text-lg font-semibold">Name</p>
    <p className="text-gray-500">Title</p>
  </div>
</div>
```

### Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Container
```tsx
<div className="container mx-auto px-4 sm:px-6">
  <div className="max-w-7xl mx-auto">
    {/* コンテンツ */}
  </div>
</div>
```

## Accessibility

### Semantic HTML + Tailwind
```tsx
<button
  className="rounded-md px-4 py-2 bg-purple-500 text-white"
  aria-label="Save changes"
>
  Save
</button>
```

### Focus Visible
```tsx
<a
  href="/about"
  className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
>
  Learn more
</a>
```

## Common Patterns for Akyodex

### Card Component
```tsx
<div className="akyo-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow">
  <img className="h-48 w-full object-cover rounded-lg" src={imageUrl} />
  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
</div>
```

### Modal
```tsx
<div className="fixed inset-0 z-50 overflow-y-auto">
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
  <div className="relative min-h-screen px-4 py-8">
    <div className="relative mx-auto max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl">
      {/* モーダルコンテンツ */}
    </div>
  </div>
</div>
```

### Button Variants
```tsx
// Primary
<button className="bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
  Primary
</button>

// Secondary
<button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg">
  Secondary
</button>

// Outline
<button className="border border-purple-500 text-purple-500 hover:bg-purple-50 px-4 py-2 rounded-lg">
  Outline
</button>
```

## Key Takeaways

1. **Utility-First**: HTML/JSXに直接クラスを適用
2. **Mobile-First**: デフォルトはモバイル、sm/md/lgで拡張
3. **Dark Mode**: `dark:` prefixで簡単に対応
4. **State Variants**: `hover:`, `focus:`, `active:` で状態管理
5. **Responsive**: すべてのutilityにbreakpoint variantsが使える
6. **Custom Theme**: `@theme` でカスタマイズ
7. **Performance**: 競合するクラスを避ける
8. **Composition**: 複数のutilityを組み合わせて効果を構築
