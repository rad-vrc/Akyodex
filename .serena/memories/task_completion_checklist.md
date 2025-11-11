# Task Completion Checklist

When completing a coding task, follow these steps:

## 1. Code Quality Checks

### Linting
```bash
npm run lint
```
- Fix any ESLint errors
- Address warnings if critical

### Type Checking
```bash
npx tsc --noEmit
```
- Ensure no TypeScript errors
- Fix type issues before committing

### Unused Code Detection
```bash
npm run knip
```
- Review and remove unused exports
- Clean up dead code

## 2. Testing

### Unit Tests (if applicable)
```bash
npm test
```
- Write tests for new functionality
- Ensure existing tests pass
- Aim for meaningful coverage

### E2E Tests (for UI changes)
```bash
npm run test:playwright
```
- Test critical user flows
- Verify UI interactions work

## 3. Build Verification

### Development Build
```bash
npm run dev
```
- Test locally at http://localhost:3000
- Verify all features work

### Production Build
```bash
npm run build
```
- Ensure build completes without errors
- Check for build warnings

## 4. Code Review Preparation

### Self-Review
- Review your own changes
- Check for console.log statements
- Verify error handling
- Ensure security best practices

### Documentation
- Update README if needed
- Add JSDoc comments for complex functions
- Update type definitions

### Git
```bash
git status
git diff
git add .
git commit -m "descriptive message"
```

## 5. Deployment Considerations

### Environment Variables
- Verify all required env vars are set
- Check .dev.vars for local development
- Ensure production env vars in Cloudflare

### Cloudflare Bindings
- Verify KV, R2, Vectorize bindings in wrangler.toml
- Test with local Cloudflare dev server if needed

### Performance
- Check bundle size
- Verify image optimization
- Test loading times

## Common Issues to Check

### Security
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] XSS prevention (sanitize-html)
- [ ] CSRF protection for forms

### Performance
- [ ] Images lazy loaded
- [ ] Components code-split appropriately
- [ ] No unnecessary re-renders

### Accessibility
- [ ] Semantic HTML used
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works

### i18n
- [ ] Japanese and English strings provided
- [ ] Language detection works
- [ ] No hardcoded text in components
