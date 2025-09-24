Param(
    [string]$ImagesDir = "images",
    [string]$Output = "images/manifest.json",
    [switch]$FullUrl,
    [string]$BaseUrl = "https://images.akyodex.com/images"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    $repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $imagesPath = Join-Path $repoRoot $ImagesDir
    $outputPath = Join-Path $repoRoot $Output

    if (-not (Test-Path $imagesPath)) { throw "Images directory not found: $imagesPath" }
    $outDir = Split-Path -Parent $outputPath
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

    $files = Get-ChildItem -Path $imagesPath -File -Include *.webp,*.png,*.jpg,*.jpeg | Sort-Object Name

    $map = @{}
    foreach ($f in $files) {
        if ($f.Name -match '^(\d{3})') {
            $id3 = $Matches[1]
            if (-not $map.ContainsKey($id3)) {
                if ($FullUrl) {
                    $map[$id3] = "$BaseUrl/$($f.Name)"
                } else {
                    $map[$id3] = $f.Name
                }
            }
        }
    }

    $version = (Get-Date).ToString('yyyyMMdd-HHmmss')
    $jsonObj = [ordered]@{
        version = $version
        map = $map
    }

    $json = $jsonObj | ConvertTo-Json -Depth 8
    $json | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "Manifest written: $outputPath (items=$($map.Keys.Count), version=$version)"
}
catch {
    Write-Error $_
    exit 1
}
