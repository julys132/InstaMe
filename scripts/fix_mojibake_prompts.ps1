# Fix mojibake (corrupted) inline promptVariants by replacing them with the valid prompt.txt text.
# Mirrors server-side isLikelyCorruptedPrompt detection so the catalog becomes permanently clean.
$ErrorActionPreference = 'Stop'

$repo = 'C:\Users\stiul\Downloads\InstaPic'
$catalogPath = Join-Path $repo 'assets\instame-style-presets\catalog.json'

function Test-CorruptedPrompt([string]$prompt) {
    $normalized = $prompt.Trim()
    if (-not $normalized) { return $true }
    if ($normalized.Contains([char]0xFFFD)) { return $true }
    if ($normalized.Contains('ï¿½')) { return $true }

    $questionMarks = ([regex]::Matches($normalized, '\?')).Count
    $cyrillic = ([regex]::Matches($normalized, '[\u0400-\u04FF]')).Count

    if ($questionMarks -ge 12 -and $cyrillic -eq 0) { return $true }
    if ($questionMarks -ge 24 -and ($questionMarks / [Math]::Max($normalized.Length, 1)) -gt 0.08) { return $true }
    return $false
}

$catalog = Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json

$fixed = 0
$skippedNoFile = 0
$stillCorrupted = @()

foreach ($preset in $catalog.presets) {
    if (-not $preset.promptVariants) { continue }

    $corruptedVariants = @($preset.promptVariants | Where-Object { Test-CorruptedPrompt $_.prompt })
    if ($corruptedVariants.Count -eq 0) { continue }

    $promptFileRel = $preset.promptFile
    if (-not $promptFileRel) { $skippedNoFile++; $stillCorrupted += $preset.id; continue }

    $promptFileAbs = Join-Path $repo ($promptFileRel -replace '/', '\')
    if (-not (Test-Path -LiteralPath $promptFileAbs)) { $skippedNoFile++; $stillCorrupted += $preset.id; continue }

    $fileText = (Get-Content -LiteralPath $promptFileAbs -Raw -Encoding UTF8).Trim()
    if (-not $fileText -or (Test-CorruptedPrompt $fileText)) {
        $stillCorrupted += $preset.id
        continue
    }

    foreach ($variant in $corruptedVariants) {
        $variant.prompt = $fileText
        $fixed++
    }
}

$catalog.generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$json = $catalog | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($catalogPath, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Fixed variants: $fixed"
Write-Host "Presets without usable prompt file: $skippedNoFile"
if ($stillCorrupted.Count -gt 0) {
    Write-Host "STILL CORRUPTED (need manual attention):"
    $stillCorrupted | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "All corrupted prompts repaired."
}
