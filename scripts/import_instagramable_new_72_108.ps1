# Import NEW Instagramable styles (parent folders 72-108) into the catalog.
# Mirrors the preset shape of the 1-71 import + sourcePortrait + category.
$ErrorActionPreference = 'Stop'

$src = 'C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles\Styles Representative Image\Instagramable Styles'
$dest = 'C:\Users\stiul\Downloads\InstaPic\assets\instame-style-presets\styles'
$catalogPath = 'C:\Users\stiul\Downloads\InstaPic\assets\instame-style-presets\catalog.json'
$portraitSrc = Join-Path $src '04.05.26\portret\Screenshot 2026-06-06 084456.png'

if (-not (Test-Path -LiteralPath $portraitSrc)) { throw "Portrait reference not found: $portraitSrc" }

$styleMap = [ordered]@{
  '72'  = @{ id='studio_black_white';       label='Studio Black White' }
  '73'  = @{ id='leather_jacket_parking';   label='Leather Jacket Parking' }
  '74'  = @{ id='towel_poolside_sitting';   label='Towel Poolside Sitting' }
  '75'  = @{ id='iphone_mirror_selfie';     label='iPhone Mirror Selfie' }
  '76'  = @{ id='suit_with_flowers';        label='Suit With Flowers' }
  '77'  = @{ id='restaurant_seated';        label='Restaurant Seated' }
  '78'  = @{ id='sitting_outside_store';    label='Sitting Outside Store' }
  '79'  = @{ id='hibiscus_portrait';        label='Hibiscus Portrait' }
  '81'  = @{ id='selfie_with_roses';        label='Selfie With Roses' }
  '82'  = @{ id='exiting_luxury_car';       label='Exiting Luxury Car' }
  '84'  = @{ id='corset_portrait';          label='Corset Portrait' }
  '85'  = @{ id='dress_selfie_collage';     label='Dress Selfie Collage' }
  '86'  = @{ id='makeup_restaurant';        label='Makeup Restaurant' }
  '87'  = @{ id='standing_street_chic';     label='Standing Street Chic' }
  '88'  = @{ id='crouching_street';         label='Crouching Street' }
  '89'  = @{ id='sitting_on_deck';          label='Sitting On Deck' }
  '90'  = @{ id='balcony_cigarette';        label='Balcony Cigarette' }
  '91'  = @{ id='holding_bouquet';          label='Holding Bouquet' }
  '92'  = @{ id='paris_balcony';            label='Paris Balcony' }
  '93'  = @{ id='stone_staircase';          label='Stone Staircase' }
  '94'  = @{ id='woman_with_roses';         label='Woman With Roses' }
  '95'  = @{ id='sitting_floor_chic';       label='Sitting Floor Chic' }
  '96'  = @{ id='restaurant_table_girl';    label='Restaurant Table Girl' }
  '97'  = @{ id='convertible_by_sea';       label='Convertible By Sea' }
  '98'  = @{ id='lilacs_in_car';            label='Lilacs In Car' }
  '99'  = @{ id='cafe_terrace_sitting';     label='Cafe Terrace Sitting' }
  '100' = @{ id='cafe_terrace_standing';    label='Cafe Terrace Standing' }
  '101' = @{ id='car_wash_foam';            label='Car Wash Foam' }
  '102' = @{ id='woman_and_lion';           label='Woman And Lion' }
  '103' = @{ id='restaurant_restroom';      label='Restaurant Restroom' }
  '104' = @{ id='selfie_in_mirror';         label='Selfie In Mirror' }
  '105' = @{ id='closeup_white_pink';       label='Closeup White Pink' }
  '106' = @{ id='grey_suit_white';          label='Grey Suit White' }
  '107' = @{ id='car_interior_portrait';    label='Car Interior Portrait' }
  '108' = @{ id='night_city_selfie';        label='Night City Selfie' }
}

$catalog = Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json

