---
title: Who Actually Has Access To What In Power BI?
description: Using Power BI Scanner and GraphFrames to figure out who can access what in Power BI tenant
author: duddy
date: 2025-01-20 18:00:00 +0000
categories: [Power BI Administration, Permissions]
tags: [scanner api, graph api, graphframes, pregel, databricks, python, pyspark]
pin: false
image:
  path: /assets/img/0018-GraphFrames/graphdb.png
  alt: https://subject.network/posts/graph-store/
---
 
Giving permissions to users to Power BI content should be easy right? What about when you have a bunch of nested AAD groups? If I add a user to a group, what permissions will they actually be granted? In this solution I am using the [Power BI Scanner APIs](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview), [Graph APIs](https://learn.microsoft.com/en-us/graph/overview?context=graph%2Fapi%2F1.0&view=graph-rest-1.0) and [GraphFrames](https://graphframes.github.io/graphframes/docs/_site/index.html) to generate a graph to disseminate Access Roles from Workspaces, Reports and Semantic Models directly granted to AAD groups, to all downstream members.

## Service Principal

To call Scan API and Graph API you will ideally need a Service Principal, which must not have any admin-consent required permissions. The following scopes are required.

| Service | Scope |
| --- | --- |
| Power BI |`Tenant.Read.All`{:.console} or `Tenant.ReadWrite.All`{:.console} |
| Graph API | `Directory.Read.All`{:.console} |

## Scanner APIs

>With the scanner APIs, you can extract information such as item name, owner, sensitivity label, and endorsement status. For Power BI semantic models, you can also extract the metadata of some of the objects they contain, such as table and column names, measures, DAX expressions, mashup queries, and so forth. The metadata of these semantic model internal objects is referred to as subartifact metadata.
> 
> -- <cite>[Microsoft Docs: Run metadata scanning](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview)</cite>

The following APIs are used return all the metadata for the Power BI service

| API | Function |
| --- | --- |
| [GetModifiedWorkspaces](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-modified-workspaces) | Return workspaceIds |
| [PostWorkspaceInfo](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info) | Starts a scan. *Accepts batches of 1-100 workspaces* |
| [GetScanStatus](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-status) | Checks status of scan |
| [GetScanResult](https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result) | Returns scan results |

### Considerations and limitations

>- Semantic models that haven't been refreshed or republished will be returned in API responses but without their subartifact information and expressions. For example, semantic model name and lineage are included in the response, but not the semantic model's table and column names.
>- Semantic models containing only DirectQuery tables will return subartifact metadata only if some sort of action has been taken on the semantic model, such as someone building a report on top of it, someone viewing a report based on it, etc.
>- Real-time datasets, semantic models with object-level security, semantic models with a live connection to AS-Azure and AS on-premises, and Excel full fidelity datasets aren't supported for subartifact metadata. For unsupported datasets, the response returns the reason for not getting the subartifact metadata from the dataset. It's found in a field named schemaRetrievalError, for example, schemaRetrievalError: Unsupported request. RealTime dataset are not supported.
>- The API doesn't return subartifact metadata for semantic models that are larger than 1 GB in shared workspaces. In Premium workspaces, there's no size limitation on semantic models.
> 
> -- <cite>[Microsoft Docs: Run metadata scanning](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview)</cite>

### Schema

> I have only setup the Power BI schema for entities I care about, `datasets`{:.console} and `reports`{:.console}, there are also structures for `dataflows`{:.console}, `notebooks`{:.console}, `dashboards`{:.console}, `datamarts`{:.console}, `DataPipelines`{:.console}, `Reflex`{:.console} etc. Since these are not/rarely used, these have not been built into the schema. Additional some fields like `schemaRetrievalError`{:.console} have also not been considered. See [Sandeep Pawar blog](https://fabric.guru/scan-fabric-workspaces-with-scanner-api-using-semantic-link-labs) for some other items. Additionally if you use different connectors you might need to extent the connectionDetails.
{: .prompt-info }

> There is no specific Power BI object for a workspace App. When you create a App you a copy of a report is generated, named `[App] ...`{:.console}. You therefore need to look at reportUserAccessRight to determine App permissions.
{: .prompt-info }

## Graph APIs

| API | Function |
| --- | --- |
| [ListGroups](https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0&tabs=http) | Return AAD groups |
| [ListUsers](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0&tabs=http) | Return AAD Users |
| [ListApps](https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0&tabs=http) | Return AAD Apps |

## GraphFrames

>GraphFrames is a package for Apache Spark which provides DataFrame-based Graphs. It provides high-level APIs in Scala, Java, and Python. It aims to provide both the functionality of GraphX and extended functionality taking advantage of Spark DataFrames. This extended functionality includes motif finding, DataFrame-based serialization, and highly expressive graph queries.
> 
> -- <cite>[GraphFrames Overview](https://graphframes.github.io/graphframes/docs/_site/index.html)</cite>

Graphs represent data as a set of vertices (nodes/entities) and edges (connections between nodes/entities). [GraphFrames](https://graphframes.github.io/graphframes/docs/_site/index.html) works on top of [Spark Dataframes](https://spark.apache.org/docs/latest/sql-programming-guide.html), and therefore easily fit into a Databricks/Fabric workflow. Vertices are defined by a dataframe with a `id`{:.console} field and Edges as another dataframe with `src`{:.console} and `dst`{:.console} fields. `src`{:.console} (source) and `dst`{:.console} (destination) are the directional relationship between two vertices. Graphframes supports Scala, Java, and Python. Out of the box we get [motif pattern matching](https://graphframes.github.io/graphframes/docs/_site/user-guide.html#motif-finding), and a range of graph algorithms are provided, plus you can write your own with [Pregel](https://graphframes.github.io/graphframes/docs/_site/api/python/graphframes.lib.html).

![Example Graph](/assets/img/0018-GraphFrames/Graph.png)

[*Example Graph*](https://www.oracle.com/uk/autonomous-database/what-is-graph-database/)

### Pregel

In order to traverse the graph and disseminate Access Roles to ADD groups and users we are going to use [Pregel](https://graphframes.github.io/graphframes/docs/_site/api/python/graphframes.lib.html). Pregel was originally developed by google as a method to rank Web Pages with the [PageRank](https://en.wikipedia.org/wiki/PageRank) algorithm. In essence the graph is processed in a number of supersets. Within each superset, vertices emit a message along it's edges to neighboring vertices. Destination vertices can have many incoming edges, therefore the messages are aggregated. Then other superset occurs. This occurs until a max number of defined supersets are complete or a stop condition is met.

> Graphframes only supports a stopping based on a defined number of iterations `setMaxIter(n)`{:.console}. Stop conditions are not supported.
{: .prompt-info }

### Running GraphFrames

GraphFrames is package for Apache Spark. To use it you need to install the [.jar](https://spark-packages.org/package/graphframes/graphframes) file.  I am running on [databricks ML runtime]( https://docs.databricks.com/en/integrations/graphframes/index.html) which includes GraphFrames as default. I found a guide on how to do install the .jar file on [Fabric](https://www.linkedin.com/pulse/getting-started-graphframes-microsoft-fabric-jeffrey-hebrank-owvbc/).

## Notebook Script

### Setup 

#### Dependencies

```python
import json
from pyspark.sql import SparkSession
from pyspark.sql.types import *
import requests
import pyspark.sql.functions as f
import logging

logger = logging.getLogger("logger")
logger.setLevel(logging.INFO) # DEBUG, INFO, WARNING, ERROR, CRITICAL
logging.basicConfig(
  format="{asctime} - {levelname} - {message}",
  style="{",
  datefmt="%Y-%m-%d %H:%M",
)

client_id = dbutils.secrets.get(scope="scopeabc", key="abc-pbi-readonly-clientid")
client_secret = dbutils.secrets.get(scope="scopeabc", key="abc-pbi-readonly-secret")
tenant_id = "00000000-0000-0000-0000-000000000000"
savePath = 'hive_metastore.powerbicatalogue'
```

#### Functions

```python
def GetAccessToken(client_id:str, client_secret:str, tenant_id:str, resource:str) -> str:
    """
    Get an access token from Azure AD.
    parameters:
        client_id:      str     the client ID for the application registered in Azure AD
        client_secret:  str     the client secret for the application registered in Azure AD
        tenant_id:      str     the tenant ID for the application registered in Azure AD
        resource:       str     the resource for the application registered in Azure AD
    returns:            str     the access token
    """
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    scope = f"{resource}/.default"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        'scope': scope
    }

    r = Request(method="post", url=url, data=data)
    token_data = r.json()

    logger.info(f"{'GetAccessToken':25} Token Generated, {scope} expires in {token_data.get('expires_in')} seconds")

    return token_data.get("access_token")

def Request(method:str, url:str, headers:dict=None, data:dict=None, proxies:dict=None):
    """
    Make a request to the specified URL. Deals with error handling.
    parameters:
        method:     str     the HTTP method to use {get, post, put, delete}
        url:        str     the URL to make the request to
        headers:    dict    the headers to send with the request
        data:       dict    the data to send with the request
        proxies:    dict    the proxies to use with the request
    returns:        str     the response from the request
    """

    if method not in ["get", "post", "put", "delete"]:
        return f"Invalid method {method}, must be one of get, post, put, delete"

    try:
        r = requests.request(method=method, url=url, headers=headers, data=data, proxies=proxies)
        invalid_request_reason = r.text
        if r.status_code == 400:
            invalid_request_reason = r.text
            raise Exception(f"{'Request' :25} Your request has failed because {invalid_request_reason}")
        elif r.status_code > 400:
            raise Exception(f"{'Request' :25} Your request has failed with status code {r.status_code}")
    except requests.exceptions.ConnectionError as err:
        raise SystemExit(err)

    return r

def WriteViewToTable(viewName:str, savePath:str, tableName:str=None, mode:str = "Overwrite") -> None:
    """
    Writes a View to a table in the specified database.
    parameters:
        viewName:       str
        mode:           str     Overwrite, Append, Merge
        tableName:      str     name of the table to write to
        savePath:       str     path to save the table to i.e "hive_metastore.xxx"
    """

    if mode not in ("Overwrite", "Append", "Merge"):
        raise Exception(f"{'WriteToTable' :25} Invalid mode {mode}, must be one of Overwrite, Append, Merge")

    if tableName is None:
        tableName = viewName

    spark.sql(f"select * from {viewName}").write.mode(mode).option("overwriteSchema", "true").saveAsTable(f"{savePath}.{tableName}")
    
    logger.info(f"{'WriteToTable' :25} {viewName} to {savePath}.{tableName} ({mode})")

def WriteDfToTable(df, savePath:str, tableName:str, mode:str = "Overwrite") -> None:
    """
    Writes a View to a table in the specified database.
    parameters:
        df:           pyspark dataframe
        mode:         str       Overwrite, Append, Merge
        tableName:    str       name of the table to write to
        savePath:     str       path to save the table to i.e "hive_metastore.xxx"
    """

    if mode not in ("Overwrite", "Append", "Merge"):
        raise Exception(f"{'WriteToTable' :25} Invalid mode {mode}, must be one of Overwrite, Append, Merge")

    df.write.format("delta").mode(mode).option("overwriteSchema", "true").saveAsTable(f"{savePath}.{tableName}")

    logger.info(f"{'WriteDfToTable' :25} {savePath}.{tableName} ({mode})")
```

### Power BI Scan API

#### Functions

```python
def GetModifiedWorkspaces(access_token: str) -> list:
    """
    Calls GetModifiedWorkspaces API [https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-modified-workspaces]
    Excludes InActive Workspaces and Personal Workspaces
    parameters:
        access_token:       str     access token
    Returns:                str     list of workspaceId
    """

    headers = {"Authorization": f"Bearer {access_token}"}
    url = 'https://api.powerbi.com/v1.0/myorg/admin/workspaces/modified?excludeInActiveWorkspaces=true&excludePersonalWorkspaces=true'

    r = Request(method="get", url=url, headers=headers)
    workspaces = [workspace['id'] for workspace in r.json()]
    
    logger.info(f"{'GetModifiedWorkspaces':25} {len(workspaces)} workspaces returned")
    
    return workspaces

def PostWorkspaceInfo(access_token: str, workspaceIds: list) -> dict:
    """
    Calls PostWorkspaceInfo API [https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-post-workspace-info]
    Calls for all avilaible data {datasetExpressions=true, datasourceDetails=true, datasetSchema=true, getArtifactUsers=true, lineage=true}
    parameters:
        access_token:       str     access token
        workspaceIds:       list    list of 1-100 workspacesIds
    returns:                dict    {'scanid', 'createdDateTime', 'status'}
    """
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = 'https://api.powerbi.com/v1.0/myorg/admin/workspaces/getInfo?lineage=True&datasourceDetails=True&datasetSchema=True&datasetExpressions=True&getArtifactUsers=True'
    
    if len(workspaceIds) > 100:
        raise Exception(f"{'PostWorkspaceInfo':25} PostWorkspaceInfo API only accepts 100 workspaces at a time")
        return
    
    data = { 'workspaces': workspaceIds }
    scan = Request(method="post", url=url, headers=headers, data=data).json()
    
    logger.info(f"{'PostWorkspaceInfo':25} scanId {scan['id']} [{scan['status']}]")
    
    return scan

def GetScanStatus(access_token: str, scan:dict, delay:int = 2, max_retries:int = 5) -> dict:
    """
    Calls GetScanStatus API [https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-status]
    Calls until scan status is 'Succeeded' or max_retries (default: 5) exceeded
    parmeters:
        access_token:       str     access token
        scan:               dict    {'scanid', 'createdDateTime', 'status'}
        delay:              int     seconds to wait between retries (default: 2)
        max_retries:        int     max number of retries (default: 5)
    returns                 dict    {'scanid', 'createdDateTime', 'status'}
    """
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanStatus/{scan['id']}"
    
    for retry in range(max_retries):
        r = Request(method="get", url=url, headers=headers)
        scan = r.json()
        if scan['status'] != 'Succeeded':
            retry += 1
            if retry >= max_retries:
                Exception(f"{f'GetScanStatus({retry})':25} scanId {scan['id']} Exceeded max_retries limit ({max_retries})")
                return
            if retry > 0:
                logger.info(f"{f'GetScanStatus({retry})':25} scanId {scan['id']} [{scan['status']}] Retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2  # incremental backoff
    
    logger.info(f"{'GetScanStatus':25} scanId {scan['id']} [{scan['status']}]")
    
    return scan

def GetScanResult(access_token: str, scan:dict) -> dict:
    """
    Calls GetScanResult API [https://learn.microsoft.com/en-us/rest/api/power-bi/admin/workspace-info-get-scan-result]
    parameters:
        access_token:       str     access token
        scan:               dict    {'scanid', 'createdDateTime', 'status'}
    returns:                dict    {'scanid', 'createdDateTime', 'status'}
    """
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanResult/{scan['id']}"
    
    r = Request(method="get", url=url, headers=headers)
    
    logger.info(f"{'GetScanResult':25} scanId {scan['id']} complete")
    
    return r.json()

def GetApps(access_token: str):
    """
    Calls GetAppsAsAdmin API [https://learn.microsoft.com/en-us/rest/api/power-bi/admin/apps-get-apps-as-admin]
    parameters:
        access_token:       str     access token
    Returns:                dict    {'id', 'description', 'name', 'publishedBy, 'lastUpdate', 'workspaceId', 'users'}
    """
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = 'https://api.powerbi.com/v1.0/myorg/admin/apps?$top=5000'
    
    r = Request(method="get", url=url, headers=headers)
    
    logger.info(f"{'GetAppsAsAdmin':25}")
    
    return r.json()

```

#### Run

```python
access_token = GetAccessToken(client_id, client_secret, tenant_id, resource='https://analysis.windows.net/powerbi/api')

workspaces = GetModifiedWorkspaces(access_token)

scan_results = []
chunk_size = 100 ## PostWorkspaceInfo accepts 100 workspaces at a time

for chunk in [workspaces[i:i+chunk_size] for i in range(0, len(workspaces), chunk_size)]:
    scan = PostWorkspaceInfo(access_token, chunk)

    if scan['status'] != 'Succeeded':
        GetScanStatus(access_token, scan)

    scan_results.append(GetScanResult(access_token, scan))

apps = GetApps(access_token)
```

#### Apply Schema & Create Dataframes

```python
workspaceSchema = StructType([
    StructField('description', StringType(), True),
    StructField('id', StringType(), True),
    StructField('isOnDedicatedCapacity', BooleanType(), True),
    StructField('name', StringType(), True),
    StructField('state', StringType(), True),
    StructField('type', StringType(), True),
    StructField('capacityId', StringType(), True),
    StructField('defaultDatasetStorageFormat', StringType(), True),
    StructField('users', ArrayType( StructType([
        StructField('groupUserAccessRight', StringType(), True),
        StructField('emailAddress', StringType(), True),
        StructField('displayName', StringType(), True),
        StructField('identifier', StringType(), True),
        StructField('graphId', StringType(), True),
        StructField('principalType', StringType(), True),
        StructField('userType', StringType(), True)
        ])), True),
    StructField('reports', ArrayType( StructType([
        StructField('createdBy', StringType(), True),
        StructField('createdById', StringType(), True),
        StructField('createdDateTime', StringType(), True),
        StructField('datasetId', StringType(), True),
        StructField('id', StringType(), True),
        StructField('description', StringType(), True),
        StructField('modifiedBy', StringType(), True),
        StructField('modifiedById', StringType(), True),
        StructField('modifiedDateTime', StringType(), True),
        StructField('name', StringType(), True),
        StructField('reportType', StringType(), True),
        StructField('users', ArrayType( StructType([
            StructField('reportUserAccessRight', StringType(), True),
            StructField('emailAddress', StringType(), True),
            StructField('displayName', StringType(), True),
            StructField('identifier', StringType(), True),
            StructField('graphId', StringType(), True),
            StructField('principalType', StringType(), True),
            StructField('userType', StringType(), True),
            ])), True),
        ])), True),
    StructField('datasets', ArrayType( StructType([
        StructField('configuredBy', StringType(), True),
        StructField('configuredById', StringType(), True),
        StructField('contentProviderType', StringType(), True),
        StructField('createdDate', StringType(), True),
        StructField('id', StringType(), True),
        StructField('isEffectiveIdentityRequired',BooleanType(), True),
        StructField('isEffectiveIdentityRolesRequired', BooleanType(), True),
        StructField('name', StringType(), True),
        StructField('targetStorageMode', StringType(), True),
        StructField('description', StringType(), True),
        StructField('sensitivityLevel', StringType(), True),
        StructField('endorsmentDetails', StringType(), True),
        StructField('expressions', ArrayType( StructType([
            StructField('expression', StringType(), True),
            StructField('name', StringType(), True),
            StructField('description', StringType(), True),
            ])), True),
        StructField('tables', ArrayType( StructType([
            StructField('isHidden', BooleanType(), True),
            StructField('name', StringType(), True),
            StructField('source', StringType(), True),
            StructField('storageMode', StringType(), True),
            StructField('columns', ArrayType( StructType([
                StructField('columnType', StringType(), True),
                StructField('dataType', StringType(), True),
                StructField('isHidden', BooleanType(), True),
                StructField('name', StringType(), True),
                StructField('expression', StringType(), True)
                ])), True),
            StructField('measures', ArrayType( StructType([
                StructField('isHidden', BooleanType(), True),
                StructField('name', StringType(), True),
                StructField('description', StringType(), True),
                StructField('expression', StringType(), True)
                ])), True),
            ])), True),
        StructField('refreshSchedule', StructType([
            StructField('days', ArrayType(StringType(), True), True),
            StructField('times', ArrayType(StringType(), True),True),
            StructField('enabled', BooleanType(), True),
            StructField('localTimeZoneId', StringType(), True),
            StructField('notifyOption', StringType(), True),
            ]), True),
        StructField('directQueryRefreshSchedule', StructType([
            StructField('days', ArrayType(StringType(), True), True),
            StructField('times', ArrayType(StringType(), True),True),
            StructField('localTimeZoneId', StringType(), True),
            StructField('frequency', IntegerType(), True),
            ]), True),
        StructField('datasourceUsages', ArrayType( StructType([
            StructField('datasourceInstanceId', StringType(), True)
            ])), True),
        StructField('upstreamDatasets', ArrayType( StructType([
            StructField('targetDatasetId', StringType(), True),
            StructField('groupId', StringType(), True)
            ])), True),
        StructField('users', ArrayType( StructType([
            StructField('datasetUserAccessRight', StringType(), True),
            StructField('emailAddress', StringType(), True),
            StructField('displayName', StringType(), True),
            StructField('identifier', StringType(), True),
            StructField('graphId', StringType(), True),
            StructField('principalType', StringType(), True),
            StructField('userType', StringType(), True)
            ])), True),
        StructField('roles', ArrayType( StructType([
            StructField('name', StringType(), True),
            StructField('modelPermissions', StringType(), True),
            StructField('members', ArrayType( StructType([
                StructField('memberName', StringType(), True),
                StructField('memberId', StringType(), True),
                StructField('memberType', StringType(), True),
                StructField('identityProvider', StringType(), True)
                ])), True),
            StructField('tablePermissions', ArrayType( StructType([
                StructField('name', StringType(), True),
                StructField('filterExpression', StringType(), True)
                ])), True)
            ])), True)
        ])), True)
    ])
   
datasourceInstancesSchema = StructType([
    StructField('connectionDetails', StructType([
        StructField('extensionDataSourceKind', StringType()),
        StructField('extensionDataSourcePath', StringType()),  
        StructField('path', StringType()),
        StructField('url', StringType()),
        StructField('sharePointSiteUrl', StringType()),
        StructField('server', StringType())  
        ]), True),
    StructField('datasourceId', StringType(), True),
    StructField('datasourceType', StringType(), True),
    StructField('gatewayId', StringType(), True)
    ])
 
appsSchema = StructType([
    StructField('id', StringType(), True),
    StructField('description', StringType(), True),
    StructField('name', StringType(), True),
    StructField('workspaceId', StringType(), True),
    StructField('publishedBy', StringType(), True),
    StructField('lastUpdate', StringType(), True)
    ])
```

```python
workspacesdf = spark.createDataFrame([], schema = workspaceSchema)
datasourceInstancesdf = spark.createDataFrame([], schema = datasourceInstancesSchema)

for chunk in scan_results:
    df1 = spark.createDataFrame(chunk['workspaces'], schema = workspaceSchema)
    workspacesdf = workspacesdf.union(df1)
    df2 = spark.createDataFrame(chunk['datasourceInstances'], schema = datasourceInstancesSchema)
    datasourceInstancesdf = datasourceInstancesdf.union(df2)

appsdf = spark.createDataFrame(apps['value'], schema = appsSchema)

workspacesdf.createOrReplaceTempView('workspacesAll')
datasourceInstancesdf.createOrReplaceTempView('datasourceInstance')
appsdf.createOrReplaceTempView('apps')
```

#### Create views

```sql
%sql
-- datasourceInstances
  CREATE OR REPLACE TEMPORARY VIEW connectionDetails AS
  with x as (select *, connectionDetails.* from datasourceInstance)
  select * except(connectionDetails) from x;
 
-- workspaces
  CREATE OR REPLACE TEMPORARY VIEW workspaces AS
    SELECT * except (users, reports, datasets)
    FROM workspacesAll
  ;
 
-- workspaces | Users
  CREATE OR REPLACE TEMPORARY VIEW workspaceUsers AS
    WITH explode AS (SELECT id AS workspaceId, explode(users) AS users FROM workspacesAll),
    expand AS (SELECT *, users.* from explode)
    SELECT * except(users) FROM expand;
 
-- workspaces | reports*
  CREATE OR REPLACE TEMPORARY VIEW reportsAll AS
    WITH explode AS (SELECT id as workspaceId, explode(reports) AS reports FROM workspacesAll),
    expand AS (SELECT *, reports.* FROM explode)
    SELECT * FROM expand;
   
-- workspaces | reports
  CREATE OR REPLACE TEMPORARY VIEW reports AS
    SELECT * except(reports, users) FROM reportsAll;
 
-- workspaces | reports | Users
  CREATE OR REPLACE TEMPORARY VIEW ReportUsers AS
    WITH explode AS (SELECT id AS reportId, explode(users) AS users FROM reportsAll),
    expand AS (SELECT *, users.* FROM explode)
    SELECT * except(users) FROM expand;
 
-- workspaces | datasets*
  CREATE OR REPLACE TEMPORARY VIEW DatasetsAll AS
    WITH explode AS (select id AS workspaceId, explode(datasets) AS datasets FROM workspacesAll),
    expand AS (SELECT *, datasets.* FROM explode)
    SELECT * FROM expand;
 
-- workspaces | datasets
  CREATE OR REPLACE TEMPORARY VIEW datasets AS
    SELECT * except(datasets, expressions, tables, refreshSchedule, directQueryRefreshSchedule, upstreamDatasets, datasourceUsages, users, roles) FROM DatasetsAll;
 
-- workspaces | datasets | expressions
  CREATE OR REPLACE TEMPORARY VIEW datasetExpressions AS
    WITH explode AS (SELECT id AS datasetId, explode(expressions) AS expressions FROM DatasetsAll),
    expand AS (SELECT *, expressions.* FROM explode)
    SELECT * except(expressions) FROM expand;
 
-- workspaces | datasets | refreshSchedules
  CREATE OR REPLACE TEMPORARY VIEW datasetRefreshSchedules AS
    WITH expandrefreshSchedule AS (SELECT id AS datasetId, refreshSchedule.* FROM DatasetsAll),
    explodeRefreshSchedule1 AS (
      SELECT
      datasetId,
      localTimeZoneId,
      enabled,
      notifyOption,
      explode_outer(days) AS days,
      times
      FROM expandrefreshSchedule
    ),
    explodeRefreshSchedule2 AS (
      SELECT
      datasetId,
      localTimeZoneId,
      enabled,
      notifyOption,
      days,
      explode_outer(times) as times
      FROM explodeRefreshSchedule1
    ),
    expandDirectQueryRefreshSchedule AS (SELECT id AS datasetId, DirectQueryRefreshSchedule.* FROM DatasetsAll),
    explodeDirectQueryRefreshSchedule1 AS (
      SELECT
      datasetId,
      localTimeZoneId,
      frequency,
      explode_outer(days) AS days,
      times
      FROM expandDirectQueryRefreshSchedule
    ),
    explodeDirectQueryRefreshSchedule2 AS (
      SELECT
      datasetId,
      localTimeZoneId,
      frequency,
      days,
      explode_outer(times) as times
      FROM explodeDirectQueryRefreshSchedule1
    )
    SELECT
    datasetId,
    "RefreshSchedule" AS refreshScheduleType,
    localTimeZoneId,
    enabled,
    notifyOption,
    null AS frequency,
    days,
    times
    FROM explodeRefreshSchedule2
    WHERE enabled
    UNION ALL
    SELECT
    datasetId,
    "directQueryRefreshSchedule" AS refreshScheduleType,
    localTimeZoneId,
    null as enabled,
    null as notifyOption,
    frequency,
    days,
    times
    FROM explodeDirectQueryRefreshSchedule2
    WHERE localTimeZoneId is not null;
 
-- workspaces | datasets | upstreamDatasets
  CREATE OR REPLACE TEMPORARY VIEW datasetUpstreamDatasets AS
    WITH explode AS (SELECT id AS datasetId, explode(upstreamDatasets) AS upstreamDatasets FROM DatasetsAll),
    expand AS (SELECT *, upstreamDatasets.* FROM explode)
    SELECT * except(upstreamDatasets) FROM expand;
 
-- workspaces | datasets | datasourceUsages
  CREATE OR REPLACE TEMPORARY VIEW datasetsDatasorucesUsages AS
    WITH explode AS (SELECT id AS datasetId, explode(datasourceUsages) AS datasourceUsages FROM DatasetsAll),
    expand AS (SELECT *, datasourceUsages.* FROM explode)
    SELECT * except(datasourceUsages) FROM expand;
 
-- workspaces | datasets | users
  CREATE OR REPLACE TEMPORARY VIEW datasetsUsers AS
    WITH explode AS (SELECT id AS datasetId, explode(users) AS users FROM DatasetsAll),
    expand AS (SELECT *, users.* FROM explode)
    SELECT * except(users) FROM expand;
 
-- workspaces | datasets | tables *
  CREATE OR REPLACE TEMPORARY VIEW datasetsTablesAll AS
    WITH explode AS (SELECT id AS datasetId, explode(tables) AS tables FROM DatasetsAll),
    expand AS (SELECT *, tables.* FROM explode)
    SELECT concat(datasetId, name) AS datasetTableId, * FROM expand;
 
-- workspaces | datasets | tables
  CREATE OR REPLACE TEMPORARY VIEW datasetsTables AS
    SELECT * except(tables, columns, measures) FROM datasetsTablesAll;
 
-- workspaces | objects
  CREATE OR REPLACE TEMPORARY VIEW objects AS
    WITH workspace AS (
      SELECT
      id AS workspaceId,
      id AS object_id,
      null AS datasetId,
      'Workspace' AS objectType,
      name,
      null AS createdDateTime
      FROM workspaces
    ),
    dataset AS (
      SELECT
      workspaceId,
      id AS object_id,
      id AS datasetId,
      'Semantic Model' AS objectType,
      name,
      createdDate AS createdDateTime
      FROM datasets
    ),
    report AS (
      SELECT
      workspaceId,
      id AS object_id,
      datasetId,
      'Report' AS objectType,
      name,
      createdDateTime
      FROM reports
      WHERE name NOT LIKE '[App] %'
    ),
    reportApp AS (
      SELECT
      workspaceId,
      id AS object_id,
      datasetId,
      'Report App' AS objectType,
      name,
      createdDateTime
      FROM reports
      WHERE name LIKE '[App] %'
    )
    SELECT * FROM workspace
    UNION ALL
    SELECT * FROM dataset
    UNION ALL
    SELECT * FROM report
    UNION ALL
    SELECT * FROM reportApp;
```

#### Save Tables

```python
for view in ['connectionDetails', 'workspaces', 'reports', 'datasets', 'datasetsTables', 'datasetExpressions', 'datasetRefreshSchedules'
              ,'datasetUpstreamDatasets', 'datasetsDatasorucesUsages', 'objects', 'workspaceUsers', 'reportUsers', 'datasetsUsers', 'apps', 'tenantSettings']:

  WriteViewToTable(view, savePath)
```

### Graph API

#### Functions

```python
def getGraphAPI(entity:str='groups') -> list:
  """
  Calls List groups API [https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0&tabs=http], List users API [https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0&tabs=http] or App list API [https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0&tabs=http]
  parameters:
    type:       str     groups, users or apps (default: groups)
  returns:      list    array of users, groups or apps
  """
 
  if entity not in ('groups', 'users', 'apps'):
    raise Exception(f"Invalid type: {entity}")
 
  access_token = GetAccessToken(client_id, client_secret, tenant_id, resource='https://graph.microsoft.com')
 
  headers = {"Authorization": f"Bearer {access_token}"}

  if entity == "groups":
    url = https://graph.microsoft.com/v1.0/groups?$expand=members($select=id,displayName,mail,userType)
  if entity == "users":
      url = https://graph.microsoft.com/v1.0/users
  if entity == "apps":
      url = https://graph.microsoft.com/v1.0/applications
 
  items = []
 
  while True:
    r = Request(method="get", url=url, headers=headers).json()
    newItems = [item for item in r['value'] if item not in items]
    items += newItems
    logger.info(f"{'getGroupsGraphAPI':25} {len(items)} {entity} processed")
    if '@odata.nextLink' not in r:
      break
    url = r['@odata.nextLink']
 
  logger.info(f"{'getGroupsGraphAPI':25} {len(items)} {entity} returned")

  return items
```

#### Run

```python
groups = getGraphAPI("groups")
users = getGraphAPI("users")
apps = getGraphAPI("apps")
```

#### Apply Schema & Create Dataframes

```python
groupsSchema = StructType([
  StructField("id", StringType(), True),
  StructField("displayName", StringType(), True),
  StructField("description", StringType(), True),
  StructField("members", ArrayType(MapType(StringType(), StringType())), True)
  ])
 
usersSchema = StructType([
  StructField("id", StringType(), True),
  StructField("displayName", StringType(), True),
  StructField("userPrincipalName", StringType(), True)
  ])
 
appsSchema = StructType([
  StructField("appId", StringType(), True),
  StructField("displayName", StringType(), True)
  ])
 
aadGroups = spark.createDataFrame(groups, schema=groupsSchema)
aadUsers = spark.createDataFrame(users, schema=usersSchema)
aadApps = spark.createDataFrame(apps, schema=appsSchema)
```

#### Save Tables

```python
for tableName, df in {'aadGroups': aadGroups, 'aadUsers': aadUsers, 'aadApps': aadApps}.items():
    WriteDfToTable(df, savePath, tableName)
```

### GraphFrames

#### Dependencies

```python
from graphframes import *
from graphframes.lib import Pregel
```

#### Generate vertices and edges

```python
v = spark.sql(f"""
  select
  concat(wu.workspaceId, wu.groupUserAccessRight) as id,
  wu.workspaceId as nodeId,
  w.name,
  'Workspace' as type,
  wu.groupUserAccessRight as accessRight
  from {savePath}.workspaceusers as wu
  left join {savePath}.workspaces as w
    on wu.workspaceId = w.id
  """)\
  .union(spark.sql(f"""
    select
    concat(ru.reportId, ru.reportUserAccessRight) as id,
    ru.reportId as nodeId,
    r.name,
    case
      when left(r.name, 5) = '[App]' then 'Report App'
      else 'Report'
    end as type,
    ru.reportUserAccessRight as accessRight
    from {savePath}.reportUsers as ru
    left join {savePath}.reports as r
      on ru.reportId = r.id
  """))\
  .union(spark.sql(f"""
    select
    concat(du.datasetId, du.datasetUserAccessRight) as id,
    du.datasetId as nodeId,
    d.name,
    'Dataset' type,
    du.datasetUserAccessRight as accessRight
    from {savePath}.datasetsusers as du
    left join {savePath}.datasets as d
      on du.datasetId = d.id
  """))\
  .union(spark.sql(f"""
    select
    id,
    id as nodeId,
    displayName as name,
    'Group' as type,
    null as accessRight
    from {savePath}.aadgroups
  """))\
  .union(spark.sql(f"""
    select
    id,
    id as nodeId,
    displayName as name,
    'User' as type,
    null as accessRight
    from {savePath}.aadusers
  """))\
  .union(spark.sql(f"""
    select
    appId AS id,
    appId as nodeId,
    displayName as name,
    'App' as type,
    null as accessRight
    from {savePath}.aadapps
  """))\
  .distinct()
 
e = spark.sql(f"""
  select
  concat(workspaceId, groupUserAccessRight) as src,
  graphId as dst,
  groupUserAccessRight as edge_type
  from {savePath}.workspaceUsers
  """)\
  .union(spark.sql(f"""
    select
    concat(reportId, reportUserAccessRight) as src,
    graphId as dst,
    reportUserAccessRight as edge_type
    from {savePath}.reportUsers
  """))\
  .union(spark.sql(f"""
    select
    concat(datasetId, datasetUserAccessRight) as src,
    graphId as dst,
    datasetUserAccessRight as edge_type
    from {savePath}.datasetsusers
  """))\
  .union(
    spark.sql(f"select id, explode(members) as member from {savePath}.aadgroups")\
          .selectExpr("id as groupId", "member['id'] as memberId", "member['userType'] as userType", "member['dispayName'] as displayName" )\
          .selectExpr("groupId as src", "memberId as dst", "null as edge_type")\
   )

#   vertices                                                                          
# +-------------------------------------------------------------------------------------------------------------------+
# | id                                               | nodeId                               | type      | accessRight |
# +-------------------------------------------------------------------------------------------------------------------+
# | a2cc72b4-50e8-4c78-b875-6b1d6af6f04fAdmin        | a2cc72b4-50e8-4c78-b875-6b1d6af6f04f | workspace | Admin       |
# | c6434512-6cec-45d6-91a0-e24d6ec8ae3fContributor  | c6434512-6cec-45d6-91a0-e24d6ec8ae3f | workspace | Contributor |
# | 18f3f38d-d4e5-4861-9633-43c87cd6f444             | 18f3f38d-d4e5-4861-9633-43c87cd6f444 | group     |             |
# +-------------------------------------------------------------------------------------------------------------------+

#   edges
# +-------------------------------------------+--------------------------------------+------------+
# |  src                                      |  dst                                 | edge_type  |
# +-------------------------------------------+--------------------------------------+------------+
# | a2cc72b4-50e8-4c78-b875-6b1d6af6f04fAdmin | 27600b6f-6556-43ad-98de-9a6e068a8500 | admin      |
# | 32282557-43f0-4182-9541-d9f3c44029c6      | bba07815-4eaf-4798-bc76-f7e55747cb3b |            |
# | a9497daf-95e4-42aa-9edf-658edeb2205d      | ccb5abe8-8890-49a4-a8fc-d3bc2c3821b" |            |
# +-------------------------------------------+--------------------------------------+------------+
```

#### Save Vertices and Edges

```python
for tableName, df in {'v': v, 'e': e}.items():
  WriteDfToTable(df, savePath, tableName)
```

#### Generate Graph

```python
g = GraphFrame(v, e)
```

#### Pregel

```python
# https://stackoverflow.com/questions/75410401/graphframes-pregel-doesnt-`converge`

# TODO Want to be able to use edge attr (UserAccessRight) in pregel so that can have single node for workspace/artifact, instead having to generate vertices for each workspace/artifact crossjoined with AccessRole. Not been able to find the right syntax to allow for it. If can do that, then can drop nodeID and accessRight from vertices

mappedRoles = (
    g.pregel
    .setMaxIter(10)                 # MaxIter should be set to a value at least as large as the longest path
    .setCheckpointInterval(2)       # checkpointInterval should be set to a value smaller than maxIter, can be added to save state to avoid stackOverflowError due to long lineage chains
    .withVertexColumn( 
        "resolved_roots",           # New column for the resolved roots
        # The value is initialized by the original root value:
        f.when( 
            f.col('type').isin(['workspace', 'report', 'dataset']),
            f.array(f.to_json(f.struct('type', 'nodeId', 'accessRight')))
        ).otherwise(f.array()),
        # When new value arrives to the node, it gets merged with the existing list:
        f.when(
            Pregel.msg().isNotNull(), 
            f.array_union(Pregel.msg(), f.col('resolved_roots')) 
        ).otherwise(f.col("resolved_roots"))
    )
    .sendMsgToDst(Pregel.src("resolved_roots"))
    # Once the message is delivered it is updated with the existing list of roots at the node:
    .aggMsgs(f.flatten(f.collect_list(Pregel.msg())))
    .run()
)

# +-------------------------------------------+--------------------------------------------------------------------------------------------------------------+---------------------------------------+-----------+--------------+
# | id                                        | resolved_roots                                                                                               |  nodeId                               | type      | accessRight  |
# +-------------------------------------------+--------------------------------------------------------------------------------------------------------------+---------------------------------------+-----------+--------------+
# | 94c3fe39-0ed5-4eeb-a230-2e444638930fAdmin | ["{\"type\":\"workspace\", \"id\":\"94c3fe39-0ed5-4eeb-a230-2e444638930f\",\"accessRight\":\"Member\"}"]     |  94c3fe39-0ed5-4eeb-a230-2e444638930f | workspace | Contributor  |
# | 5de589b4-f539-468d-96c8-7fd1034faf9e      | ["{\"type\":\"workspace\", \"id\":\"31633c8d-6cac-4738-b6f3-f63ebbf29ea0\",\"accessRight\":\"Viewer\"}",.."] |  5de589b4-f539-468d-96c8-7fd1034faf9e | user      | null         |
# +-------------------------------------------+--------------------------------------------------------------------------------------------------------------+---------------------------------------+-----------+--------------+
```

```python
mappedRoles.createOrReplaceTempView("accessToObject")
 
accessToObject = spark.sql(f"""
  with explode as (select id, name, explode(resolved_roots) as roots, nodeID, type, accessRight from accessToObject),
  defineStruct as (select id, name, type, from_json(roots, 'type string, nodeId string, accessRight string') as roots from explode)
  select
  defineStruct.id,
  aadusers.userPrincipalName,
  defineStruct.name,
  defineStruct.type,
  defineStruct.roots.nodeId as accessToObjectId,
  defineStruct.roots.type as accessToObjectType,
  defineStruct.roots.accessRight as accessToObjectPermission,
  concat(defineStruct.roots.nodeId, defineStruct.roots.accessRight) as accessToObjectGroupId,
  case
      when workspaceusers.workspaceId is not null or datasetsusers.datasetId is not null or reportusers.reportId is not null then 'Direct'
      else 'Indirect'
  end as accessToObjectDirectlyGranted
  from defineStruct
  left join {savePath}.workspaceusers
      on defineStruct.roots.nodeId = workspaceusers.workspaceId and defineStruct.roots.accessRight = workspaceusers.groupUserAccessRight -- src
      and defineStruct.id = workspaceusers.graphId -- dst
  left join {savePath}.datasetsusers
      on defineStruct.roots.nodeId = datasetsusers.datasetId and defineStruct.roots.accessRight = datasetsusers.datasetUserAccessRight -- src
      and defineStruct.id = datasetsusers.graphId -- dst
  left join {savePath}.reportusers
      on defineStruct.roots.nodeId = reportusers.reportId and defineStruct.roots.accessRight= reportusers.reportUserAccessRight -- src
      and defineStruct.id = reportusers.graphId -- dst
  left join {savePath}.aadusers
      on aadusers.id = defineStruct.id
  where defineStruct.type not in ('Workspace', 'Report', 'Dataset', 'Report App')
""")
 
for tableName, df in {'accessToObject': accessToObject}.items():
  WriteDfToTable(df, savePath, tableName)
```

#### Queries the results

Now we are able to filter out any AAD Group or user and we will get back a list of all the Workspace, Report and Semantic Model roles they have inherited.

```python
usersAccessRights = spark.sql(f"select * from {savePath}.accessToObjectEdges")
display(usersAccessRights.filter("name = 'someAADGroup'"))
```

# Conclusion

Now we have a dataset that we can query and figure out what groups and users have which permissions. This all would be possible with a recursive CTE in SQL, but that is not supported by pyspark. Additionally now that we have a graph we are able to run graph algorithm such as [Label Propagation Algorithm](https://graphframes.github.io/graphframes/docs/_site/user-guide.html#label-propagation-algorithm-lpa) to find clusters in AAD groups and potentially consolidate and simplify. 

PS. If anyone knows the syntax use a edge attribute in a pregel message, I would love to know. 