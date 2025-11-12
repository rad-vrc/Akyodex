# Windows System Commands

## Important Note

This project is developed on **Windows** with **cmd** shell. Commands must be adapted accordingly.

## File Operations (CMD)

### List Files
```cmd
# List files in current directory
dir

# List files with details
dir /a

# List files recursively
dir /s

# List only directories
dir /ad
```

### File Management
```cmd
# View file content
type file.txt

# Copy file
copy source.txt destination.txt

# Copy directory recursively
xcopy source destination /E /I

# Move file
move source.txt destination.txt

# Delete file
del file.txt

# Delete directory (with confirmation)
rmdir /s dirname

# Delete directory (without confirmation)
rmdir /s /q dirname

# Create directory
mkdir dirname

# Create nested directories
mkdir parent\child\grandchild
```

### Search Operations
```cmd
# Find files by name
dir /s /b *pattern*

# Search text in files
findstr /s /i "search text" *.txt

# Search with regex
findstr /r /s "pattern" *.js
```

## Command Chaining

### CMD Shell
```cmd
# Sequential execution (always run next command)
command1 & command2

# Conditional execution (run if previous succeeded)
command1 && command2

# Conditional execution (run if previous failed)
command1 || command2
```

**Important**: In CMD, use `&` for sequential execution, not `&&` like in Unix shells.

## PowerShell Commands (Alternative)

If using PowerShell instead of CMD:

### File Operations
```powershell
# List files
Get-ChildItem
# or
ls

# View file content
Get-Content file.txt
# or
cat file.txt

# Copy file
Copy-Item source.txt destination.txt

# Copy directory
Copy-Item -Recurse source destination

# Delete file
Remove-Item file.txt

# Delete directory
Remove-Item -Recurse -Force dirname

# Create directory
New-Item -ItemType Directory -Path dirname

# Search in files
Select-String -Path *.txt -Pattern "search"
```

### Command Chaining
```powershell
# Sequential execution
command1; command2

# Conditional execution (run if previous succeeded)
command1 -and command2

# Conditional execution (run if previous failed)
command1 -or command2
```

## Git Commands (Works on Both CMD and PowerShell)

```bash
# Check current branch
git branch --show-current

# List all branches
git branch -a

# Create new branch
git checkout -b feature/branch-name

# Switch branch
git checkout branch-name

# Pull latest changes
git pull origin main

# Add files
git add .
git add file.txt

# Commit changes
git commit -m "commit message"

# Push to remote
git push origin branch-name

# Check status
git status

# View commit history
git log --oneline

# View changes
git diff
```

## Node.js / npm Commands

```bash
# Check versions
node --version
npm --version

# Install dependencies
npm install

# Install specific package
npm install package-name

# Install dev dependency
npm install -D package-name

# Run scripts
npm run dev
npm run build
npm run test

# Clean install (remove node_modules first)
npm ci

# Update packages
npm update

# Check outdated packages
npm outdated
```

## Cloudflare Wrangler Commands

```bash
# Login to Cloudflare
npx wrangler login

# List R2 buckets
npx wrangler r2 bucket list

# Create R2 bucket
npx wrangler r2 bucket create bucket-name

# Upload to R2
npx wrangler r2 object put bucket-name/path/file.txt --file=local-file.txt

# List R2 objects
npx wrangler r2 object list bucket-name

# List KV namespaces
npx wrangler kv:namespace list

# Create KV namespace
npx wrangler kv:namespace create "NAMESPACE_NAME"

# Deploy to Cloudflare Pages
npx wrangler pages deploy .open-next
```

## Environment Variables

### Set Environment Variable (CMD)
```cmd
# Set for current session
set VARIABLE_NAME=value

# View environment variable
echo %VARIABLE_NAME%

# Set permanently (requires admin)
setx VARIABLE_NAME "value"
```

### Set Environment Variable (PowerShell)
```powershell
# Set for current session
$env:VARIABLE_NAME = "value"

# View environment variable
$env:VARIABLE_NAME

# Set permanently (requires admin)
[System.Environment]::SetEnvironmentVariable("VARIABLE_NAME", "value", "User")
```

## Path Navigation

### CMD
```cmd
# Change directory
cd path\to\directory

# Go to parent directory
cd ..

# Go to root
cd \

# Change drive
D:

# Show current directory
cd

# Go to home directory
cd %USERPROFILE%
```

### PowerShell
```powershell
# Change directory
cd path\to\directory
# or
Set-Location path\to\directory

# Go to parent directory
cd ..

# Go to home directory
cd ~
# or
cd $HOME

# Show current directory
pwd
# or
Get-Location
```

## Process Management

### CMD
```cmd
# List running processes
tasklist

# Kill process by name
taskkill /IM process.exe /F

# Kill process by PID
taskkill /PID 1234 /F
```

### PowerShell
```powershell
# List running processes
Get-Process

# Kill process by name
Stop-Process -Name "process" -Force

# Kill process by PID
Stop-Process -Id 1234 -Force
```

## Network Commands

```cmd
# Check network connectivity
ping google.com

# Check port
netstat -an | findstr :3000

# DNS lookup
nslookup domain.com

# Trace route
tracert domain.com

# Download file (PowerShell)
Invoke-WebRequest -Uri "https://example.com/file.txt" -OutFile "file.txt"
```

## Useful Shortcuts

### CMD
- `Ctrl+C` - Cancel current command
- `Ctrl+V` - Paste (in newer Windows versions)
- `Tab` - Auto-complete file/directory names
- `↑` / `↓` - Navigate command history
- `F7` - Show command history
- `cls` - Clear screen

### PowerShell
- `Ctrl+C` - Cancel current command
- `Ctrl+V` - Paste
- `Tab` - Auto-complete
- `↑` / `↓` - Navigate command history
- `Clear-Host` or `cls` - Clear screen

## Common Pitfalls

### Path Separators
- Windows uses backslash `\` for paths
- Unix uses forward slash `/`
- Node.js/npm usually accepts both

```cmd
# Windows style
cd src\app\admin

# Unix style (also works in most cases)
cd src/app/admin
```

### Command Not Found
If a command is not found, check:
1. Is the program installed?
2. Is it in the PATH?
3. Do you need to use `npx` for npm packages?

```cmd
# Instead of:
wrangler pages deploy

# Use:
npx wrangler pages deploy
```

### Permission Issues
Some commands require administrator privileges:
1. Right-click CMD/PowerShell
2. Select "Run as administrator"

## Quick Reference

| Task | CMD | PowerShell |
|------|-----|------------|
| List files | `dir` | `Get-ChildItem` or `ls` |
| View file | `type file.txt` | `Get-Content file.txt` or `cat file.txt` |
| Copy file | `copy src dst` | `Copy-Item src dst` |
| Delete file | `del file.txt` | `Remove-Item file.txt` |
| Create dir | `mkdir dir` | `New-Item -ItemType Directory dir` |
| Delete dir | `rmdir /s /q dir` | `Remove-Item -Recurse -Force dir` |
| Search text | `findstr /s "text" *.txt` | `Select-String -Path *.txt -Pattern "text"` |
| Clear screen | `cls` | `Clear-Host` or `cls` |
| Command chain | `cmd1 & cmd2` | `cmd1; cmd2` |
