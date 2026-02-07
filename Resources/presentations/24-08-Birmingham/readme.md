# Intro
This Repo is a example of deploying Power BI artifacts. Power BI artifacts as saved to the repo using the [Power BI Project Format](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview) (pbip). 

## [Power BI Project Format (pbip)](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview)

The PBIP format saves Semantic Model and Reports as seperate items. These are represented by folders. Each Item contain a collection of files and folders that represent the item.

```
📁 
┕━━ 📁 <project name>.SemanticModel
┕━━ 📁 <project name>.Report
┕━━ 📄 .gitIgnore
┕━━ 📄 <project name>.pbip                  # shortcut to open report and model for authoring with Power BI Desktop
```

### [Semantic Model](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-dataset)

```
📁 
┕━━ 📁 <project name>.SemanticModel
    ┕━━ 📁 .pbi
    │   ┕━━ 📄 localSettings.json           # gitignore
    │   ┕━━ 📄 editorSettings.json       
    │   ┕━━ 📄 cache.abf                    # gitignore
    │   ┕━━ 📄 unappliedChanges.json                  
    ┕━━ 📄 definition.pbism                 # Required
    ┕━━ 📄 model.bim                        # .bim (TMSL) or 
    ┕━━ 📁 definition                       # definition folder (TMDL) required
    ┕━━ 📄 diagramLayout.json
    ┕━━ 📄 .platform
```

### [Report](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report)

```
📁 
┕━━ 📁 <project name>.Report
    ┕━━ 📁 .pbi
    │   ┕━━ 📄 localSettings.json           # gitignore 
    ┕━━ 📁 CustomVisuals
    ┕━━ 📁 StaticResources
    │   ┕━━ 📁 RegisteredResources
    ┕━━ 📄 definition.pbir                  # Pointer to Semantic Model. Required
    ┕━━ 📄 report.json                      # report.json or 
    ┕━━ 📁 definition                       # definition folder required
    ┕━━ 📄 semanticModelDiagramLayout.json
    ┕━━ 📄 mobileState.json
    ┕━━ 📄 .platform
```

*Please note the definition.pbir must be byConnection rather than byPath.*

### [Converting .pbix to PBIP](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview#save-as-a-project)

You can convert a Power BI desktop file (.pibx) to the PBIP folder/file format, by selecting PBIP in the desktop save dialog.

### Working with PBIP

When making changes with Power BI desktop, upon save, changes to the Semantic Model and/or Report will be observed in the files. Any changes to open files made outside Power BI Desktop requires a restart for those changes to be shown in Power BI Desktop.

## Branching Strategy

The suggest branching stratergy is Git Flow. When working on work items, Developers will create feature branches from the `dev` branch. The naming convention for these branches should be feat.{developer initals}.{work item id} (ie feat.jd.11342). *If you add "#{ticket nubmer}" to a commit message, will link the Work Item. If you add "Fixes #{ticket nubmer}" to a commit message, it will close the the linked Work Item*. When work on the feature is complete a Merge Request (MR) to `dev` will be created. A pre-merge build will occur deploying items. If sucessful the MR will be reviewed by at least 1 Repo reviewer. If approved it will be merged. The Repo Reviewer will be responible for managing MRs into `release` and `main`. A MR into `release` will occur once a release candidate is present in `dev`, deploying item(s) to uat workspace. Following testing and addressing any issues a MR will be raised to `main`, deploying the item(s) to the production workspace.

![Branching Strategy](/Birmingham_Aug24/assets/Branching%20Strat.png)

## Deployment

Deployment of Items is performed with [Fabric Rest APIs](https://learn.microsoft.com/en-us/rest/api/fabric/articles/). Each Item type in Microsoft Fabric have different supported formats and required Parts (files) that make up its definition ([Semantic Model](https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/semantic-model-definition), [Report](https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions/report-definition)). To Create or Update Fabric Items, these parts are provided in the Request Body in the base64. Semantic Models & Reports require pbip format. Only some parts are mandatory.

| API | HTTP method | URL |
 --- | --- | --- |
| Create Item  | `post` | /workspaces/{workspaceId}/items/{itemId}/updateDefinition |
| Update Item Definition | `post` | /workspaces/{workspaceId}/items |

## Azure Dev Ops Pipeline

The Azure DevOps (ADO) deployment pipeline is defined in the [.azure-pipeline](.modules\FabricPS-PBIP.psm1) folder. Deployment is performed by a service principal. The target workspace depends on the Repo and name and the branch which triggers the pipeline, as per the Branching Strategy image above.

## Deployment Script

Deployment utalizes a [script](https://github.com/microsoft/Analysis-Services/blob/master/pbidevmode/sample-ado-pipelines/ContinuousDeployment.yml) provided by Microsoft. This converts the file/folder into the a valid request body and calls the Fabric APIs to deployment new items or update item definitions.
 
