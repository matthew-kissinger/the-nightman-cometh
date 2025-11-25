# Audio Encoding Script
# Converts WAV files to properly formatted OGG using ffmpeg with libvorbis

$audioDir = "C:\Users\Mattm\X\the-nightman-cometh\public\assets\audio"
$outputDir = "$audioDir\optimized"

# Ensure output directories exist
$categories = @("ambient", "combat", "environment", "items", "player", "transformation", "nightman")
foreach ($cat in $categories) {
    $catDir = "$outputDir\$cat"
    if (!(Test-Path $catDir)) {
        New-Item -ItemType Directory -Path $catDir -Force | Out-Null
    }
}

# File mappings: source WAV -> category/output name
$mappings = @{
    # Combat
    "Dry_click_of_empty_s_#2-1763683111170.wav" = "combat/shotgun_empty.ogg"
    "Fast_whoosh_sound_of_#3-1763683219815.wav" = "combat/hatchet_swing.ogg"
    "Heavy_double-barrel__#2-1763683055686.wav" = "combat/shotgun_fire.ogg"
    "Shotgun_shell_loadin_#1-1763683158583.wav" = "combat/shotgun_reload.ogg"

    # Environment
    "Door_handle_rattling_#2-1763684186572.wav" = "environment/door_rattle.ogg"
    "Heavy_pounding_on_wo_#4-1763684029508.wav" = "environment/door_pound.ogg"
    "Light_tapping_on_woo_#2-1763683991424.wav" = "environment/door_tap.ogg"
    "Massive_impact_on_wo_#1-1763684246255.wav" = "environment/door_massive_impact.ogg"
    "Sharp_claws_scratchi_#1-1763684067918.wav" = "environment/door_scratch.ogg"
    "Wood_door_splinterin_#4-1763684274266.wav" = "environment/door_splinter.ogg"
    "wooden_board_shatter_#2-1763684119044.wav" = "environment/board_shatter.ogg"

    # Items
    "Hammering_nail_into__#3-1763684400437.wav" = "items/board_hammer.ogg"
    "pickup_ammo_sound_#1-1763684347169.wav" = "items/pickup_ammo.ogg"
    "tree_falls_down_quic_#2-1763683271220.wav" = "items/tree_fall.ogg"
    "wood_pickup_sound_#2-1763684367832.wav" = "items/pickup_wood.ogg"

    # Player
    "Male_death_scream_fa_#4-1763684477796.wav" = "player/player_death.ogg"
    "Male_grunt_of_pain,__#2-1763684423615.wav" = "player/player_hurt_light.ogg"
    "Male_scream_of_agony_#2-1763684450948.wav" = "player/player_hurt_heavy.ogg"
    "Realistic_heartbeat__#1-1763684522415.wav" = "player/player_heartbeat.ogg"

    # Transformation
    "Dark_ethereal_whoosh_#2-1763683876072.wav" = "transformation/transform_whoosh.ogg"
    "Final_massive_bone_r_#3-1763683841953.wav" = "transformation/transform_bones_final.ogg"
    "Multiple_bones_break_#3-1763683811146.wav" = "transformation/transform_bones_break.ogg"
    "Ominous_low_rumble_w_#4-1763683913346.wav" = "transformation/transform_rumble.ogg"
    "Wet_bone_snapping_an_#3-1763683777763.wav" = "transformation/transform_bones_snap.ogg"

    # Nightman (monster sounds)
    "Deep_guttural_monste_#4-1763683426669.wav" = "nightman/nightman_growl.ogg"
    "Heavy_human-sized_fo_#2-1763683393491.wav" = "nightman/nightman_footsteps.ogg"
    "Heavy_impact_of_mons_#3-1763683663265.wav" = "nightman/nightman_impact.ogg"
    "Massive_creature_arm_#2-1763683621031.wav" = "nightman/nightman_arm_swing.ogg"
    "Massive_creature_dyi_#2-1763683738671.wav" = "nightman/nightman_death.ogg"
    "Massive_creature_foo_#1-1763683353068.wav" = "nightman/nightman_stomp.ogg"
    "Monster_pain_roar,_a_#2-1763683706293.wav" = "nightman/nightman_pain.ogg"
    "guttural_demon_hunti_#4-1763683577323.wav" = "nightman/nightman_hunt.ogg"

    # Ambient (re-encode existing)
    "stepdirt_1.wav" = "ambient/stepdirt_1.ogg"
    "stepdirt_2.wav" = "ambient/stepdirt_2.ogg"
    "stepwood_1.wav" = "ambient/stepwood_1.ogg"
    "stepwood_2.wav" = "ambient/stepwood_2.ogg"
}

