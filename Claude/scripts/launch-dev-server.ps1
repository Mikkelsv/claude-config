param(
    [Parameter(Mandatory)][string]$Project,
    [Parameter(Mandatory)][int]$Port
)

# Launch dev server in a new WT tab with "Dev Server" profile, then refocus original tab
wt -w 0 new-tab --profile "Dev Server" --title "Dev Server" -- dotnet run --project $Project --launch-profile http `; focus-tab -t 0

# Open browser
Start-Process "http://localhost:$Port"

@{
    launched = $true
    url      = "http://localhost:$Port"
} | ConvertTo-Json -Compress
