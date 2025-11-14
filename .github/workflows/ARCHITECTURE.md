# GitHub Actions Workflows Architecture

## Workflow Execution Flow

```mermaid
graph TD
    A[Developer Push/PR] --> B{Event Type?}
    B -->|Pull Request| C[CI Workflow]
    B -->|Push to main| D[Deploy Workflow]
    B -->|Push to main| C
    
    C --> C1[Lint & Type Check]
    C --> C2[Build Validation]
    C --> C3[Security Scan]
    C --> C4[Dependency Review]
    
    C1 --> C2
    C1 --> C3
    C2 --> C5[Build Performance]
    
    C5 --> E{All Jobs Pass?}
    E -->|Yes| F[Ready to Merge]
    E -->|No| G[Fix Issues]
    
    D --> D1[Build App]
    D1 --> D2[Verify Output]
    D2 --> D3[Deploy to Cloudflare]
    D3 --> D4[Create Summary]
    
    H[Schedule: Monday 9AM] --> I[Security Audit]
    I --> I1[npm audit]
    I --> I2[CodeQL Analysis]
    I --> I3[Snyk Scan]
    I --> I4[Check Outdated]
    
    I1 --> I5{Vulnerabilities?}
    I5 -->|Yes| I6[Create Issue]
    I5 -->|No| I7[All Clear]
    
    J[Schedule: Daily 6AM] --> K[Validate Resources]
    K --> K1[Check R2 Bucket]
    K --> K2[Check KV Namespace]
    K --> K3[Validate CSV Data]
    
    K1 --> K4[Health Report]
    K2 --> K4
    K3 --> K4
    
    style C fill:#e1f5ff
    style D fill:#e8f5e9
    style I fill:#fff3e0
    style K fill:#f3e5f5
```

## Workflow Dependencies

```mermaid
graph LR
    A[Reusable Build] -.->|called by| B[CI: Build Validation]
    A -.->|called by| C[CI: Build Performance]
    A -.->|called by| D[Deploy Workflow]
    
    E[CI: Lint] --> B
    E --> F[CI: Security Scan]
    
    B --> C
    
    style A fill:#ffd54f
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#e8f5e9
    style E fill:#e1f5ff
    style F fill:#e1f5ff
```

## Timeline View

```mermaid
gantt
    title Workflow Execution Timeline
    dateFormat HH:mm
    section PR Created
    Lint & Type Check     :a1, 00:00, 2m
    Build Validation      :a2, after a1, 3m
    Security Scan         :a3, after a1, 5m
    Dependency Review     :a4, 00:00, 1m
    Build Performance     :a5, after a2, 3m
    
    section Push to Main
    Build & Deploy        :b1, 00:00, 5m
    
    section Scheduled
    Security Audit (Weekly)     :c1, 00:00, 10m
    Resource Validation (Daily) :d1, 00:00, 3m
```

## Resource Flow

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
└────────────┬────────────────────────────────────────────┘
             │
             ├─── Push/PR ───> CI Workflow
             │                      │
             │                      ├─── Lint/TypeCheck
             │                      ├─── Build (uses Reusable)
             │                      ├─── Security Scan
             │                      └─── Performance Analysis
             │
             ├─── Push main ─> Deploy Workflow
             │                      │
             │                      ├─── Build (uses Reusable)
             │                      ├─── Verify Output
             │                      └─── Deploy to Cloudflare
             │                              │
             │                              └─> Cloudflare Pages
             │                                      ├─── R2 Bucket
             │                                      ├─── KV Store
             │                                      └─── Edge Workers
             │
             ├─── Schedule ───> Security Audit
             │                      ├─── npm audit
             │                      ├─── CodeQL
             │                      ├─── Snyk (optional)
             │                      └─── Create Issue (if needed)
             │
             └─── Schedule ───> Resource Validation
                                    ├─── Check R2
                                    ├─── Check KV
                                    ├─── Validate CSV
                                    └─── Health Report