Write-Host "Starting audio encoding..." -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($mapping in $mappings.GetEnumerator()) {
    $inputFile = "$audioDir\$($mapping.Key)"
    $outputFile = "$outputDir\$($mapping.Value)"

    if (Test-Path $inputFile) {
        Write-Host "  Encoding: $($mapping.Key) -> $($mapping.Value)" -ForegroundColor Gray

        # Use ffmpeg with libvorbis for proper OGG encoding
        # -ar 44100: Sample rate 44.1kHz (standard)
        # -ac 2: Stereo (or keep original channels)
        # -q:a 5: Quality 5 (good quality, ~160kbps)
        $result = & ffmpeg -y -i $inputFile -c:a libvorbis -ar 44100 -q:a 5 $outputFile 2>&1

        if ($LASTEXITCODE -eq 0) {
            $successCount++
            Write-Host "    [OK]" -ForegroundColor Green
        } else {
            $failCount++
            Write-Host "    [FAIL]: $result" -ForegroundColor Red
        }
    } else {
        Write-Host "  [SKIP] Not found: $($mapping.Key)" -ForegroundColor Yellow
    }
}

# Also copy/encode the OGG ambient files that exist
$existingOggs = @(
    "forest_night_loop.ogg",
    "wind_trees.ogg"
)

foreach ($ogg in $existingOggs) {
    $inputFile = "$audioDir\$ogg"
    $outputFile = "$outputDir\ambient\$ogg"

    if (Test-Path $inputFile) {
        # Re-encode to ensure proper format
        Write-Host "  Re-encoding: $ogg" -ForegroundColor Gray
        $result = & ffmpeg -y -i $inputFile -c:a libvorbis -ar 44100 -q:a 5 $outputFile 2>&1

        if ($LASTEXITCODE -eq 0) {
            $successCount++
            Write-Host "    [OK]" -ForegroundColor Green
        } else {
            $failCount++
            Write-Host "    [FAIL]" -ForegroundColor Red
        }
    }
}

# Also encode the door open/close sounds
$doorSounds = @(
    @{ input = "qubodup-DoorOpen08.ogg"; output = "environment/qubodup-DoorOpen08.ogg" }
    @{ input = "qubodup-DoorClose08.ogg"; output = "environment/qubodup-DoorClose08.ogg" }
)

foreach ($sound in $doorSounds) {
    $inputFile = "$audioDir\$($sound.input)"
    $outputFile = "$outputDir\$($sound.output)"

    if (Test-Path $inputFile) {
        Write-Host "  Re-encoding: $($sound.input)" -ForegroundColor Gray
        $result = & ffmpeg -y -i $inputFile -c:a libvorbis -ar 44100 -q:a 5 $outputFile 2>&1

        if ($LASTEXITCODE -eq 0) {
            $successCount++
            Write-Host "    [OK]" -ForegroundColor Green
        } else {
            $failCount++
            Write-Host "    [FAIL]" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Encoding complete!" -ForegroundColor Cyan
Write-Host "   Success: $successCount" -ForegroundColor Green
Write-Host "   Failed: $failCount" -ForegroundColor Red