# Guard against id collisions with existing presets
$existingIds = @{}
foreach ($p in $catalog.presets) { $existingIds[$p.id] = $true }
foreach ($num in $styleMap.Keys) {
  $id = $styleMap[$num].id
  if ($existingIds.ContainsKey($id)) { throw "ID collision: $id (folder $num) already exists in catalog" }
}

function Get-ImageTimestamp([string]$baseName) {
  if ($baseName -match '_(\d{12})') { return [long]$Matches[1] }
  return 0L
}

$newPresets = @()
$report = @()

foreach ($num in $styleMap.Keys) {
  $info = $styleMap[$num]
  $styleId = $info.id
  $styleLabel = $info.label

  $srcFolder = Join-Path $src $num
  if ($num -eq '91') { $srcFolder = Join-Path $src '91\91' }
  if (-not (Test-Path -LiteralPath $srcFolder)) { Write-Host "SKIP missing folder $num"; continue }

  $allFiles = Get-ChildItem -LiteralPath $srcFolder -File
  $images = $allFiles | Where-Object { $_.Extension -in '.jpeg','.jpg','.png' }
  if ($images.Count -eq 0) { Write-Host "SKIP folder $num (no images)"; continue }

  # Newest (by filename timestamp) first -> cover
  $images = $images | Sort-Object { Get-ImageTimestamp($_.BaseName) } -Descending

  $promptFileSrc = $allFiles | Where-Object { $_.Name -match '(?i)^prompt\.txt$' } | Select-Object -First 1
  $promptText = ''
  if ($promptFileSrc) {
    $promptText = (Get-Content -LiteralPath $promptFileSrc.FullName -Raw -Encoding UTF8).Trim()
    # Strip Telegram-markdown escape backslashes before punctuation
    $promptText = $promptText -replace '\\([\.\-\(\)\[\]_!#+=|{}>])', '$1'
  }

  $destFolder = Join-Path $dest $styleId
  if (-not (Test-Path -LiteralPath $destFolder)) { New-Item -ItemType Directory -Path $destFolder -Force | Out-Null }

  foreach ($img in $images) {
    Copy-Item -LiteralPath $img.FullName -Destination (Join-Path $destFolder $img.Name) -Force
  }
  if ($promptFileSrc) {
    [System.IO.File]::WriteAllText((Join-Path $destFolder 'prompt.txt'), $promptText, (New-Object System.Text.UTF8Encoding($false)))
  }
  Copy-Item -LiteralPath $portraitSrc -Destination (Join-Path $destFolder '__source_portrait.png') -Force

  $examplesArr = @()
  foreach ($img in $images) { $examplesArr += "assets/instame-style-presets/styles/$styleId/$($img.Name)" }
  $coverPath = $examplesArr[0]

  $preset = [ordered]@{
    id = $styleId
    label = $styleLabel
    subtitle = 'Instagramable style preset'
    promptHint = $styleLabel
    cover = $coverPath
    representativeImage = $coverPath
    examples = $examplesArr
    promptFile = "assets/instame-style-presets/styles/$styleId/prompt.txt"
    promptVariants = @(
      [ordered]@{
        id = 'prompt_1'
        label = 'Prompt 1'
        prompt = $promptText
        requestedModels = @(
          [ordered]@{
            provider = 'together'
            model = 'google/flash-image-3.1'
            displayName = 'Gemini 3.1 Flash Image'
          }
        )
      }
    )
    promptOnlyAfterFirstUse = $false
    category = 'women'
    sourcePortrait = "assets/instame-style-presets/styles/$styleId/__source_portrait.png"
  }

  $newPresets += [pscustomobject]$preset
  $report += "${num} -> ${styleId} ($($images.Count) images)"
}

$allPresets = @($newPresets) + @($catalog.presets)
$catalog.presets = $allPresets
if ($catalog.PSObject.Properties.Name -contains 'presetCount') { $catalog.presetCount = $allPresets.Count }
$catalog.generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

$json = $catalog | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($catalogPath, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "=== Added $($newPresets.Count) new presets (total $($allPresets.Count)) ==="
$report | ForEach-Object { Write-Host "  $_" }
