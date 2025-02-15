---
title: Visualizing Power BI Permission Inheritance
description: Using Deneb Force Directed Graph to visualizing the inheritance of Power BI permission 
author: duddy
date: 2025-01-26 10:00:00 +0000
categories: [Power BI Administration, Permissions]
tags: [deneb, vega, force directed, graphframes, pyspark]
pin: false
image:
  path: /assets/img/0019-ForceDirected/force%20directed.gif
  alt: force directed deneb
---
 
In my previous [post](https://evaluationcontext.github.io/posts/graphframes/) I used the [Power BI Scanner APIs](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview), [Graph APIs](https://learn.microsoft.com/en-us/graph/overview?context=graph%2Fapi%2F1.0&view=graph-rest-1.0) and [GraphFrames](https://graphframes.github.io/graphframes/docs/_site/index.html) to generate a graph to disseminate Access Roles from Workspaces, Reports and Semantic Models directly granted to AAD groups, to all downstream members. Now we are going to create some visualizations to make this data more accessible.

> I updated some code in my previous post to align with the data model in this post. Plus updated this post to use triplet form instead of union of vertices and edges as it makes working with the graph simpler in Power BI
{: .prompt-info }

## GraphFrame

We need to add a extra table `accessToObjectEdges`{:.txt} to the previous code from the previous post to power the visual, which is a triplet form of the graph. `accessToObjectEdges.accessToObjectGroupId`{:.txt} will be used to label all nodes that inherits permission from a objects (Workspace, Report, Semantic Model) role so we can trim unnecessary nodes from subgraphs.

```python
g.triplets.createOrReplaceTempView("triplets")
 
accessToObjectEdges = spark.sql(f"""
  select
  t.src.nodeId as srcId,
  t.src.name as srcName,
  t.src.type as srcType,
  t.dst.nodeId as dstId,
  t.dst.name as dstName,
  t.dst.type as dstType,
  coalesce(r.accessToObjectGroupId, concat(t.src.nodeID, t.src.accessRight)) as accessToObjectGroupId
  from triplets as t
  left join {savePath}.accessToObject as r
      on t.src.nodeID = r.id
  """
)
 
for tableName, df in {'accessToObjectEdges': accessToObjectEdges}.items():
  WriteDfToTable(df, savePath, tableName)
```

## Power BI Data Model

The point of running the Scanner API was to create a report that catalogues everything in Power BI. After playing around for a bit I ended with up a similar model to [Rui Romano's](https://www.linkedin.com/in/ruiromano/) [PBI Scanner](https://github.com/RuiRomano/pbiscanner) solution. To reduce the complexity of measures, all of the main artifacts (Workspaces, Report, Semantic Models) are considered as objects in a object table. As a side note this model integrates perfectly with the [Fabric Log Analytics for Analysis Services Engine report template](https://github.com/microsoft/PowerBI-LogAnalytics-Template-Reports/blob/main/FabricASEngineAnalytics/README.md), giving all tenant metadata and alongside refresh and query performance (Artifacts == Objects).

I imported the table above and called it `accessToObject Edges`{:.txt}. It is disconnected from the model so that we can use DAX measures to filter the graphs to give specific sub-graphs, from the perspective of specific objects or users. Additional I added a `Vertex Type`{:.txt} dimension to filter nodes to clear the graph up when required.

Rather than just listing permission in a table, lets create a visualization to help make the data more understandable.

## Deneb

I tried using the [Power BI Force-Directed Graph visual](https://appsource.microsoft.com/en-cy/product/power-bi-visuals/WA104380764?tab=Overview) but the results were not what I was looking for, so I turned to Deneb. I found [Davide Bacci's](https://www.linkedin.com/in/davbacci/) [Force Directed Graph example](https://github.com/PBI-David/Deneb-Showcase/tree/main/Force%20Directed%20Graph) to be a good starting point.

### Object Permissions

We create a page with the Deneb visual, and create the measure below. We add the `[Edge Selection]`{:.txt} measure to the filter well of the Deneb visual and filter to where the measure = 1.

![Force Directed gif](/assets/img/0019-ForceDirected/force%20directed.gif)

```dax
Edge Selection =
var singleUser = HASONEFILTER( accessToObject[name] )
var FilteredUsers =
    FILTER(
        'accessToObject Edges'
        ,var user = SELECTEDVALUE( accessToObject[name] )
        RETURN
        ('accessToObject Edges'[srcType] <> "User" &&  'accessToObject Edges'[dstType] <> "User")
        || ('accessToObject Edges'[srcType] = "User" && 'accessToObject Edges'[srcName] = user)
        || ('accessToObject Edges'[dstType] = "User" && 'accessToObject Edges'[dstName] = user)
    )
 
RETURN
SWITCH(
    true
    ,not ISCROSSFILTERED( accessToObject )
        ,0
    ,COUNTROWS( DISTINCT( INTERSECT( VALUES( accessToObject[accessToObjectGroupId] ), VALUES( 'accessToObject Edges'[accessToObjectGroupId] ) ) ) ) > 0
    && COUNTROWS( DISTINCT( INTERSECT( VALUES( 'Vertex Type'[Type] ), VALUES( 'accessToObject Edges'[srcType] ) ) ) ) > 0
    && COUNTROWS( DISTINCT( INTERSECT( VALUES( 'Vertex Type'[Type] ), VALUES( 'accessToObject Edges'[dstType] ) ) ) ) > 0
    && IF( singleUser, COUNTROWS( FilteredUsers ) > 0, true )
        ,1
)
```

### Vega Spec

I wanted to use [Bee Swarm](https://vega.github.io/vega/examples/beeswarm-plot/) to pin objects to the left and user/apps to the right and groups in the middle. But I am still quite new to Vega and I couldn't quite get the syntax right to achieve this. If anyone can get to this work for this spec I would be very interested in seeing it.

```json
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "Based off Force Directed example by David Bacci:https://github.com/PBI-David/Deneb-Showcase/blob/main/Force%20Directed%20Graph/Spec.json",
  "padding": {
    "left": 0,
    "right": 0,
    "top": 0,
    "bottom": 0
  },
 
  "signals": [
    {"name": "xrange", "update": "[0, width]"},
    {"name": "yrange", "update": "[height, 0]"},
    {"name": "xext","update": "[0, width]"},
    {"name": "yext","update": "[height, 0]"},
    {
      "name": "down",
      "value": null,
      "on": [
        {
          "events": "mouseup,touchend",
          "update": "null"
        },
        {
          "events": "mousedown, touchstart",
          "update": "xy()"
        },
        {
          "events": "symbol:mousedown, symbol:touchstart",
          "update": "null"
        }
      ]
    },
    {
      "name": "xcur",
      "value": null,
      "on": [
        {
          "events": "mousedown, touchstart, touchend",
          "update": "xdom"
        }
      ]
    },
    {
      "name": "ycur",
      "value": null,
      "on": [
        {
          "events": "mousedown, touchstart, touchend",
          "update": "ydom"
        }
      ]
    },
    {
      "name": "delta",
      "value": [0, 0],
      "on": [
        {
          "events": [
            {
              "source": "window",
              "type": "mousemove",
              "consume": true,
              "between": [
                {"type": "mousedown"},
                {
                  "source": "window",
                  "type": "mouseup"
                }
              ]
            },
            {
              "type": "touchmove",
              "consume": true,
              "filter": "event.touches.length === 1"
            }
          ],
          "update": "down ? [down[0]-x(), y()-down[1]] : [0,0]"
        }
      ]
    },
    {
      "name": "anchor",
      "value": [0, 0],
      "on": [
        {
          "events": "wheel",
          "update": "[invert('xscale', x()), invert('yscale', y())]"
        },
        {
          "events": {
            "type": "touchstart",
            "filter": "event.touches.length===2"
          },
          "update": "[(xdom[0] + xdom[1]) / 2, (ydom[0] + ydom[1]) / 2]"
        }
      ]
    },
    {
      "name": "zoom",
      "value": 1,
      "on": [
        {
          "events": "wheel!",
          "force": true,
          "update": "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
        },
        {
          "events": {"signal": "dist2"},
          "force": true,
          "update": "dist1 / dist2"
        },
        {
          "events": [
            {
              "source": "view",
              "type": "dblclick"
            }
          ],
          "update": "1"
        }
      ]
    },
    {
      "name": "dist1",
      "value": 0,
      "on": [
        {
          "events": {
            "type": "touchstart",
            "filter": "event.touches.length===2"
          },
          "update": "pinchDistance(event)"
        },
        {
          "events": {"signal": "dist2"},
          "update": "dist2"
        }
      ]
    },
    {
      "name": "dist2",
      "value": 0,
      "on": [
        {
          "events": {
            "type": "touchmove",
            "consume": true,
            "filter": "event.touches.length===2"
          },
          "update": "pinchDistance(event)"
        }
      ]
    },
    {
      "name": "xdom",
      "update": "xext",
      "on": [
        {
          "events": {"signal": "delta"},
          "update": "[xcur[0] + span(xcur) * delta[0] / width, xcur[1] + span(xcur) * delta[0] / width]"
        },
        {
          "events": {"signal": "zoom"},
          "update": "[anchor[0] + (xdom[0] - anchor[0]) * zoom, anchor[0] + (xdom[1] - anchor[0]) * zoom]"
        },
        {
          "events": [
            {
              "source": "view",
              "type": "dblclick"
            }
          ],
          "update": "xrange"
        }
      ]
    },
    {
      "name": "ydom",
      "update": "yext",
      "on": [
        {
          "events": {"signal": "delta"},
          "update": "[ycur[0] + span(ycur) * delta[1] / height, ycur[1] + span(ycur) * delta[1] / height]"
        },
        {
          "events": {"signal": "zoom"},
          "update": "[anchor[1] + (ydom[0] - anchor[1]) * zoom, anchor[1] + (ydom[1] - anchor[1]) * zoom]"
        },
        {
          "events": [
            {
              "source": "view",
              "type": "dblclick"
            }
          ],
          "update": "yrange"
        }
      ]
    },
    {
      "name": "size",
      "update": "clamp(20 / span(xdom), 1, 1000)"
    },
    {
      "name": "cx",
      "update": "width / 2",
      "on": [
        {
          "events": "[symbol:mousedown, window:mouseup] > window:mousemove",
          "update": " cx==width/2?cx+0.001:width/2"
        }
      ]
    },
    {
      "name": "cy",
      "update": "height / 2"
    },
    {
      "name": "nodeRadiusKey",
      "description": "q=increase size, a=decrease size",
      "value": 8,
      "on": [
        {
          "events": "window:keypress",
          "update": "event.key=='a'&&nodeRadiusKey>1?nodeRadiusKey-1:event.key=='q'?nodeRadiusKey+1:nodeRadiusKey"
        }
      ]
    },
    {
      "name": "nodeRadius",
      "value": 17,
      "on": [
        {
          "events": {
            "signal": "nodeRadiusKey"
          },
          "update": "nodeRadiusKey"
        }
      ]
    },
    {"name": "nodeCharge","value": -0},
    {"name": "linkDistance","value": 5
    },
    {
      "description": "State variable for active node fix status.",
      "name": "fix",
      "value": false,
      "on": [
        {
          "events": "symbol:mouseout[!event.buttons], window:mouseup",
          "update": "false"
        },
        {
          "events": "symbol:mouseover",
          "update": "fix || true",
          "force": true
        },
        {
          "events": "[symbol:mousedown, window:mouseup] > window:mousemove!",
          "update": "xy()",
          "force": true
        }
      ]
    },
    {
      "description": "Graph node most recently interacted with.",
      "name": "node",
      "value": null,
      "on": [
        {
          "events": "symbol:mouseover",
          "update": "fix === true ? datum.index : node"
        }
      ]
    },
    {
      "name": "nodeHover",
      "value": {
        "id": null,
        "connections": []
      },
      "on": [
        {
          "events": "symbol:mouseover",
          "update": "{'id':datum.index, 'connections':split(datum.sources+','+datum.targets,',')}"
        },
        {
          "events": "symbol:mouseout",
          "update": "{'id':null, 'connections':[]}"
        }
      ]
    },
    {
      "description": "Flag to restart Force simulation upon data changes.",
      "name": "restart",
      "value": false,
      "on": [
        {
          "events": {"signal": "fix"},
          "update": "fix && fix.length"
        }
      ]
    }
  ],
  "data": [
    {"name": "dataset" },
    {
      "name": "link-data",
      "source": "dataset",
      "transform": [
        {
          "type": "project",
          "fields": ["srcId", "srcName", "srcType", "dstId", "dstName", "dstType"],
          "as": ["source", "srcName", "srcType", "target", "dstName", "dstType"]
        }
      ]
    },
    {
      "name": "source-connections",
      "source": "link-data",
      "transform": [
        {
          "type": "aggregate",
          "groupby": ["source"],
          "ops": ["values"],
          "fields": ["source"],
          "as": ["connections"]
        },
        {
          "type": "formula",
          "as": "targets",
          "expr": "pluck(datum.connections, 'target')"
        }
      ]
    },
    {
      "name": "target-connections",
      "source": "link-data",
      "transform": [
        {
          "type": "aggregate",
          "groupby": ["target"],
          "ops": ["values"],
          "fields": ["source"],///
          "as": ["connections"]
        },
        {
          "type": "formula",
          "as": "sources",
          "expr": "pluck(datum.connections, 'source')"
        }
      ]
    },
    {
      "name": "src",
      "source": "dataset",
      "transform": [
        {
          "type": "project",
          "fields": ["srcId", "srcName", "srcType"],
          "as": ["id", "Name", "Type"]
        }
      ]
    },
    {
      "name": "dst",
      "source": "dataset",
      "transform": [
        {
          "type": "project",
          "fields": ["dstId", "dstName", "dstType"],
          "as": ["id", "Name", "Type"]
        }
      ]
    },
    {
      "name": "vertices",
      "source": ["src", "dst"],
      "transform": [
        {
          "type": "aggregate",
          "groupby": ["id", "Name", "Type"]
        },
        {
          "type": "project",
          "fields": ["id", "Name", "Type"]
        }
      ]
    },
    {
      "name": "node-data",
      "source": "vertices",
      "transform": [
        {
          "type": "lookup",
          "from": "source-connections",
          "key": "source",
          "fields": ["id"],
          "values": ["targets"],
          "as": ["targets"],
          "default": [""]
        },
        {
          "type": "lookup",
          "from": "target-connections",
          "key": "target",
          "fields": ["id"],
          "values": ["sources"],
          "as": ["sources"],
          "default": [""]
        },
        {
          "type": "force",
          "iterations": 300,
          "restart": {
            "signal": "restart"
          },
          "signal": "force",
          "forces": [
            {
              "force": "center",
              "x": {"signal": "cx"},
              "y": {"signal": "cy"}
            },
            {
              "force": "collide",
              "radius": {
                "signal": "sqrt(4 * nodeRadius * nodeRadius)"
              },
              "iterations": 1,
              "strength": 0.7
            },
            {
              "force": "nbody",
              "strength": {
                "signal": "nodeCharge"
              }
            },
            {
              "force": "link",
              "links": "link-data",
              "distance": {
                "signal": "linkDistance"
              },
              "id": "id"
            }
          ]
        },
        {
          "type": "formula",
          "as": "fx",
          "expr": "fix[0]!=null && node==datum.index ?invert('xscale',fix[0]):null"
        },
        {
          "type": "formula",
          "as": "fy",
          "expr": "fix[1]!=null && node==datum.index ?invert('yscale',fix[1]):null"
        }
      ]
    }
  ],
  "scales": [
    {
      "name": "color",
      "type": "ordinal",
      "domain": ["Workspace", "Dataset", "Report", "Report App", "Group", "User", "App"],
      "range": ["#8661c5", "#01b8aa", "#FFB900", "#634e15", "#0078d4", "#999999", "#5A7378"]
    },
    {
      "name": "xscale",
      "zero": false,
      "domain": {"signal": "xdom"},
      "range": {"signal": "xrange"}
    },
    {
      "name": "yscale",
      "zero": false,
      "domain": {"signal": "ydom"},
      "range": {"signal": "yrange"}
    }
  ],
  "legends": [
    {
      "fill": "color",
      "encode": {
        "title": {
          "update": {
            "fontSize": {"value": 10}
          }
        },
        "labels": {
          "interactive": true,
          "update": {
            "fontSize": {"value": 10},
            "fill": {"value": "black"}
          }
        },
        "symbols": {
          "update": {
            "stroke": {"value": "transparent"}
          }
        },
        "legend": {
          "update": {
            "stroke": {"value": "#ccc"},
            "strokeWidth": {"value": 0}
          }
        }
      }
    }
  ],
  "marks": [
   
    {
      "type": "path",
      "name": "links",
      "from": {"data": "link-data"},
      "interactive": false,
      "encode": {
        "update": {
          "stroke": {
            "signal": "datum.source.index!=nodeHover.id && datum.target.index!=nodeHover.id ? '#929399':merge(hsl(scale('color', datum.source.Type)), {l:0.64})"
          },
          "strokeWidth": {
            "signal": "datum.source.index!=nodeHover.id && datum.target.index!=nodeHover.id ? 0.2:1"
          }
        }
      },
      "transform": [
        {
          "type": "linkpath",
          "require": {
            "signal": "force"
          },
          "shape": "line",
          "sourceX": {
            "expr": "scale('xscale', datum.datum.source.x)"
          },
          "sourceY": {
            "expr": "scale('yscale', datum.datum.source.y)"
          },
          "targetX": {
            "expr": "scale('xscale', datum.datum.target.x)"
          },
          "targetY": {
            "expr": "scale('yscale', datum.datum.target.y)"
          }
        },
        {
          "type": "formula",
          "expr": "atan2(datum.datum.target.y - datum.datum.source.y,datum.datum.source.x - datum.datum.target.x)",
          "as": "angle1"
        },
        {
          "type": "formula",
          "expr": "(datum.angle1>=0?datum.angle1:(2*PI + datum.angle1)) * (360 / (2*PI))",
          "as": "angle2"
        },
        {
          "type": "formula",
          "expr": "(360-datum.angle2)*(PI/180)",
          "as": "angle3"
        },
        {
          "type": "formula",
          "expr": "(cos(datum.angle3)*(nodeRadius+5))+(scale('xscale',datum.datum.target.x))",
          "as": "arrowX"
        },
        {
          "type": "formula",
          "expr": "(sin(datum.angle3)*(nodeRadius+5))+(scale('yscale',datum.datum.target.y))",
          "as": "arrowY"
        }
      ]
    },
    {
      "type": "symbol",
      "name": "arrows",
      "zindex": 1,
      "from": {"data": "links"},
      "encode": {
        "update": {
          "shape": {
            "value": "triangle"
          },
          "angle": {
            "signal": "-datum.angle2-90"
          },
          "x": {
            "signal": "datum.arrowX"
          },
          "y": {
            "signal": "datum.arrowY"
          },
          "text": {"signal": "'▲'"},
          "fill": {
            "signal": "datum.datum.source.index!=nodeHover.id && datum.datum.target.index!=nodeHover.id ? '#929399':merge(hsl(scale('color', datum.datum.source.Type)), {l:0.64})"
          },
          "size": {
            "signal": "nodeRadius==1?0:30"
          }
        }
      }
    },
    {
      "name": "nodes",
      "type": "symbol",
      "zindex": 1,
      "from": {"data": "node-data"},
      "encode": {
        "update": {
          "opacity": {"value": 1},
          "fill": {
            "signal": "nodeHover.id===datum.index || indexof(nodeHover.connections, datum.id)>-1 ?scale('color', datum.Type):merge(hsl(scale('color', datum.Type)), {l:0.64})"
          },
          "stroke": {
            "signal": "nodeHover.id===datum.index || indexof(nodeHover.connections, datum.id)>-1 ?scale('color', datum.Type):merge(hsl(scale('color', datum.Type)), {l:0.84})"
          },
          "strokeWidth": {"value": 0.5},
          // "strokeOpacity": {"value": 1},
          "size": {"signal": "4 * nodeRadius * nodeRadius"},
          "cursor": {"value": "pointer"},
          "x": {"signal": "fix[0]!=null && node===datum.index ?fix[0]:scale('xscale', datum.x)"},
          "y": {"signal": "fix[1]!=null && node===datum.index ?fix[1]:scale('yscale', datum.y)"}
        },
        "hover": {
          "tooltip": {
            "signal": "datum.Name"
          }
        }
      }
    },
    {
      "type": "text",
      "name": "labels",
      "from": {"data": "nodes"},
      "zindex": 2,
      "interactive": false,
      "enter": {},
      "encode": {
        "update": {
          "fill": {"signal": "'black'"},
          "y": {"field": "y"},
          "x": {"field": "x"},
          "text": {
            "field": "datum.Name"
          },
          "align": {"value": "center"},
          "fontSize": {"value": 10},
          "baseline": {
            "value": "middle"
          },
          "limit": {
            "signal": "clamp(sqrt(4 * nodeRadius * nodeRadius)-5,1,1000)"
          },
          "ellipsis": {"value": " "}
        }
      }
    }
  ]
}
```