```

## Security Layers

```
┌───────────────────────────────────────────────────────────┐
│                    Security Pipeline                       │
├───────────────────────────────────────────────────────────┤
│  Layer 1: Static Analysis                                 │
│  • ESLint (code quality)                                  │
│  • TypeScript (type safety)                               │
├───────────────────────────────────────────────────────────┤
│  Layer 2: Dependency Scanning                             │
│  • npm audit (known vulnerabilities)                      │
│  • Dependency Review (new vulnerabilities in PRs)         │
│  • Snyk (advanced scanning - optional)                    │
├───────────────────────────────────────────────────────────┤
│  Layer 3: Code Analysis                                   │
│  • CodeQL (security-extended queries)                     │
│  • Pattern detection (SQL injection, XSS, etc.)           │
├───────────────────────────────────────────────────────────┤
│  Layer 4: Runtime Validation                              │
│  • Build verification                                     │
│  • Output validation                                      │
│  • Resource integrity checks                              │
└───────────────────────────────────────────────────────────┘
```

## Optimization Strategy

### Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Cache Hierarchy                       │
├─────────────────────────────────────────────────────────┤
│  Level 1: npm cache (via actions/setup-node)            │
│  • Cache Key: package-lock.json hash                     │
│  • Location: GitHub Actions cache                        │
│  • TTL: Until package-lock changes                       │
├─────────────────────────────────────────────────────────┤
│  Level 2: node_modules cache (reusable workflow)        │
│  • Cache Key: Node version + package-lock hash           │
│  • Location: GitHub Actions cache                        │
│  • TTL: Until dependencies change                        │
├─────────────────────────────────────────────────────────┤
│  Level 3: Build artifacts (optional)                     │
│  • Storage: GitHub Artifacts                             │
│  • TTL: 7 days                                           │
│  • Size: ~50MB per build                                 │
└─────────────────────────────────────────────────────────┘
```

### Parallel Execution

```
CI Workflow Parallelization:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Lint        │ Security    │ Dependency  │ Build       │
│ & TypeCheck │ Scan        │ Review      │ Validation  │
│             │             │             │             │
│ (2 min)     │ (5 min)     │ (1 min)     │ (3 min)     │
└─────────────┴─────────────┴─────────────┴──────┬──────┘
                                                  │
                                          ┌───────▼──────┐
                                          │ Performance  │
                                          │ Report       │
                                          │ (3 min)      │
                                          └──────────────┘

Sequential execution: 14 minutes
Parallel execution: 8 minutes (43% faster)
```

## Error Handling Flow

```mermaid
graph TD
    A[Workflow Start] --> B{Job Success?}
    B -->|Success| C[Continue Pipeline]
    B -->|Failure| D{Critical Job?}
    
    D -->|Yes| E[Stop Pipeline]
    D -->|No| F[Mark as Warning]
    
    E --> G[Report Failure]
    F --> H[Continue with Warnings]
    
    G --> I[Create Issue]
    G --> J[Notify Team]
    
    H --> K[Generate Report]
    K --> L[Add to Summary]
    
    style E fill:#ffcdd2
    style F fill:#fff9c4
    style C fill:#c8e6c9
```

## Cost Optimization

### GitHub Actions Minutes Usage

```
Monthly Estimate (Public Repository - Free):

CI Workflow:
• Trigger: ~50 PRs + 50 pushes/month
• Duration: ~8 minutes/run
• Total: 100 runs × 8 min = 800 minutes

Deploy Workflow:
• Trigger: ~30 deployments/month
• Duration: ~5 minutes/run
• Total: 30 runs × 5 min = 150 minutes

Security Audit:
• Trigger: 4 times/month (weekly)
• Duration: ~10 minutes/run
• Total: 4 runs × 10 min = 40 minutes

Resource Validation:
• Trigger: 30 times/month (daily)
• Duration: ~3 minutes/run
• Total: 30 runs × 3 min = 90 minutes

Total: ~1,080 minutes/month
GitHub Free Tier: 2,000 minutes/month
Usage: 54% of free tier
```

### Cloudflare Resources

```
Cloudflare Pages (Free Tier):
• Builds: Unlimited
• Bandwidth: 100GB/month
• Requests: 100,000/day
• Build time: Included

R2 Storage (Free Tier):
• Storage: 10GB
• Class A operations: 1M/month
• Class B operations: 10M/month

KV Storage (Free Tier):
• Storage: 1GB
• Reads: 100,000/day
• Writes: 1,000/day
```

## Monitoring & Observability

```
┌───────────────────────────────────────────────────────┐
│              Metrics & Monitoring                      │
├───────────────────────────────────────────────────────┤
│  Build Metrics:                                        │
│  • Build time (tracked per job)                       │
│  • Build size (tracked per deployment)                │
│  • Success rate (tracked per workflow)                │
├───────────────────────────────────────────────────────┤
│  Security Metrics:                                     │
│  • Vulnerabilities found (by severity)                │
│  • Resolution time (via issues)                       │
│  • False positive rate                                │
├───────────────────────────────────────────────────────┤
│  Resource Health:                                      │
│  • R2 bucket status (daily check)                     │
│  • KV namespace status (daily check)                  │
│  • CSV data integrity (daily check)                   │
├───────────────────────────────────────────────────────┤
│  Deployment Metrics:                                   │
│  • Deploy frequency                                    │
│  • Deploy success rate                                │
│  • Rollback rate                                      │
└───────────────────────────────────────────────────────┘
```
