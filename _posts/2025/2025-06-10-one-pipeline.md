---
title: One Pipeline to Rule Them All
description: Consolidating Fabric Deployment Pipelines in Azure DevOps
author: duddy
date: 2025-06-10 22:30:00 +0000
categories: [PBIP, deployment]
tags: [devops, power bi, pbip, deployment]
pin: false
image:
  path: /assets/img/0030-one-pipeline/hero.png
  alt: One Pipeline (Excalidraw)
---

In the complex landscapes of modern data analytics, managing Fabric deployments can sometimes feel like a daunting quest. If you've ever found yourself creating and defining a Azure DevOps pipeline per repo you know the pain: vast number of pipelines, repetitive YAML, spiraling maintenance, and a general sense of being "bound" by pipeline sprawl.

Just like the One Ring brought power and control, we seek One Pipeline to Rule Them All, One Pipeline to Find Them, One Pipeline to Bring Them All, and in the darkness bind them; In the Land of Fabric where the data lies. This isn't just about reducing pipeline count; it's about establishing a centralized, efficient, and auditable CI/CD strategy for your Fabric projects.

## In the Land of Fabric Where the Data Lies: The Challenge

Many organizations adopting [Azure DevOps](https://azure.microsoft.com/en-us/products/devops) for Fabric version control and deployments following some common patterns:

- Single Git repo for each workspace or related set of Fabric Items, with each repo having its own pipeline
- Large multi-repo

In these cases it can be assumed that you will have a repo (`shared-fabric-pipeline`{:.txt}) that will define the core logic of the pipeline (`shared-pipeline.yml`{:.txt}), plus any CICD scripts (i.e. [fabric-cicd](https://microsoft.github.io/fabric-cicd/0.1.19/)). This will be extended (`extends:`{:.yaml}) in the Fabric Items repo(s), passing any repo specific configuration.

![Multi-repo and Per Repo Architecture](/assets/img/0030-one-pipeline/pipeline-arch.png)

There are pros and cons to both of these approaches.

### Pipeline Per Repo

✔️ **Pipeline Versions:** Each repo can have a pipeline definition that extends a specific version of a shared pipeline definition. If a breaking change is introduced in a new major release of a pipeline, individual repos can transitioned as required

✔️ **Security:** You can limit access and approvals for specific repos, to specific people per repo

✔️ **Limited Scope:** Focused git history with a narrow scope, limited to a small number of items. Can easily be used to auto generate release notes. If repo only contains related items, the scope of changes can be easily understood

❌ **Pipeline Proliferation:** Large number of duplicate pipelines

### Multi-Repo

✔️ **Pipeline Reusability:** Single Pipeline to deploy any Fabric Item

✔️ **Easier Collaboration:** All Fabric Items are in one place meaning developer don't have to swap between repositories

❌ **Deployment:** The pipeline has to detect and deploy only updated items, else there will be alot of unnecessary deployments

❌ **Slower Cloning:** Initial cloning of the repo will be will be time consuming

❌ **Upgrading Tooling:** Deployments will all use the same single version of the pipeline definition. Updates to the pipeline must not introduce breaking changes, otherwise the structure of the entire repo must be updated to accommodate the change

❌ **Security:** You are not able to limit access and approvals for specific items

## One Pipeline to Rule Them All: The Strategic Blueprint

We want we really want is the best of both worlds, the flexibility of many repos, and a consolidation of pipelines.

![One Pipeline Architecture](/assets/img/0030-one-pipeline/one-pipeline-arch.png)

There are a couple of approaches that can achieve this:

- **[Repository Resource Definition:](https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/multi-repo-checkout?view=azure-devops)** Developer's register each of their Fabric Item repo as a `Resources:`{:.yaml} in the `shared-fabric-pipeline`{:.txt} repo's `shared-pipeline.yml`{:.txt}. Commits on defined branches of the Fabric Item Repos will trigger the pipeline. The pipeline will be configured to only checkout the triggering repo, for a targeted deployment
- **[Build Validation:](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation)** Define a build validation policy for each branch in each Fabric Item repo, that uses the `shared-fabric-pipeline`{:.txt} repo's pipeline. When a merge request is created into a branch with a build policy the defined pipeline will run and must succeed for the Merge Request to be accepted

Personally I prefer the build validation approach since developers can focus on configuring their Fabric Item repo without having to update or worry about the `shared-fabric-pipeline`{:.txt} repo. The rest of this post will be focused on this approach.

### Parameterized/Templated YAML Pipelines

Firstly we need to define the `shared-pipeline.yml`{:.txt} within the `shared-fabric-pipeline`{:.txt} repo. This template will accepts parameters like the `path`{:.txt} to Fabric Items, `target workspace ID`{:.txt}, and `environment`{:.txt}.  Deployment is performed with [fabric-cicd](https://microsoft.github.io/fabric-cicd/0.1.19/). 

For this repo using the [Microsoft Release Flow](https://learn.microsoft.com/en-us/devops/develop/how-microsoft-develops-devops#release-branches) makes sense. [Semantic versioning](https://semver.org/) would be used, and each Major release will spin off a new release branch (i.e. `v1`{:.txt}, `v2`{:.txt}), and a corresponding pipeline created. Patches and minor release will be cherry picked to the release branch. The developer configuring a Fabric Item repo can then pick a specific Major release version of the pipeline for their repo, and would benefit for Minor and Patch updates. They could then upgrade to a new Major release when convenient.

The pipeline will assume Git Flow is being used, whereby branches in the Fabric Items repos maps to a deployment environment: 

- `dev`{:.txt} -> `dev`{:.txt}
- `release`{:.txt} -> `uat`{:.txt}
- `main`{:.txt} -> `prod`{:.txt}

![GitFlow](/assets/img/0030-one-pipeline/gitflow.png)

### Build Validation

Instead of each Power BI project repo having its own pipeline definition. A [build validation policy](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) is create for each branch that maps to a deployment environment (`dev`{:.txt}, `release`{:.txt} and `main`{:.txt}).

### Environments

With a build validation policy, the pipeline will be trigger when a merge request is created, where the target branch has the policy defined. This is fine for `dev`{:.txt} and `uat`{:.txt}, but we wouldn't want to automatically deploy into `prod`{:.txt}. A [Environment](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops) will be defined for `prod`{:.txt} so that a [pre-approval check](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops&tabs=check-pass#approvals) can be set, to ensure approval is granted prior to pipeline execution. Additionally, having environment defined allows for parameter overrides, using `parameter.yml`{:.txt} in [fabric-cicd](https://microsoft.github.io/fabric-cicd/0.1.19/) for example.

## One Pipeline to Bring Them All: The Azure DevOps Orchestration

Now, let's craft the central `shared-pipeline.yml`{:.txt} (residing in the dedicated `shared-fabric-pipeline`{:.txt} repository). This single YAML file will manage deployments for all the fabric repos.

### Fabric Items Repos

Firstly lets have a look at the structure of one of the `Fabric Items repos`{:.txt}. Note this only defines Fabric items, no pipeline. There is expected to be many of these.

```txt
├── 📁 fabricItems
│    ├── 📁 foo.SemanticModel
│    ├── 📁 foo.Report
│    └── 📄 parameter.yml           # *optional* find and replace text in files
└── 📄 deploymentManifest.json
└── 📄 .gitignore
```

#### deploymentManifest.json

Defines which workspaces the Fabric items will be deployed, depending on the environment.

```json
{
  "repo": {
    "environments": {
      "dev": {"workspaceId": "000-000-0000-0001"},
      "uat": {"workspaceId": "000-000-0000-0002"},
      "prod": {"workspaceId": "000-000-0000-0003"}
    }
  }
}
```

### shared-fabric-pipeline

Then we can setup the `shared-fabric-pipeline`{:.txt}.

```txt
├── 📄 fabric-cicd.py
└── 📄 shared-fabric-pipeline.yml
```

#### fabric-cicd.py

```python
from fabric_cicd import FabricWorkspace, publish_all_items
import argparse
import json

parser = argparse.ArgumentParser(description='Process some variables')
parser.add_argument('--Environment', type=str)
parser.add_argument('--RepositoryDirectory', type=str)
parser.add_argument('--ItemsInScope', type=str)
args = parser.parse_args()

allItems = args.ItemsInScope
item_type_in_scope = allItems.split(",")

with open(f"{args.RepositoryDirectory}/deploymentManifest.json") as json_data:
  manifest = json.load(json_data)
workspace_id = manifest['repo']['environment'][args.Environment]['workspaceID']

target_workspace = FabricWorkspace(
  workspace_id = workspace_id,
  environment = args.Environment,
  repository_directory = f"{args.RepositoryDirectory}/fabricItems",
  item_type_in_scope = items_type_in_scope
)

publish_all_items(target_workspace)
```

#### shared-fabric-pipeline.yml

{% raw %}
```YAML
parameters:
  - name: ITEMS_IN_SCOPE
    type: string
    default: 'Report,SemanticModel'
  - name: POOL_NAME
    type: string
    default: '***'
  - name: SVC_CONNECTION
    type: string
    default: '***'
  - name: KV
    type: string
    default: '***'
  - name: SECRETS_FILTER
    type: string
    default: '***'
  - name: TENANT_ID
    type: string
    default: '***'

variables:
  # This variable will hold the determined environment (e.g., 'prod', 'uat', 'dev')
  Environment: ''
  - ${{ if eq(variables['System.PullRequest.TargetBranchName'], 'main') }}:
    Environment: 'prod'
  - ${{ if eq(variables['System.PullRequest.TargetBranchName'], 'release') }}:
    Environment: 'uat'
  - ${{ if eq(variables['System.PullRequest.TargetBranchName'], 'dev') }}:
    Environment: 'dev'
  # Fallback for unexpected target branches, or if not a PR build
  - ${{ if not(or(
          eq(variables['System.PullRequest.TargetBranchName'], 'main'),
          eq(variables['System.PullRequest.TargetBranchName'], 'release'),
          eq(variables['System.PullRequest.TargetBranchName'], 'dev'))
        ) }}:
    targetEnvironmentName: 'dev'

stages:
- stage: Deploy
  displayName: 'Deploy Fabric Items'
  pool:
    vmImage: 'windows-latest'

  jobs:
  - deployment: DeployFabricItems
    displayName: 'Deploy to ${{ variables.targetEnvironmentName }}'
    environment: ${{ variables.Environment }}

    strategy:
      runOnce:
        deploy:
          steps:
          - checkout: self
            path: "s/ToDeploy"
          - checkout: shared-fabric-pipeline
            path: "s/shared-fabric-pipeline"

          - task: UsePythonVersion@0
            displayName: 'Use Python 3.11'
            inputs:
              versionSpec: '3.11'

          - task: PowerShell@2
            displayName: 'Install fabric-cicd'
            inputs:
              targetType: 'inline'
              script: |
                python -m pip install --upgrade pip
                pip install fabric-cicd

          - task: AzureKeyVault@1
            displayName: 'Get Service Principal Credentials'
            inputs:
              azureSubscription: $(SVC_CONNECTION)
              keyVaultName: $(KV)
              secretsFilter: $(SECRETS_FILTER)

          - task: PowerShell@2
            displayName: 'Authenticate as Service Principal'
            inputs:
              targetType: 'inline'
              script: |
                Install-Module -Name Az.Accounts -AllowClobber -Force
                $SecureStringPwd = ConvertTo-SecureString $env:ARMCLIENTSECRET -AsPlainText -Force
                $pscredential = New-Object -TypeName System.Management.Automation.PSCredential - ArgumentList $env:ARMCLIENTID, $SecureStringPwd
                Connect-AzAccount -ServicePrincipal -Credential $pscredential -Tenant $env:TENANTID
              env:
                ARMCLIENTID: ${ARMCLIENTID}
                ARMCLIENTSECRET: ${ARMCLIENTSECRET}
                TENANTID: ${TENANT_ID}

          - task: PythonScript@2
            displayName: 'Deploy Fabric Items'
            inputs:
              scriptPath: $(Agent.BuildDirectory)/s/shared-fabric-pipeline/fabric-cicd.py
              arguments: '--Environment ${{parameters.ENVIRONMENT}} --RepositoryDirectory "$(Build.SourcesDirectory)/ToDeploy" --ItemsInScope ${{parameters.ITEMS_IN_SCOPE}}
```
{% endraw %}

#### Pipeline, Environment and Prod Approval

Once this is all setup we then need to:

- [Create environments](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops#create-an-environment) for `dev`{:.txt}, `uat`{:.txt} and `prod`{:.txt}
- [Create approval](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops&tabs=check-pass#approvals) in the `prod`{:.txt} environment
- Create the pipeline
- Create Build Validation on `Fabric Items Repos`{:.txt} for `dev`{:.txt}, `release`{:.txt} and `prod`{:.txt} branches, linking the shared pipeline

## And in the Darkness Bind Them: Why This Method Rules Them All

- **Ultimate Consolidation:** Your deployment logic lives in one central pipeline, eliminating redundant YAML across dozens of repos.
- **Effortless Scalability:** Adding a new Fabric project simply involves setting Build Validation Policies on `dev`, `release` and `main` – no new pipelines needed!
- **Targeted Deployments:** Deployments are scoped to the items within a single repo, be that a workspace or a set of related Fabric Items, saving build minutes and minimizing deployment risk.
- **Robust Auditing:** Injecting commit SHA and timestamp directly into the semantic model provides clear, in-model lineage, invaluable for troubleshooting and governance.
  
By embracing this consolidated pipeline approach, you transform your Fabric deployment strategy from a chaotic free-for-all into a streamlined, automated, and highly auditable process.