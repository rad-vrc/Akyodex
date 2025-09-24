Windows PowerShell commands:
- cd C:\Backup\dorad\Documents\Dev\Akyodex
- Start a lightweight server (if needed for fetch of CSV):
  - python -m http.server 8000   (if Python available)
  - Or use VSCode Live Server extension
- Clear local CSV cache: remove-item -Path HKCU:\Software\Microsoft\Internet Explorer\DOMStorage (n/a). Prefer DevTools: localStorage.removeItem('akyoDataCSV')
- Duplicate image IDs detection (3-digit prefix):
  Get-ChildItem .\images -File | Where-Object { $_.Name -match '^(\d{3})' } | ForEach-Object { [PSCustomObject]@{ Id=$Matches[1]; Name=$_.Name } } | Group-Object Id | Where-Object Count -gt 1 | ForEach-Object { [PSCustomObject]@{ Id=$_.Name; Count=$_.Count; Files=($_.Group.Name -join ', ') } } | Sort-Object Id | Format-Table -Auto
- Netlify: Drag & drop the folder in Netlify dashboard or push to Git and connect repo.
