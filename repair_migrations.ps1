$files = Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name
foreach ($file in $files) {
    if ($file.Name -like "103_*") {
        Write-Host "Skipping new migration: $($file.Name)"
        continue
    }

    $version = $file.Name.Split('_')[0]
    Write-Host "Marking $version ($($file.Name)) as applied..."
    
    # Run the repair command
    # We capture output to prevent filling the buffer, but check exit code?
    # Trying to simply run it.
    cmd /c "npx supabase migration repair --status applied $version"
}
