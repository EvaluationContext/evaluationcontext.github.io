---
title: Fabric-CICD Updates - Semantic Models, Parameters and Config
description: A look at recent updates to fabric-cicd including semantic model binding, response collection, and YAML configuration
image: /assets/images/blog/2026/2026-02-02-Fabric-cicd-0-1-33/fabric-cicd.png
date: 2026-02-02
authors:
  - jDuddy
comments: true
categories:
  - CICD
links:
  - fabric-cicd Docs: https://microsoft.github.io/fabric-cicd/latest/
slug: posts/Fabric-cicd-0-1-33
---

I last posted about [fabric-cicd](https://microsoft.github.io/fabric-cicd/latest/) in May 2025. Since then, there have been significant updates to the tool, particularly regarding configuration based deployments, cross-workspace deployments, and Semantic Model binding. In this post, I'll cover the notable changes for Power BI deployments from release v0.1.17 through v0.1.34.

## Configuration Deployment

As of **v0.1.26**, fabric-cicd supports alternative deployment mode: [Configuration-based deployment](https://microsoft.github.io/fabric-cicd/0.1.33/how_to/config_deployment/). Instead of defining a workspace object, with parameters and calling `#!py publish_all_items()`/`#!py unpublish_all_orphan_items()`, you can define and pass `config.yml` to `#!pydeploy_with_config()`. With `config.yml` you can define workspaces, item types in scope, publish and unpublish rules etc. 

!!! "Optional Features"
    Please note selective publish/unpublish requires you enable [Feature Flags](https://microsoft.github.io/fabric-cicd/0.1.33/how_to/optional_feature/)

=== "Config.yml"

    ```yml title="config.yml"
    core:
        workspace:
            dev: "Fabric-Dev-Engineering"
            test: "Fabric-Test-Engineering"
            prod: "Fabric-Prod-Engineering"

        workspace_id:
            dev: "8b6e2c7a-4c1f-4e3a-9b2e-7d8f2e1a6c3b"
            test: "2f4b9e8d-1a7c-4d3e-b8e2-5c9f7a2d4e1b"
            prod: "7c3e1f8b-2d4a-4b9e-8f2c-1a6c3b7d8e2f"

        repository_directory: "." # relative path

        item_types_in_scope:
            - Notebook
            - DataPipeline
            - Environment
            - Lakehouse

        parameter: "parameter.yml" # relative path

    publish:
        # Don't publish items matching this pattern
        exclude_regex: "^DONT_DEPLOY.*"

        folder_exclude_regex: "^DONT_DEPLOY_FOLDER/"

        items_to_include:
            - "Hello World.Notebook"
            - "Run Hello World.DataPipeline"

        skip:
            dev: true
            test: false
            prod: false

    unpublish:
        # Don't unpublish items matching this pattern
        exclude_regex: "^DEBUG.*"

        skip:
            dev: false
            test: false
            prod: true

    features:
        - enable_shortcut_publish
        - enable_experimental_features
        - enable_items_to_include

    constants:
        DEFAULT_API_ROOT_URL: "https://api.fabric.microsoft.com"
    ```

=== "Deployment"

    ```py
    from fabric_cicd import deploy_with_config

    # Deploy using a config file
    deploy_with_config(
        config_file_path="path/to/config.yml", # required
        environment="dev" # optional (recommended)
    )
    ```

## Parameter File Templates

As your project grows, your `parameter.yml` file can become large and unwieldy. To help with organization and reuse, **v0.1.31** introduced support for [Parameter File Templates](https://microsoft.github.io/fabric-cicd/0.1.33/how_to/parameterization/?h=extend#parameter-file-templates). You can use the `extend` key to import rules from other YAML files.

=== "Repo"

    ```txt
    .
    ├── 📁 WorkspaceFoo
    │    ├── 📁 Bar.SemanticModel
    │    ├── 📁 Bar.Report
    │    └── 📄 parameter.yml
    ├── 📁 templates
    │    └── 📄 base_parameters.yml
    └ .gitignore
    ```

=== "parameters.yml"

    ```yaml title="parameters.yml"
    extend:
        - "./templates/base.yml"

    find_replace:
        # Lakehouse Connection Guid
        - find_value: "db52be81-c2b2-4261-84fa-840c67f4bbd0"
        replace_value:
            PPE: "81bbb339-8d0b-46e8-bfa6-289a159c0733"
            PROD: "5d6a1b16-447f-464a-b959-45d0fed35ca0"
        # Optional fields:
        item_type: "Notebook"
        item_name: ["Hello World", "Hello World Subfolder"]
        file_path:
            - "/Hello World.Notebook/notebook-content.py"
            - "/subfolder/Hello World Subfolder.Notebook/notebook-content.py"

    spark_pool:
        # CapacityPool_Large
        - instance_pool_id: "72c68dbc-0775-4d59-909d-a47896f4573b"
        replace_value:
            PPE:
                type: "Capacity"
                name: "CapacityPool_Large_PPE"
            PROD:
                type: "Capacity"
                name: "CapacityPool_Large_PROD"
        # Optional field:
        item_name: "World"
    ```

=== "base_parameter.yml"

    ```yaml title="base_parameter.yml"
    find_replace:
        # Lakehouse Connection Guid regex
        - find_value: \#\s*META\s+"default_lakehouse":\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"
        replace_value:
            # Variable: $items.type.name.attribute (Note: item type and name values are CASE SENSITIVE; id attribute returns the deployed item's id/guid)
            PPE: "$items.Lakehouse.WithoutSchema.id"
            PROD: "$items.Lakehouse.WithoutSchema.id"
        # Optional fields:
        is_regex: "true"
        file_path: "/Example Notebook.Notebook/notebook-content.py"
        # Lakehouse workspace id regex
        - find_value: \#\s*META\s+"default_lakehouse_workspace_id":\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"
        replace_value:
            # Variable: $workspace.id -> target workspace id
            PPE: "$workspace.id"
            PROD: "$workspace.id"
        # Optional fields:
        is_regex: "true"
        file_path: "/Example Notebook.Notebook/notebook-content.py"
    ```

## Dynamic Parameterization

Static replacements are great, but sometimes you need values that are only known at deployment time—like the Workspace ID of the environment you are deploying to, or the Item ID of a Lakehouse that was just created.

The [Dynamic Replacement](https://microsoft.github.io/fabric-cicd/latest/how_to/parameterization/#dynamic-replacement) feature allows you to use variables in your `parameter.yml` that get resolved during deployment.

**Workspace Variables:**

| Variable | Description |
| :--- | :--- |
| `$workspace.id` | The target workspace ID (synonym: `$workspace.$id`) |
| `$workspace.<Name>` | The ID of the workspace with the specified name |

**Item Attributes:**

You can access these attributes using the pattern `$items.<ItemType>.<ItemName>.<Attribute>`.

| Attribute | Description |
| :--- | :--- |
| `$id` | The Item ID (Guid) |
| `$sqlendpoint` | The SQL Endpoint string |
| `$sqlendpointid` | The SQL Endpoint Item ID |
| `$queryserviceuri` | The Query Service URI |

Since **v0.1.29**, you can also reference items in *other* workspaces. This is essential for the "Thin Report" pattern, where reports in business workspaces connect to a central "Gold" Semantic Model.

*   `$workspace.<WorkspaceName>.$items.<ItemType>.<ItemName>.$id`

For example, we can bind a "Thin Report" to a Semantic Model in another workspace:

```yaml
find_replace:
    # Find the existing dataset ID in the report definition
    - find_value: "00000000-0000-0000-0000-000000000000"
      replace_value:
          # Dynamically get the ID of semantic model (Bar) from the Foo workspace
          TEST: "$workspace.Foo_UAT.$items.SemanticModel.Bar.$id"
          PROD: "$workspace.Foo_Prod.$items.SemanticModel.Bar.$id"
      # Apply only to the relevant file
      file_path: "Foo.Report/definition.pbir"
```

## key_value_replace Support

Additionally, parameter handling has become more robust. In **v0.1.33**, `key_value_replace` support was added to YAML configurations, allowing for precise key-based replacements in your JSON definitions.

```yaml Title = parameter.yml
key_value_replace:
    # Example: Replace Server in Semantic Model "Foo" for DataSource "Bar"
    - find_key: $.model.dataSources[?(@.name=="Bar")].connectionDetails.server
      replace_value:
          PPE: "server-uat"
          PROD: "server-prod"
      item_type: "SemanticModel"
      item_name: "Foo"
```

## Response Collection

The **Dynamic Parameterization** capabilities discussed above, specifically the ability to resolve variables like `$items...` and cross-workspace references, are powered by the `response_collection` feature.

Introduced in **v0.1.29**, this mechanism captures the API responses during the deployment process. When you use `deploy_with_config`, the tool automatically uses these responses to populate the dynamic variables.

If you are maintaining custom Python deployment scripts, you can also leverage this feature directly to handle complex dependencies, such as retrieving the specific ID of a newly deployed Notebook to pass into a pipeline.

```python
from fabric_cicd import append_feature_flag, FabricWorkspace, publish_all_items

# Enable the feature flag to capture API outputs
append_feature_flag("enable_response_collection")

workspace = FabricWorkspace(workspace_id="...", ...)
responses = publish_all_items(workspace)

# Access all responses
print(responses)

# Access individual item responses
notebook_response = workspace.responses["Notebook"]["Hello World"]
```

## Semantic Model Binding

[Semantic Model Binding](https://microsoft.github.io/fabric-cicd/latest/how_to/parameterization/#semantic_model_binding) allows you to map your Semantic Models to specific connections, removing additional clicks after a new semantic model is deployed, or new sources are added to a existing semantic model.

```yml Title="parameters.yml"
semantic_model_binding:
    # Required field: value must be a string (GUID)
    # Connection Ids can be found from the Fabric UI under Settings -> Manage Connections and gateways -> Settings pane of the connection
    - connection_id: <connection_id>
    # Required field: value must be a string or a list of strings
      semantic_model_name: <semantic_model_name>
    # OR
      semantic_model_name: [<semantic_model_name1>,<semantic_model_name2>,...]
```

Support for binding to **On-Premises Gateways** was added in **v0.1.30**, and support for parameterized **multiple connections** within a single model arrived in **v0.1.33**.