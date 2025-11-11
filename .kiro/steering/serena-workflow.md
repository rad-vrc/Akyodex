# Serena Workflow Guidelines

## Overview

**Serena MCP** is a semantic code analysis and editing tool that provides intelligent, symbol-based operations on the codebase. Always prioritize Serena tools over basic file operations for code-related tasks.

## When to Use Serena

### ✅ Always Use Serena For:
- Reading code (use symbolic tools, not full file reads)
- Understanding code structure and relationships
- Editing code (symbol-based or pattern-based)
- Refactoring and renaming
- Finding references and dependencies
- Code navigation and exploration

### ❌ Don't Use Serena For:
- Non-code files (markdown, JSON, config files)
- Binary files
- Simple text file operations
- Shell commands

## Available Serena Tools

### Code Reading (Symbolic)
- **`get_symbols_overview`** - Get high-level overview of symbols in a file (ALWAYS use this first!)
- **`find_symbol`** - Find and read specific symbols by name path
- **`find_referencing_symbols`** - Find all references to a symbol
- **`search_for_pattern`** - Search for regex patterns in code

### Code Editing (Symbolic)
- **`replace_symbol_body`** - Replace entire symbol body (functions, classes, methods)
- **`insert_after_symbol`** - Insert code after a symbol
- **`insert_before_symbol`** - Insert code before a symbol (e.g., imports)
- **`rename_symbol`** - Rename symbol throughout codebase

### File System
- **`list_dir`** - List directory contents
- **`find_file`** - Find files by name pattern

### Memory Management
- **`write_memory`** - Save project information
- **`read_memory`** - Read saved project information
- **`list_memories`** - List available memories
- **`delete_memory`** - Delete a memory file

### Workflow Helpers
- **`think_about_collected_information`** - Reflect on gathered info (use after reading code)
- **`think_about_task_adherence`** - Check if on track (use before editing)
- **`think_about_whether_you_are_done`** - Verify task completion

### Project Management
- **`activate_project`** - Switch to a different project
- **`get_current_config`** - View current Serena configuration
- **`check_onboarding_performed`** - Check if project is onboarded

## Workflow Best Practices

### 1. Code Reading Workflow

**❌ Bad (Token-Inefficient):**
```
1. readFile entire file
2. Read it again with find_symbol
3. Read it again with grep
```

**✅ Good (Token-Efficient):**
```
1. get_symbols_overview (get high-level structure)
2. find_symbol with include_body=false (get symbol metadata)
3. find_symbol with include_body=true (read only needed symbols)
4. think_about_collected_information (reflect)
```

### 2. Code Editing Workflow

**✅ Recommended:**
```
1. get_symbols_overview (understand structure)
2. find_symbol (locate target symbol)
3. think_about_task_adherence (verify approach)
4. replace_symbol_body / insert_after_symbol (edit)
5. think_about_whether_you_are_done (verify completion)
```

### 3. Refactoring Workflow

**✅ Recommended:**
```
1. find_symbol (find target symbol)
2. find_referencing_symbols (find all usages)
3. rename_symbol (rename throughout codebase)
   OR
   replace_symbol_body (update implementation)
```

## Symbol Name Paths

Serena uses **name paths** to identify symbols within files:

### Examples:
- **Top-level function**: `functionName`
- **Class**: `ClassName`
- **Class method**: `ClassName/methodName`
- **Nested class**: `OuterClass/InnerClass`
- **Constructor (Python)**: `ClassName/__init__`
- **Absolute path**: `/ClassName` (matches only top-level)

### Matching Behavior:
- `method` - Matches any method with that name
- `Class/method` - Matches method in Class (any nesting level)
- `/Class/method` - Matches only top-level Class's method

## Integration with Kiro Tools

### Use Serena When:
- Working with TypeScript/JavaScript/React code
- Need to understand code structure
- Performing refactoring
- Finding symbol references

### Use Kiro Tools When:
- Reading non-code files (README.md, package.json)
- Running shell commands (npm, git)
- File operations on config files
- Testing and building

### Hybrid Approach:
```typescript
// 1. Use Kiro to check project structure
listDirectory("src/components")

// 2. Use Serena to understand code
get_symbols_overview("src/components/akyo-card.tsx")
find_symbol("AkyoCard", "src/components/akyo-card.tsx")

// 3. Use Serena to edit
replace_symbol_body("AkyoCard", "src/components/akyo-card.tsx", newBody)

// 4. Use Kiro to verify
executePwsh("npm run lint")
```

## Common Patterns

### Pattern 1: Understanding a New Component
```
1. get_symbols_overview("src/components/new-component.tsx")
2. find_symbol("NewComponent", include_body=false, depth=1)
3. find_symbol("NewComponent/handleClick", include_body=true)
4. think_about_collected_information
```

### Pattern 2: Adding a New Method
```
1. find_symbol("ClassName", include_body=false)
2. insert_after_symbol("ClassName/lastMethod", newMethodCode)
```

### Pattern 3: Refactoring
```
1. find_symbol("oldFunctionName")
2. find_referencing_symbols("oldFunctionName")
3. rename_symbol("oldFunctionName", "newFunctionName")
```

### Pattern 4: Adding Imports
```
1. get_symbols_overview("file.tsx")
2. insert_before_symbol("firstSymbol", importStatement)
```

## Performance Tips

### ✅ Do:
- Use `get_symbols_overview` before reading full symbols
- Use `include_body=false` to get metadata first
- Use `depth` parameter to control how deep to read
- Use `relative_path` to restrict searches
- Call `think_about_*` tools to reflect on progress

### ❌ Don't:
- Read entire files unless absolutely necessary
- Read the same content multiple times
- Use symbolic tools after reading full file (redundant)
- Skip the overview step

## Error Handling

If Serena tools fail:
1. Check if file is a code file (Serena works best with TS/JS/Python/etc.)
2. Verify symbol name path is correct
3. Check if file exists with `find_file`
4. Fall back to Kiro tools for non-code files

## Example: Complete Task with Serena

**Task**: Add a new prop to AkyoCard component

```typescript
// 1. Understand current structure
get_symbols_overview("src/components/akyo-card.tsx")

// 2. Read component interface
find_symbol("AkyoCardProps", include_body=true)

// 3. Read component implementation
find_symbol("AkyoCard", include_body=true)

// 4. Think about approach
think_about_task_adherence()

// 5. Update interface
replace_symbol_body("AkyoCardProps", newInterface)

// 6. Update component
replace_symbol_body("AkyoCard", newImplementation)

// 7. Verify completion
think_about_whether_you_are_done()
```

## Summary

**Golden Rule**: For code operations, always think "Can I use Serena for this?" before reaching for basic file tools. Serena provides semantic understanding and precise editing that basic tools cannot match.
