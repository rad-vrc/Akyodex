# Code Style & Conventions

## File Naming
- **TypeScript/React**: kebab-case (e.g., `akyo-card.tsx`, `csv-parser.ts`)
- **Components**: kebab-case (e.g., `akyo-detail-modal.tsx`)
- **API Routes**: kebab-case (e.g., `upload-akyo/route.ts`)
- **Types**: kebab-case (e.g., `akyo.ts`)

## Component Structure
```typescript
// 1. Imports (external → internal → relative)
import { useState } from 'react';
import type { AkyoData } from '@/types/akyo';

// 2. Types/Interfaces
interface AkyoCardProps {
  akyo: AkyoData;
  onFavorite?: (id: string) => void;
}

// 3. Component
export function AkyoCard({ akyo, onFavorite }: AkyoCardProps) {
  // State
  const [isHovered, setIsHovered] = useState(false);
  
  // Handlers
  const handleClick = () => { /* ... */ };
  
  // Render
  return <div>...</div>;
}
```

## API Route Structure
```typescript
// 1. Imports
import { NextRequest, NextResponse } from 'next/server';
import type { AkyoData } from '@/types/akyo';

// 2. Types
interface RequestBody {
  id: string;
  nickname: string;
}

// 3. Handler
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const body: RequestBody = await request.json();
    
    // 2. Validate
    if (!body.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    // 3. Process
    const result = await processData(body);
    
    // 4. Return
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Import Order
1. External packages (react, next, etc.)
2. Internal aliases (@/components, @/lib, @/types)
3. Relative imports (./utils, ../types)
4. CSS/styles

## Path Aliases
- `@/*` → `./src/*`
- Example: `import { AkyoCard } from '@/components/akyo-card'`

## TypeScript
- **Strict mode**: Enabled
- **Target**: ES2017
- **Module**: esnext (bundler resolution)
- **Type annotations**: Required for function parameters and return types
- **Interfaces**: Preferred over types for object shapes

## React
- **Server Components**: Default (no directive)
- **Client Components**: Use `'use client'` directive
- **Hooks**: Follow React hooks rules
- **Props**: Use TypeScript interfaces

## Error Handling
```typescript
// API Routes
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}

// Components
try {
  // Operation
} catch (error) {
  console.error('Component error:', error);
  setError('Something went wrong');
}
```

## Security Practices
- HTML sanitization with sanitize-html
- URL validation with URL constructor
- Timing-safe password comparison
- HTTP-only cookies for JWT
- Input validation with length limits
