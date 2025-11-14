# Design Patterns & Guidelines

## Architecture Patterns

### Next.js App Router
- **Server Components**: Default for all components
- **Client Components**: Only when needed (interactivity, hooks, browser APIs)
- **API Routes**: Edge Runtime for low latency
- **Middleware**: i18n detection at edge

### Data Fetching
- **SSG (Static Site Generation)**: Gallery pages pre-rendered at build time
- **ISR (Incremental Static Regeneration)**: 1-hour revalidation for gallery
- **Client-side**: User-specific data (favorites, preferences)

### State Management
- **Server State**: Cloudflare KV (sessions), R2 (CSV/images)
- **Client State**: React useState (component-local)
- **Persistent State**: localStorage (favorites, language)
- **Session State**: sessionStorage (admin auth)

## Component Patterns

### Composition
```typescript
// Good: Composable components
<FilterPanel>
  <SearchBar />
  <AttributeFilter />
  <CreatorFilter />
</FilterPanel>

// Avoid: Monolithic components
```

### Props Drilling
```typescript
// Good: Use context for deeply nested props
const LanguageContext = createContext<SupportedLanguage>('ja');

// Avoid: Passing props through many levels
```

### Conditional Rendering
```typescript
// Good: Early returns
if (!data) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <Content data={data} />;

// Avoid: Nested ternaries
```

## Security Patterns

### Input Sanitization
```typescript
import sanitizeHtml from 'sanitize-html';

// Always sanitize user input before rendering
const clean = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {}
});
```

### Authentication
```typescript
// JWT with HTTP-only cookies
const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: '7d' });
response.cookies.set('admin_session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

### Timing-Safe Comparison
```typescript
import { timingSafeEqual } from 'crypto';

// Prevent timing attacks
function comparePasswords(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
```

## Performance Patterns

### Virtual Scrolling
```typescript
// Render only visible items
const INITIAL_RENDER_COUNT = 60;
const RENDER_CHUNK = 60;
const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_COUNT);

// Infinite scroll
const handleScroll = useCallback(() => {
  if (nearBottom && renderLimit < data.length) {
    setRenderLimit(prev => Math.min(data.length, prev + RENDER_CHUNK));
  }
}, [renderLimit, data.length]);
```

### Image Optimization
```typescript
// Lazy loading with Next.js Image
<Image
  src={imageUrl}
  alt={alt}
  width={400}
  height={400}
  loading="lazy"
  placeholder="blur"
/>
```

### Code Splitting
```typescript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

## Error Handling Patterns

### API Routes
```typescript
export async function POST(request: NextRequest) {
  try {
    // Operation
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
```

### Components
```typescript
function Component() {
  const [error, setError] = useState<string | null>(null);
  
  try {
    // Operation
  } catch (err) {
    console.error('Component error:', err);
    setError('Something went wrong');
  }
  
  if (error) return <ErrorMessage message={error} />;
  return <Content />;
}
```

## Testing Patterns

### Unit Tests (Vitest)
```typescript
import { describe, it, expect } from 'vitest';

describe('parseCsvToAkyoData', () => {
  it('should parse valid CSV', () => {
    const csv = 'ID,通称,アバター名\n0001,Test,TestAvatar';
    const result = parseCsvToAkyoData(csv);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('0001');
  });
});
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('should display avatar gallery', async ({ page }) => {
  await page.goto('/zukan');
  await expect(page.locator('.akyo-card')).toHaveCount(60);
});
```

## Naming Conventions

### Variables
- **camelCase**: `akyoData`, `filteredData`
- **UPPER_SNAKE_CASE**: `INITIAL_RENDER_COUNT`, `API_BASE_URL`

### Functions
- **camelCase**: `handleClick`, `fetchAkyoData`
- **Prefix with verb**: `get`, `set`, `fetch`, `handle`, `on`

### Components
- **PascalCase**: `AkyoCard`, `FilterPanel`
- **Descriptive names**: `AkyoDetailModal` not `Modal`

### Types/Interfaces
- **PascalCase**: `AkyoData`, `ViewMode`
- **Suffix with type**: `AkyoCardProps`, `ApiResponse`
