# Import Instagramable Styles into InstaPic catalog
$ErrorActionPreference = 'Stop'

$src = 'C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles\Styles Representative Image\Instagramable Styles'
$dest = 'C:\Users\stiul\Downloads\InstaPic\assets\instame-style-presets\styles'
$catalogPath = 'C:\Users\stiul\Downloads\InstaPic\assets\instame-style-presets\catalog.json'

# Style naming map: folder number -> (id, label)
$styleMap = @{}
$styleMap['1']  = @{ id='flash_glove_closeup';     label='Flash Glove Closeup' }
$styleMap['2']  = @{ id='night_corridor_fashion';   label='Night Corridor Fashion' }
$styleMap['3']  = @{ id='fashion_portrait_lacquer';  label='Fashion Portrait Lacquer' }
$styleMap['4']  = @{ id='mountain_selfie';           label='Mountain Selfie' }
$styleMap['5']  = @{ id='car_selfie_khaki';          label='Car Selfie Khaki' }
$styleMap['6']  = @{ id='girl_red_dress';            label='Girl Red Dress' }
$styleMap['7']  = @{ id='street_back_denim';         label='Street Back Denim' }
$styleMap['8']  = @{ id='bed_lying_cozy';            label='Bed Lying Cozy' }
$styleMap['9']  = @{ id='embankment_night';          label='Embankment Night' }
$styleMap['10'] = @{ id='standing_sunglasses';       label='Standing Sunglasses' }
$styleMap['11'] = @{ id='selfie_taking_mirror';      label='Selfie Taking Mirror' }
$styleMap['12'] = @{ id='curlers_bed_room';          label='Curlers Bed Room' }
$styleMap['13'] = @{ id='long_hair_night';           label='Long Hair Night' }
$styleMap['14'] = @{ id='street_selfie_casual';      label='Street Selfie Casual' }
$styleMap['15'] = @{ id='couple_fitting_room';       label='Couple Fitting Room' }
$styleMap['16'] = @{ id='couple_mixed_style';        label='Couple Mixed Style' }
$styleMap['17'] = @{ id='woman_and_dog';             label='Woman And Dog' }
$styleMap['18'] = @{ id='blowing_kiss_selfie';       label='Blowing Kiss Selfie' }
$styleMap['20'] = @{ id='bmw_night_drive';           label='BMW Night Drive' }
$styleMap['21'] = @{ id='face_closeup_flash';        label='Face Closeup Flash' }
$styleMap['22'] = @{ id='coffee_street_selfie';      label='Coffee Street Selfie' }
$styleMap['23'] = @{ id='white_bag_street';          label='White Bag Street' }
$styleMap['24'] = @{ id='black_outfit_night';        label='Black Outfit Night' }
$styleMap['25'] = @{ id='car_selfie_elegant';        label='Car Selfie Elegant' }
$styleMap['26'] = @{ id='car_ride_casual';           label='Car Ride Casual' }
$styleMap['27'] = @{ id='black_elegant_room';        label='Black Elegant Room' }
$styleMap['28'] = @{ id='leather_outfit_street';     label='Leather Outfit Street' }
$styleMap['29'] = @{ id='pink_outfit_room';          label='Pink Outfit Room' }
$styleMap['30'] = @{ id='milk_bath_portrait';        label='Milk Bath Portrait' }
$styleMap['31'] = @{ id='wide_pants_street';         label='Wide Pants Street' }
$styleMap['32'] = @{ id='modern_outfit_room';        label='Modern Outfit Room' }
$styleMap['33'] = @{ id='lying_bed_dark';            label='Lying Bed Dark' }
$styleMap['34'] = @{ id='lying_sofa_cozy';           label='Lying Sofa Cozy' }
$styleMap['35'] = @{ id='lying_bed_bright';          label='Lying Bed Bright' }
$styleMap['36'] = @{ id='mirror_selfie_dark';        label='Mirror Selfie Dark' }
$styleMap['37'] = @{ id='fashion_portrait_studio';   label='Fashion Portrait Studio' }
$styleMap['38'] = @{ id='sitting_chair_room';        label='Sitting Chair Room' }
$styleMap['39'] = @{ id='sitting_cafe_style';        label='Sitting Cafe Style' }
$styleMap['40'] = @{ id='sitting_steps_street';      label='Sitting Steps Street' }
$styleMap['41'] = @{ id='sitting_bench_park';        label='Sitting Bench Park' }
$styleMap['42'] = @{ id='sitting_floor_room';        label='Sitting Floor Room' }
$styleMap['43'] = @{ id='standing_near_wall';        label='Standing Near Wall' }
$styleMap['44'] = @{ id='mirror_selfie_store';       label='Mirror Selfie Store' }
$styleMap['45'] = @{ id='young_sitting_street';      label='Young Sitting Street' }
$styleMap['46'] = @{ id='airport_selfie';            label='Airport Selfie' }
$styleMap['47'] = @{ id='bathroom_selfie';           label='Bathroom Selfie' }
$styleMap['48'] = @{ id='selfie_night_flash';        label='Selfie Night Flash' }
$styleMap['49'] = @{ id='sitting_bag_street';        label='Sitting Bag Street' }
$styleMap['50'] = @{ id='street_woman_walk';         label='Street Woman Walk' }
$styleMap['51'] = @{ id='sitting_outdoor_cafe';      label='Sitting Outdoor Cafe' }
$styleMap['52'] = @{ id='tulips_portrait';           label='Tulips Portrait' }
$styleMap['53'] = @{ id='mom_two_kids';              label='Mom Two Kids' }
$styleMap['54'] = @{ id='young_girl_sitting';        label='Young Girl Sitting' }
$styleMap['55'] = @{ id='mom_hugging_son';           label='Mom Hugging Son' }
$styleMap['56'] = @{ id='standing_bridge_night';     label='Standing Bridge Night' }
$styleMap['57'] = @{ id='breakfast_selfie';          label='Breakfast Selfie' }
$styleMap['58'] = @{ id='selfie_room_mirror';        label='Selfie Room Mirror' }
$styleMap['59'] = @{ id='foam_bath_selfie';          label='Foam Bath Selfie' }
$styleMap['60'] = @{ id='long_hair_closeup';         label='Long Hair Closeup' }
$styleMap['61'] = @{ id='selfie_mirror_casual';      label='Selfie Mirror Casual' }
$styleMap['62'] = @{ id='fur_coat_night';            label='Fur Coat Night' }
$styleMap['63'] = @{ id='car_girl_night';            label='Car Girl Night' }
$styleMap['64'] = @{ id='posing_studio_young';       label='Posing Studio Young' }
$styleMap['65'] = @{ id='noir_portrait_dark';        label='Noir Portrait Dark' }
$styleMap['66'] = @{ id='young_woman_outfit';        label='Young Woman Outfit' }
$styleMap['67'] = @{ id='roses_portrait';            label='Roses Portrait' }
$styleMap['68'] = @{ id='car_portrait_luxury';       label='Car Portrait Luxury' }
$styleMap['69'] = @{ id='studio_portrait_soft';      label='Studio Portrait Soft' }
$styleMap['70'] = @{ id='selfie_mirror_flash';       label='Selfie Mirror Flash' }
$styleMap['71'] = @{ id='covering_face_street';      label='Covering Face Street' }

