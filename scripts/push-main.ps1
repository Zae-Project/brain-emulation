Param(
  [string]$Branch = "feature/snn-clusters"
)

$envPath = Join-Path (Get-Location) ".env.local"
if (-not (Test-Path $envPath)) {
  Write-Error ".env.local not found. Copy .env.local.example and add GITHUB_TOKEN and GIT_USER."
  exit 1
}

# Load env (simple KEY=VALUE pairs, ignore comments/blank lines)
Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if ([string]::IsNullOrWhiteSpace($line)) { return }
  if ($line.StartsWith('#')) { return }
  if ($line -match '^(?<k>[A-Za-z_][A-Za-z0-9_]*)=(?<v>.*)$') {
    $name = $Matches['k']
    $value = $Matches['v']
    [System.Environment]::SetEnvironmentVariable($name, $value, 'Process') | Out-Null
  }
}

if (-not $env:GITHUB_TOKEN) { Write-Error "GITHUB_TOKEN not set in .env.local"; exit 1 }
if (-not $env:GIT_USER) { Write-Error "GIT_USER not set in .env.local"; exit 1 }

$origin = git remote get-url origin
if ($LASTEXITCODE -ne 0) { Write-Error "Could not read origin remote"; exit 1 }

if ($origin -notmatch '^https://github.com/') { Write-Error "Origin must be an https github URL"; exit 1 }

$authed = $origin -replace 'https://github.com/', "https://$($env:GIT_USER):$($env:GITHUB_TOKEN)@github.com/"

git fetch origin || exit 1
git checkout $Branch || exit 1
git pull --rebase origin $Branch || exit 1

# Rebase onto main, then push
git fetch origin main || exit 1
git rebase origin/main || exit 1

git push $authed HEAD:main || exit 1

Write-Host "Pushed to main successfully." -ForegroundColor Green
