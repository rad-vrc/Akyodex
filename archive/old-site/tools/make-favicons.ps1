param(
  [string]$Source = "C:\\Backup\\dorad\\Documents\\Dev\\Akyodex\\images\\logo-200.png",
  [string]$OutDir = "C:\\Backup\\dorad\\Documents\\Dev\\Akyodex\\images"
)

Add-Type -AssemblyName System.Drawing

function Resize-Save {
  param(
    [string]$Src,
    [string]$Dest,
    [int]$W,
    [int]$H
  )
  $img = [System.Drawing.Image]::FromFile($Src)
  try {
    $bmp = New-Object System.Drawing.Bitmap $W, $H
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $rect = New-Object System.Drawing.Rectangle 0,0,$W,$H
    $gfx.DrawImage($img, $rect)
    $bmp.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    if ($gfx) { $gfx.Dispose() }
    if ($bmp) { $bmp.Dispose() }
    if ($img) { $img.Dispose() }
  }
}

Resize-Save -Src $Source -Dest (Join-Path $OutDir 'favicon-16.png') -W 16 -H 16
Resize-Save -Src $Source -Dest (Join-Path $OutDir 'favicon-32.png') -W 32 -H 32
Resize-Save -Src $Source -Dest (Join-Path $OutDir 'apple-touch-icon-180.png') -W 180 -H 180
