---
title: Exporting Power BI Tenant Settings
description: Exporting Power BI Tenant Settings with the Fabric List Tenant Settings API
image: /assets/images/blog/2025/2025-02-09-TenantSettings/tenantSettings.png
date:
  created: 2025-02-09
  updated: 2025-10-19
authors:
  - jDuddy
comments: true
categories:
  - Administration
slug: posts/TenantSettings
---
 
With Power BI APIs spread across Power BI and Fabric APIs, it's easy to overlook the introduction of valuable ones like [List Tenant Settings](https://learn.microsoft.com/en-us/rest/api/fabric/admin/tenants/list-tenant-settings?tabs=HTTP). Previously, solutions for exporting Tenant settings involved scraping the Admin Portal WebPage, as highlighted in a [post](https://data-goblins.com/power-bi/export-power-bi-tenant-settings) by [Kurt Buhler](https://www.linkedin.com/in/kurtbuhler/). The inclusion of this API is a significant improvement. It eliminates the need for a Privileged Access request solely to verify a configuration, making it more accessible for non-Fabric Admins to review tenant settings independently, thus reducing administrative workload. Moreover, by continuously updating this data, you can monitor the evolution of your settings over time.

## List Tenant Settings

!!! quote "Microsoft Docs: list-tenant-settings"

    Permissions
    The caller must be a Fabric administrator or authenticate using a service principal.
    
    Required Delegated Scopes
    Tenant.Read.All or Tenant.ReadWrite.All
    
    `#!http GET https://api.fabric.microsoft.com/v1/admin/tenantsettings`
        
    -- <cite>[Microsoft Docs: list-tenant-settings](https://learn.microsoft.com/en-us/rest/api/fabric/admin/tenants/list-tenant-settings?tabs=HTTP)</cite>

## Script

We can get the tenant setting and write them to a delta table like this:

```python
from pyspark.sql import SparkSession
from pyspark.sql.types import *
import requests
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

def GetTenantSettings():
    """
    Calls GetAppsAsAdmin API [https://learn.microsoft.com/en-us/rest/api/fabric/admin/tenants/list-tenant-settings?tabs=HTTP]
    parameters:
        access_token:       str     access token
    Returns:                dict
    """
    
    access_token = GetAccessToken(client_id, client_secret, tenant_id, resource='https://api.fabric.microsoft.com')
    headers = {"Authorization": f"Bearer {access_token}"}
    
    url = 'https://api.fabric.microsoft.com/v1/admin/tenantsettings'
    r = Request(method="get", url=url, headers=headers)
    
    logger.info(f"{'GetTenantSettings':25}")
    return r.json()

tenantSettings = GetTenantSettings()

tenantSettingsSchema = StructType([
    StructField('canSpecifySecurityGroups', BooleanType(), True),
    StructField('enabled', BooleanType(), True),
    StructField('enabledSecurityGroups', ArrayType( StructType([
        StructField('name', StringType(), True),
        StructField('graphId', StringType(), True)
        ])), True),
    StructField('settingName', StringType(), True),
    StructField('tenantSettingGroup', StringType(), True),
    StructField('title', StringType(), True),
    StructField('delegateToCapacity', StringType(), True),
    StructField('properties', ArrayType( StructType([
        StructField('name', StringType(), True),
        StructField('type', StringType(), True),
        StructField('value', StringType(), True)
        ])), True),
    StructField('delegateToDomain', StringType(), True),
    StructField('delegateToWorkspace', StringType(), True)
])

tenantSettingsdf = spark.createDataFrame(tenantSettings['tenantSettings'], schema = tenantSettingsSchema)
WriteDfToTable(tenantSettingsdf, savePath, tenantSettings)
```