# Incremental import of newly added Instagramable style images (parent numbered folders 1-71)
# Adds any source image not yet present in a preset's examples, sets it as cover/representative,
# attaches the reference portrait circle, and bumps generatedAt. Format-preserving (PS ConvertTo-Json).
$ErrorActionPreference = 'Stop'

$src = 'C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles\Styles Representative Image\Instagramable Styles'
$dest = 'C:\Users\stiul\Downloads\InstaPic\assets\instame-style-presets\styles'
$catalogPath = 'C:\Users\stiul\Downloads\InstaPic\assets\instame-style-presets\catalog.json'
$portraitSrc = Join-Path $src '04.05.26\portret\Screenshot 2026-06-06 084456.png'

if (-not (Test-Path -LiteralPath $portraitSrc)) { throw "Portrait reference not found: $portraitSrc" }

$styleMap = [ordered]@{
  '1'='flash_glove_closeup'; '2'='night_corridor_fashion'; '3'='fashion_portrait_lacquer';
  '4'='mountain_selfie'; '5'='car_selfie_khaki'; '6'='girl_red_dress'; '7'='street_back_denim';
  '8'='bed_lying_cozy'; '9'='embankment_night'; '10'='standing_sunglasses'; '11'='selfie_taking_mirror';
  '12'='curlers_bed_room'; '13'='long_hair_night'; '14'='street_selfie_casual'; '15'='couple_fitting_room';
  '16'='couple_mixed_style'; '17'='woman_and_dog'; '18'='blowing_kiss_selfie'; '20'='bmw_night_drive';
  '21'='face_closeup_flash'; '22'='coffee_street_selfie'; '23'='white_bag_street'; '24'='black_outfit_night';
  '25'='car_selfie_elegant'; '26'='car_ride_casual'; '27'='black_elegant_room'; '28'='leather_outfit_street';
  '29'='pink_outfit_room'; '30'='milk_bath_portrait'; '31'='wide_pants_street'; '32'='modern_outfit_room';
  '33'='lying_bed_dark'; '34'='lying_sofa_cozy'; '35'='lying_bed_bright'; '36'='mirror_selfie_dark';
  '37'='fashion_portrait_studio'; '38'='sitting_chair_room'; '39'='sitting_cafe_style'; '40'='sitting_steps_street';
  '41'='sitting_bench_park'; '42'='sitting_floor_room'; '43'='standing_near_wall'; '44'='mirror_selfie_store';
  '45'='young_sitting_street'; '46'='airport_selfie'; '47'='bathroom_selfie'; '48'='selfie_night_flash';
  '49'='sitting_bag_street'; '50'='street_woman_walk'; '51'='sitting_outdoor_cafe'; '52'='tulips_portrait';
  '53'='mom_two_kids'; '54'='young_girl_sitting'; '55'='mom_hugging_son'; '56'='standing_bridge_night';
  '57'='breakfast_selfie'; '58'='selfie_room_mirror'; '59'='foam_bath_selfie'; '60'='long_hair_closeup';
  '61'='selfie_mirror_casual'; '62'='fur_coat_night'; '63'='car_girl_night'; '64'='posing_studio_young';
  '65'='noir_portrait_dark'; '66'='young_woman_outfit'; '67'='roses_portrait'; '68'='car_portrait_luxury';
  '69'='studio_portrait_soft'; '70'='selfie_mirror_flash'; '71'='covering_face_street';
}

$catalog = Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json

$updated = 0
$report = @()

foreach ($num in $styleMap.Keys) {
  $styleId = $styleMap[$num]
  $srcFolder = Join-Path $src $num
  if (-not (Test-Path -LiteralPath $srcFolder)) { continue }

  $preset = $catalog.presets | Where-Object { $_.id -eq $styleId } | Select-Object -First 1
  if (-not $preset) { Write-Host "NO PRESET for folder $num -> $styleId"; continue }

  $existingBasenames = @()
  foreach ($ex in $preset.examples) { $existingBasenames += (Split-Path $ex -Leaf) }

  $srcImages = Get-ChildItem -LiteralPath $srcFolder -File | Where-Object { $_.Extension -in '.jpeg','.jpg','.png' }
  $newImages = $srcImages | Where-Object { $existingBasenames -notcontains $_.Name } | Sort-Object Name
  if ($newImages.Count -eq 0) { continue }

  $destFolder = Join-Path $dest $styleId
  if (-not (Test-Path -LiteralPath $destFolder)) { New-Item -ItemType Directory -Path $destFolder -Force | Out-Null }

  foreach ($img in $newImages) {
    Copy-Item -LiteralPath $img.FullName -Destination (Join-Path $destFolder $img.Name) -Force
  }
  Copy-Item -LiteralPath $portraitSrc -Destination (Join-Path $destFolder '__source_portrait.png') -Force

  $newRel = @()
  foreach ($img in $newImages) { $newRel += "assets/instame-style-presets/styles/$styleId/$($img.Name)" }

  $combined = @()
  $combined += $newRel
  $combined += $preset.examples
  $seen = @{}
  $deduped = @()
  foreach ($e in $combined) { if ($e -and -not $seen.ContainsKey($e)) { $seen[$e] = $true; $deduped += $e } }

  $preset.examples = $deduped
  $preset.cover = $newRel[0]
  $preset.representativeImage = $newRel[0]

  $portraitRel = "assets/instame-style-presets/styles/$styleId/__source_portrait.png"
  if ($preset.PSObject.Properties.Name -contains 'sourcePortrait') {
    $preset.sourcePortrait = $portraitRel
  } else {
    $preset | Add-Member -NotePropertyName sourcePortrait -NotePropertyValue $portraitRel
  }

  $updated++
  $report += "${styleId}: +$($newImages.Count) new (total examples $($deduped.Count))"
}

$catalog.generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$json = $catalog | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($catalogPath, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "=== Updated $updated presets ==="
$report | ForEach-Object { Write-Host "  $_" }
