from azure.identity import InteractiveBrowserCredential
from fabric_cicd import FabricWorkspace, publish_all_items
import json

# Authentication
credential = InteractiveBrowserCredential()

# Environment
environment = "dev"

# deploymentManifest
with open("assets\scripts\\0027-fabric-cicd\deploymentManifest.json") as json_data:
    manifest = json.load(json_data)

# Initialize the FabricWorkspace object with the required parameters
target_workspace = FabricWorkspace(
    workspace_id = manifest['repo']['environment'][environment]['workspaceId'],
    environment = environment,
    repository_directory = "assets\scripts\\0027-fabric-cicd\\fabricItems",
    item_type_in_scope = ["SemanticModel", "Report"],
    token_credential = credential,
)

# Publish all items defined in item_type_in_scope
publish_all_items(target_workspace)