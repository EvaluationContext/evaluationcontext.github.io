---
title: Fabric-cicd, Kicking the tyres
description: Open Source Python Library for Fabric Deployments
author: duddy
date: 2025-05-07 18:30:00 +0000
categories: [PBIP, deployment]
tags: [pbip, fabric-cicd, deployment]
pin: false
image:
  path: /assets/img/0027-fabric-cicd/fabric-cicd.png
  alt: Font Awesome
---

[Fabric-cicd](https://microsoft.github.io/fabric-cicd/latest/), is a open source Python library designed to streamline Continuous Deployment workflows within Microsoft Fabric. It offers a clean abstraction on top of the on top of the [Fabric APIs](https://learn.microsoft.com/en-us/rest/api/fabric/articles/) allowing you to easily deploy your Source Controlled Fabric items. Let's take a look.

## Fabric-cicd

[Fabric-cicd](https://microsoft.github.io/fabric-cicd/latest/) is a python library designed to deploy Fabric Items to Fabric workspaces. When [Power BI Projects (PBIP)](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview) were released last year, the project team provided a [Powershell script](https://github.com/microsoft/Analysis-Services/tree/master/pbidevmode/fabricps-pbip) to help deploy them. I have been successfully using this script for the last year. Both the PowerShell script and Fabric-cicd are wrapper on the [Create Item](https://learn.microsoft.com/en-us/rest/api/fabric/core/items/create-item?tabs=HTTP) and [Update Item Definition](https://learn.microsoft.com/en-us/rest/api/fabric/core/items/update-item-definition?tabs=HTTP) Fabric APIs. Personally, I am more partial to python, so this new library piqued my interest.

Of note, [Kevin Chant](https://www.linkedin.com/in/kevin-chant/) has produced a range of [blog posts](https://www.kevinrchant.com/2025/02/27/initial-tests-of-fabric-cicd/) on this library that are worth looking at, including some example Github and Azure DevOps pipelines.

Fabric-cicd currently supports the deployment of:
- DataPipeline
- Environment
- Notebook
- Report
- SemanticModel
- Lakehouse
- MirroredDatabase
- VariableLibrary

### Setup

You can install fabric-cicd via:

```python
pip install fabric-cicd
```

The following folder structure below is expected. 

```txt
├── 📁 fabricItems
│    ├── 📁 test.SemanticModel
│    ├── 📁 test.Report
│    └── 📄 parameter.yml           # *optional* find and replace text in files 
├── 📄 deployment.py                # script to call fabric-cicd
└── 📄 .gitignore
```

Firstly we'll add a test Power BI Project file to the `fabricItems`{:. txt} folder.

`parameter.yml`{:. txt} can be use to find and replace any value in your files. If you provide a `environment`{:. txt} variable in your `FabricWorkspace()`{:. txt} definition you can replace specific values for test vs prod. This provides alot of flexibility, but it feels like for general variables you want to change by default, you might want a more well defined and concise structure that improves the readability of the repo. I like pbitools use of a json file to adjust properties, but yaml might also be a good option. I am going to add a `deploymentManifest.json`{:. txt} to define the Workspace name to deploy to, based on a Environment name.

```diff
 ├── 📁 fabricItems
 │    ├── 📁 test.SemanticModel
 │    ├── 📁 test.Report
 │    └── 📄 parameter.yml
 ├── 📄 deployment.py
+├── 📄 deploymentManifest.json
 └── 📄 .gitignore
```

For now I'll just set all environments to deploy to the same workspace.

```json
{
  "repo": {
    "environment": {
      "dev": {"workspace": "fabric-cicd", "workspaceId": "c01092c3-7f18-4488-840b-34b5764ecfcb"},
      "uat": {"workspace": "fabric-cicd", "workspaceId": "c01092c3-7f18-4488-840b-34b5764ecfcb"},
      "prod": {"workspace": "fabric-cicd", "workspaceId": "c01092c3-7f18-4488-840b-34b5764ecfcb"}
    }
  }
}
```

We can now define our deployment script in `deployment.py`{:. txt}.

```python
from azure.identity import InteractiveBrowserCredential
from fabric_cicd import FabricWorkspace, publish_all_items
import json

# Authentication
credential = InteractiveBrowserCredential() # To use another auth method if not testing locally https://microsoft.github.io/fabric-cicd/latest/example/authentication/

# Environment
environment = "dev" # To be passed from pipeline In DevOps https://microsoft.github.io/fabric-cicd/latest/example/deployment_variable/

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
```

### Deployment

We can run `deployment.py`{:. txt} to deploy our fabric items.

![Deployment](/assets/img/0027-fabric-cicd/deployment.png)

And we can see our Semantic Model and Report have been successfully deployed.

![Workspace](/assets/img/0027-fabric-cicd/workspace.png)

## Conclusions

I would recommend using this library over a homebrew solution, it is simple to use and seems to be well supported with frequent updates. Looking forward to future developments, particularly if git diffs become supported, and support for gateway connections and refreshes. As a side note, I followed Kevin Chants blogs and managed to painlessly setup a Azure Dev Ops pipeline in a couple hours, so big shout out there.