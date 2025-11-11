# Next.js 15 Best Practices (Context7 学習済み)

## Server Components vs Client Components

### Server Components (デフォルト)
- **使用場面**: データフェッチ、静的コンテンツ、SEO重要なコンテンツ
- **メリット**: バンドルサイズ削減、サーバーサイドレンダリング、直接DB/APIアクセス
- **パターン**:
```typescript
// Server Component (デフォルト)
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  const posts = await data.json()
  return <ul>{posts.map(post => <li key={post.id}>{post.title}</li>)}</ul>
}
```

### Client Components
- **使用場面**: インタラクティブ性、useState/useEffect、ブラウザAPI
- **マーキング**: `'use client'` ディレクティブ
- **パターン**:
```typescript
'use client'
import { useState } from 'react'

export function LikeButton({ likes }: { likes: number }) {
  const [count, setCount] = useState(likes)
  return <button onClick={() => setCount(count + 1)}>❤️ {count}</button>
}
```

## Data Fetching Strategies

### 1. Static Generation (SSG) - デフォルト
```typescript
// force-cache (デフォルト)
const staticData = await fetch('https://...', { cache: 'force-cache' })
```

### 2. Server-Side Rendering (SSR)
```typescript
// no-store (毎リクエスト)
const dynamicData = await fetch('https://...', { cache: 'no-store' })
```

### 3. Incremental Static Regeneration (ISR)
```typescript
// revalidate (N秒ごと)
const revalidatedData = await fetch('https://...', {
  next: { revalidate: 60 } // 60秒
})
```

### 4. Cache Components (Next.js 15.5+)
```typescript
export async function getProducts() {
  'use cache'
  const data = await db.query('SELECT * FROM products')
  return data
}
```

## Performance Optimization

### 1. Streaming with Suspense
```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <section>
      <Suspense fallback={<p>Loading feed...</p>}>
        <PostFeed />
      </Suspense>
      <Suspense fallback={<p>Loading weather...</p>}>
        <Weather />
      </Suspense>
    </section>
  )
}
```

### 2. Request Memoization
```typescript
// 同じURLとオプションのfetchは自動的にメモ化される
async function getItem() {
  const res = await fetch('https://.../item/1')
  return res.json()
}

const item1 = await getItem() // cache MISS
const item2 = await getItem() // cache HIT (同じレンダーパス内)
```

### 3. Preloading Data
```typescript
export const preload = (id: string) => {
  void getItem(id) // 早期にデータフェッチ開始
}

export default async function Page({ params }) {
  const { id } = await params
  preload(id) // バックグラウンドでロード開始
  const isAvailable = await checkIsAvailable()
  return isAvailable ? <Item id={id} /> : null
}
```

## Component Composition Patterns

### Server → Client Props Passing
```typescript
// Server Component
import LikeButton from '@/app/ui/like-button'
import { getPost } from '@/lib/data'

export default async function Page({ params }) {
  const { id } = await params
  const post = await getPost(id)
  return <LikeButton likes={post.likes} /> // propsでデータ渡す
}
```

### Layout Optimization
```typescript
// Server Component layout
import Search from './search' // Client Component

export default function Layout({ children }) {
  return (
    <>
      <nav>
        <Logo /> {/* Server Component */}
        <Search /> {/* Client Component (必要な部分のみ) */}
      </nav>
      <main>{children}</main>
    </>
  )
}
```

## Caching Configuration

### Route Segment Config
```typescript
// app/page.tsx
export const dynamic = 'auto' // 'force-dynamic' | 'error' | 'force-static'
export const revalidate = 3600 // 1時間ごとに再検証
export const fetchCache = 'auto' // fetch caching behavior
```

### Dynamic Rendering
```typescript
// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await fetch('https://...', { cache: 'no-store' })
  return <div>{/* ... */}</div>
}
```

## Security Best Practices

### 1. Server-Only Data Fetching
```typescript
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = cookies()
  const token = cookieStore.get('AUTH_TOKEN')?.value
  
  const res = await fetch('https://api.example.com/profile', {
    headers: { Cookie: `AUTH_TOKEN=${token}` }
  })
  // ...
}
```

### 2. Sanitized Data Passing
```typescript
import { getUser } from '../data/user'
import Profile from './ui/profile'

export default async function Page({ params }) {
  const { slug } = await params
  const publicProfile = await getUser(slug) // 公開データのみ
  return <Profile user={publicProfile} />
}
```

## Migration from Pages Router

### getStaticProps → Server Component
```typescript
// Before (Pages Router)
export async function getStaticProps() {
  const res = await fetch('https://...')
  const projects = await res.json()
  return { props: { projects } }
}

// After (App Router)
async function getProjects() {
  const res = await fetch('https://...')
  return res.json()
}

export default async function Page() {
  const projects = await getProjects()
  return <div>{/* ... */}</div>
}
```

### getServerSideProps → Server Component
```typescript
// Before (Pages Router)
export async function getServerSideProps() {
  const res = await fetch('https://...')
  const projects = await res.json()
  return { props: { projects } }
}

// After (App Router)
async function getProjects() {
  const res = await fetch('https://...', { cache: 'no-store' })
  return res.json()
}

export default async function Page() {
  const projects = await getProjects()
  return <div>{/* ... */}</div>
}
```

## Common Patterns

### 1. Loading States
```typescript
// app/zukan/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}
```

### 2. Error Handling
```typescript
// app/zukan/error.tsx
'use client'

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### 3. Not Found
```typescript
// app/zukan/not-found.tsx
export default function NotFound() {
  return <div>404 - Page Not Found</div>
}
```

## Key Takeaways

1. **Server Components First**: デフォルトでServer Componentsを使用
2. **Client Components Sparingly**: 必要な部分のみClient Componentsに
3. **Fetch with Cache Options**: 適切なキャッシング戦略を選択
4. **Streaming for UX**: Suspenseで段階的レンダリング
5. **Memoization Automatic**: 同じfetchは自動的にメモ化
6. **Security on Server**: 認証・認可はサーバーサイドで
7. **Props for Data Flow**: Server → Client はpropsでデータ渡す
