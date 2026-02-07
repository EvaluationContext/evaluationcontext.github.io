$deploymentEnvironment = 'prod'
$tenant_id = '2a1d3328-87c0-4f85-90c6-0bb69b1c4978'

Write-Host $deploymentEnvironment

Write-Host "Installing FabricPS-PBIP.psm1 module"
Import-Module -Name (Join-Path $PWD ".modules" "FabricPS-PBIP.psm1") -Force

Write-Host "Getting SPN Token"
Set-FabricAuthToken -tenantId $tenant_id # -reset
$deploymentManifest = Get-Content '.deploymentManifest.json' | Out-String | ConvertFrom-Json -AsHashtable

Write-Host "Overloading Semantic Model Parameters"
try {
    foreach ( $semanticModel in $deploymentManifest.items.semanticModels.GetEnumerator() ) {
        foreach ( $parameter in $semanticModel.Value.environment[$deploymentEnvironment].parameters.GetEnumerator() ) { 
            $path = $semanticModel.Value.path
            $path = "$pwd/$path"
            Write-Host $path   @{$parameter.Key = $parameter.Value}
            Set-SemanticModelParameters -path $path -Parameter @{$parameter.Key = $parameter.Value}
        }
    }
}
catch {Write-Host "Overload Parameters not found or misformed"}

$workspaceName = $deploymentManifest.repo.environment[$deploymentEnvironment].workspace
$workspace = Get-FabricWorkspace -workspaceName $workspaceName
$workspaceId = $workspace.id
Write-Host "Target Deployment Workspace: $workspaceName ($workspaceId)" -ForegroundColor Green
Write-Host "Deploying Items"
Import-FabricItems -path $PWD -workspaceId $workspaceId