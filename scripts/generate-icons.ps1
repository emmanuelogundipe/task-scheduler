# ============================================================
# Generates Odyssey Scheduler PWA icons (PNG) with GDI+.
# Run:  powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
# ============================================================
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\icons"
$publicDir = Join-Path $PSScriptRoot "..\public"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-OdysseyIcon {
  param([int]$Size, [string]$OutPath, [bool]$Maskable)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $bg = [System.Drawing.Color]::FromArgb(5, 150, 105)   # brand-600 #059669
  $bgBrush = New-Object System.Drawing.SolidBrush($bg)

  if ($Maskable) {
    # Full-bleed square so the platform can apply its own mask.
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
  }
  else {
    $r = [int]($Size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
    $path.AddArc($Size - $r * 2, 0, $r * 2, $r * 2, 270, 90)
    $path.AddArc($Size - $r * 2, $Size - $r * 2, $r * 2, $r * 2, 0, 90)
    $path.AddArc(0, $Size - $r * 2, $r * 2, $r * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($bgBrush, $path)
    $path.Dispose()
  }

  $scale = if ($Maskable) { 0.60 } else { 0.78 }
  $cx = $Size / 2.0
  $cy = $Size / 2.0
  $ringR = $Size * $scale * 0.5

  $white = [System.Drawing.Color]::White
  $pen = New-Object System.Drawing.Pen($white, [float]($Size * 0.045))
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawEllipse($pen, [float]($cx - $ringR), [float]($cy - $ringR), [float]($ringR * 2), [float]($ringR * 2))

  # Compass needle (a diamond): bright top half, translucent bottom half.
  $tipTop = New-Object System.Drawing.PointF([float]$cx, [float]($cy - $ringR * 0.80))
  $left = New-Object System.Drawing.PointF([float]($cx - $ringR * 0.34), [float]$cy)
  $right = New-Object System.Drawing.PointF([float]($cx + $ringR * 0.34), [float]$cy)
  $tipBottom = New-Object System.Drawing.PointF([float]$cx, [float]($cy + $ringR * 0.80))

  $wBrush = New-Object System.Drawing.SolidBrush($white)
  $g.FillPolygon($wBrush, @($tipTop, $right, $left))
  $semiBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 255, 255, 255))
  $g.FillPolygon($semiBrush, @($tipBottom, $right, $left))

  # Center hub
  $g.FillEllipse($bgBrush, [float]($cx - $ringR * 0.13), [float]($cy - $ringR * 0.13), [float]($ringR * 0.26), [float]($ringR * 0.26))

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "  wrote $OutPath"
}

Write-Host "Generating Odyssey Scheduler icons..."
New-OdysseyIcon -Size 192 -OutPath (Join-Path $outDir "icon-192.png")            -Maskable $false
New-OdysseyIcon -Size 512 -OutPath (Join-Path $outDir "icon-512.png")            -Maskable $false
New-OdysseyIcon -Size 192 -OutPath (Join-Path $outDir "icon-maskable-192.png")   -Maskable $true
New-OdysseyIcon -Size 512 -OutPath (Join-Path $outDir "icon-maskable-512.png")   -Maskable $true
New-OdysseyIcon -Size 180 -OutPath (Join-Path $publicDir "apple-touch-icon.png") -Maskable $true
New-OdysseyIcon -Size 32  -OutPath (Join-Path $publicDir "favicon-32.png")       -Maskable $false
Write-Host "Done."