Write-Host "=== Step 1: Creating style folders and copying files ==="

$newPresets = @()
$sortedKeys = $styleMap.Keys | Sort-Object { [int]$_ }

foreach ($num in $sortedKeys) {
    $info = $styleMap[$num]
    $styleId = $info.id
    $styleLabel = $info.label
    $srcFolder = Join-Path $src $num
    $destFolder = Join-Path $dest $styleId

    if (-not (Test-Path $srcFolder)) {
        Write-Host "SKIP: Source folder $num not found"
        continue
    }

    # Create destination folder
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }

    # Copy all files
    $allFiles = Get-ChildItem $srcFolder -File
    foreach ($f in $allFiles) {
        Copy-Item $f.FullName -Destination $destFolder -Force
    }

    # Get image files and prompt
    $images = $allFiles | Where-Object { $_.Extension -in '.jpeg','.jpg','.png' }
    $promptFile = $allFiles | Where-Object { $_.Name -match '(?i)prompt\.txt' } | Select-Object -First 1
    $promptText = ""
    if ($promptFile) {
        $promptText = Get-Content $promptFile.FullName -Raw -Encoding UTF8
        $promptText = $promptText.Trim()
    }

    $firstImage = $images[0].Name
    $coverPath = "assets/instame-style-presets/styles/$styleId/$firstImage"

    # Build examples array
    $examplesArr = @()
    foreach ($img in $images) {
        $examplesArr += "assets/instame-style-presets/styles/$styleId/$($img.Name)"
    }

    # Build preset object
    $preset = [ordered]@{
        id = $styleId
        label = $styleLabel
        subtitle = "Instagramable style preset"
        promptHint = $styleLabel
        cover = $coverPath
        representativeImage = $coverPath
        examples = $examplesArr
        promptFile = "assets/instame-style-presets/styles/$styleId/prompt.txt"
        promptVariants = @(
            [ordered]@{
                id = "prompt_1"
                label = "Prompt 1"
                prompt = $promptText
                requestedModels = @(
                    [ordered]@{
                        provider = "together"
                        model = "google/flash-image-3.1"
                        displayName = "Gemini 3.1 Flash Image"
                    }
                )
            }
        )
        promptOnlyAfterFirstUse = $false
    }

    $newPresets += $preset
    Write-Host "OK: $num -> $styleId ($($images.Count) images)"
}

Write-Host ""
Write-Host "=== Step 2: Updating catalog.json ==="

# Read existing catalog
$catalog = Get-Content $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json

# Convert existing presets to a list we can work with
$existingPresets = @()
foreach ($p in $catalog.presets) {
    $existingPresets += $p
}

# Build new presets list: new styles FIRST, then existing
$allPresets = $newPresets + $existingPresets

# Update catalog
$newCatalog = [ordered]@{
    generatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.ffffffzzz")
    sourceFolder = $src
    presetCount = $allPresets.Count
    presets = $allPresets
}

$json = $newCatalog | ConvertTo-Json -Depth 10
# Write with UTF8 no BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($catalogPath, $json, $utf8NoBom)

Write-Host "Catalog updated: $($allPresets.Count) total presets ($($newPresets.Count) new + $($existingPresets.Count) existing)"
Write-Host "DONE!"
