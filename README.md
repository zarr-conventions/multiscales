# Multiscales Attribute Extension for Zarr

- **UUID**: d35379db-88df-4056-af3a-620245f8e347
- **Name**: Multiscales Attribute Extension
- **Schema**: "https://raw.githubusercontent.com/zarr-experimental/multiscales/refs/tags/v0.1.0/schema.json"
- **Extension Maturity Classification**: Proposal
- **Owner**: @emmanuelmathot, @maxrjones
- **Version** 0.1.0


## Description

This specification defines a JSON object that encodes multiscale pyramid information for data stored in Zarr groups under the `multiscales` key in the attributes of Zarr groups. This is a domain-agnostic specification that describes the hierarchical layout of Zarr groups representing different resolution levels and the transformations between them.

- Examples:
    - [Simple Power-of-2 Pyramid](examples/power-of-2-pyramid.json)
    - [Custom Pyramid Levels](examples/custom-pyramid-levels.json)
    - [Array-based Pyramid](examples/array-based-pyramid.json)
    - [Sentinel-2 Multi-resolution](examples/sentinel-2-multiresolution.json)
    - [DEM Multi-resolution with Upsampling](examples/dem-multiresolution.json)
    - [Geospatial Pyramid with geo:proj](examples/geospatial-pyramid.json)

## Motivation

- Provides standardized multiscale pyramid encoding applicable across domains (geospatial, bioimaging, etc.)
- Supports flexible resampling schemes for both downsampling and upsampling
- Explicitly captures scale and translation transformations induced by resampling operations
- Enables optimized data access patterns for visualization and analysis at different scales
- Composable with domain-specific metadata (e.g., geo/proj for geospatial CRS information)

## Background

This specification emerged from discussions between the geospatial and bioimaging communities about multiscale data representation in Zarr. While both domains need multiscale pyramids, they differ in how spatial metadata is handled:

- **Bioimaging** (OME-NGFF): Multiscale metadata includes all spatial transformation information
- **Geospatial**: Coordinate Reference System (CRS) information is typically separate from multiscale metadata

This generic specification captures the **transformation induced by resampling** (scale and translation), allowing domain-specific extensions to provide additional spatial metadata as needed. The specification supports both downsampling (lower resolution) and upsampling (higher resolution) use cases.

## Inheritance Model

The `multiscales` key is defined at the group level and applies to the hierarchical structure within that group. There is no inheritance of `multiscales` metadata from parent groups to child groups. Each multiscale group defines its own pyramid structure independently.

## Configuration

The configuration in the Zarr convention metadata can be used in these parts of the Zarr hierarchy:

- [x] Group
- [ ] Array

|                       | Type       | Description                                        | Required     | Reference                               |
| --------------------- | ---------- | -------------------------------------------------- | ------------ | --------------------------------------- |
| **layout**            | `object[]` | Array of objects representing the pyramid layout   | &#10003; Yes | [layout](#layout)                       |
| **resampling_method** | `string`   | Default resampling method used for resampling data | No           | [resampling_method](#resampling_method) |

### Field Details

Additional properties are allowed.

#### version

Multiscales metadata version

* **Type**: `string`
* **Required**: &#10003; Yes
* **Pattern**: `^0\.1\.0$`

#### layout

Array of objects representing the pyramid layout and transformation relationships

* **Type**: `object[]`
* **Required**: &#10003; Yes

This field SHALL describe the pyramid hierarchy with an array of objects representing each resolution level. See the [Layout Object](#layout-object) section below for details.

Each level can optionally reference another level via `derived_from`, establishing a directed graph of resolution relationships. Levels can be derived through either downsampling (scale > 1.0) or upsampling (scale < 1.0) from their source asset.

The `transform` object on each level describes the coordinate transformation between resolution levels. See the [Transform Object](#transform-object) section for details on how to specify transformations.

### Layout Object

Each object in the layout array represents a single resolution level with the following properties:

|                       | Type       | Description                                                                                                                           | Required                                  |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **asset**             | `string`   | Path to the Zarr group or array for this resolution level. Can be a simple name (e.g., `"0"`) for a child group, or a path with `/` separator for nested groups or arrays (e.g., `"0/data"` for an array within a group) | &#10003; Yes                              |
| **derived_from**      | `string`   | Path to the source Zarr group or array used to generate this level. Uses the same path syntax as `asset` with `/` separator for nested resources | No                                        |
| **transform**         | `object`   | Transformation parameters describing the coordinate transformation for this level. See [Transform Object](#transform-object) for details | &#10003; Yes (if `derived_from ` is present) |
| **resampling_method** | `string`   | Resampling method for this specific level                                                                                             | No                                        |

Additional properties are allowed.

### Asset Path Syntax

The `asset` and `derived_from` fields use Zarr path nomenclature to reference groups or arrays within the multiscale hierarchy. Paths follow these conventions:

#### Path Format

- **Simple name**: References a direct child group or array (e.g., `"0"`, `"level1"`, `"full"`)
- **Path with `/` separator**: References nested groups or arrays (e.g., `"0/data"`, `"level1/array"`)
- **Relative paths**: All paths are relative to the group containing the `multiscales` metadata. Relative paths cannot start with `/` or refer to parent directories (`..`).

#### Common Patterns

**Group-based layout** (most common):
```json
{
  "layout": [
    {"asset": "0", "transform": {"scale": [1.0, 1.0]}},
    {"asset": "1", "derived_from": "0", "transform": {"scale": [2.0, 2.0]}}
  ]
}
```
Structure:
```
multiscales/
├── 0/           # Referenced by asset: "0"
│   └── data
└── 1/           # Referenced by asset: "1"
    └── data
```

**Direct array layout** (COG-style):
```json
{
  "layout": [
    {"asset": "0", "transform": {"scale": [1.0, 1.0]}},
    {"asset": "1", "derived_from": "0", "transform": {"scale": [2.0, 2.0]}}
  ]
}
```
Structure:
```
multiscales/
├── 0            # Zarr Array referenced by asset: "0"
└── 1            # Zarr Array referenced by asset: "1"
```
This pattern is a natural translation of COG (Cloud Optimized GeoTIFF) overviews to Zarr, where each level is stored as a separate array.

**Nested array layout**:
```json
{
  "layout": [
    {"asset": "0/data", "scale": [1.0, 1.0]},
    {"asset": "1/data", "derived_from": "0/data", "scale": [2.0, 2.0]}
  ]
}
```
Structure:
```
multiscales/
├── 0/
│   └── data     # Referenced by asset: "0/data"
└── 1/
    └── data     # Referenced by asset: "1/data"
```

**Nested group layout**:
```json
{
  "layout": [
    {"asset": "resolutions/full", "scale": [1.0, 1.0]},
    {"asset": "resolutions/half", "derived_from": "resolutions/full", "scale": [2.0, 2.0]}
  ]
}
```
Structure:
```
multiscales/
└── resolutions/
    ├── full/    # Referenced by asset: "resolutions/full"
    │   └── data
    └── half/    # Referenced by asset: "resolutions/half"
        └── data
```

#### Best Practices

- **Consistency**: Use the same referencing style (group or array) throughout a layout
- **Clarity**: For array-based layouts, include the full path to the array (e.g., `"0/data"`)
- **Compatibility**: Group-based layouts are more common and may have better tool support

### Transform Object

The `transform` object provides a flexible mechanism to describe **relative** coordinate transformations between resolution levels. This object contains parameters that describe how to transform coordinates from a source level to the current level.

#### Relative Transformations (inside `transform` object)

For general-purpose transformations, the `transform` object MAY contain:

|                   | Type       | Description                                                                                                                           | Required |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **scale**         | `number[]` | Array of scale factors per axis describing the coordinate transformation from the source level (`derived_from`) to this level        | No       |
| **translation**   | `number[]` | Array of translation offsets per axis in the coordinate space                                                                         | No       |

**Example:**

```json
{
  "asset": "1",
  "derived_from": "0",
  "transform": {
    "scale": [2.0, 2.0],
    "translation": [0.5, 0.5]
  }
}
```

#### Absolute Positioning (outside `transform` object)

Absolute positioning information, such as geospatial coordinates, should be placed at the layout entry level, NOT inside the `transform` object. This makes it clear that these parameters describe the absolute position of the level, not the relative transformation between levels.

When combined with the `geo-proj` convention, layout entries MAY include:

|                     | Type       | Description                                                                               | Required |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------- | -------- |
| **proj:transform**  | `number[]` | Affine transformation matrix in GDAL format (6 parameters) describing absolute position   | No       |
| **proj:shape**      | `number[]` | Shape of the raster in pixels [height, width]                                            | No       |

**Example:**

```json
{
  "asset": "r10m",
  "transform": {
    "scale": [1.0, 1.0],
    "translation": [0.0, 0.0]
  },
  "proj:transform": [10.0, 0.0, 500000.0, 0.0, -10.0, 5000000.0],
  "proj:shape": [10000, 10000]
}
```

**Note:** The `transform` object contains **relative** transformations (how to go from one level to another), while `proj:transform` and `proj:shape` describe **absolute** positioning in the coordinate reference system.

#### Convention-Specific Transformations

Other conventions MAY define their own transformation parameters. Relative transformation parameters should be placed inside the `transform` object, while absolute positioning parameters should be placed at the layout entry level. Implementations SHOULD document any convention-specific transformation parameters they introduce.

**Transformation Semantics**:

When `scale` and `translation` are used within the `transform` object:

- **Scale** represents the multiplicative factor applied to coordinates when transforming from the source level to the current level:
  - Scale > 1.0: Coordinates expand (e.g., scale of 2.0 means coordinate [10, 20] in source becomes [20, 40] in current level)
  - Scale = 1.0: No scaling (same coordinate space)
  - Scale < 1.0: Coordinates contract (e.g., scale of 0.5 means coordinate [10, 20] in source becomes [5, 10] in current level)
- **Translation** represents the coordinate offset applied in the current level's coordinate space

These transformations allow clients to map coordinates between levels and determine spatial extents without needing to understand the specific resampling algorithm.

#### resampling_method

Resampling method used for resampling operations (downsampling or upsampling)

* **Type**: `string`
* **Required**: No

The resampling method can be any string value describing the algorithm used for resampling. Common methods for downsampling include `"nearest"`, `"average"`, `"bilinear"`, `"cubic"`, `"cubic_spline"`, `"lanczos"`, `"mode"`, `"max"`, `"min"`, `"med"`, `"sum"`, `"q1"`, `"q3"`, `"rms"`, `"gauss"`. For upsampling, methods like `"nearest"`, `"bilinear"`, `"cubic"`, `"lanczos"` are commonly used. Any method can be specified to support emerging resampling techniques.

The same method SHALL apply across all levels unless overridden at the level-specific `resampling_method`.

### Hierarchical Layout

Multiscale datasets SHOULD follow a specific hierarchical structure:

1. **Multiscale Group**: Contains `multiscales` metadata
2. **Resolution Level Groups**: Child groups containing data at different resolutions

```
multiscales/                 # Group with `multiscales` metadata
├── 0/                       # First resolution level (highest resolution)
│   ├── data                 # Data variable
│   └── ...
├── 1/                       # Second resolution level
│   ├── data                 # Data at lower resolution
│   └── ...
└── 2/                       # Third resolution level
    ├── data
    └── ...
```

All levels SHOULD be stored in child groups with names matching layout keys (e.g., `0`, `1`, `2`, or custom names).

### Group Discovery Methods

The multiscales metadata enables complete discovery of the multiscale collection structure through the layout mechanism:

- The `layout` definition specifies the exact set of resolution levels through its array of group names
- Each group name corresponds to a child group in the multiscale hierarchy
- Variable discovery within each level follows standard Zarr metadata conventions

### Consolidated Metadata

Consolidated metadata SHOULD be used for multiscale groups to ensure complete discoverability of pyramid structure and metadata without requiring individual access to each child dataset.

#### Requirements

1. **Zarr Consolidated Metadata**: The multiscale group SHOULD use Zarr's consolidated metadata feature to expose metadata from all child groups and arrays at the group level.

2. **Variable Discovery**: The consolidated metadata SHOULD include complete variable listings for all resolution levels, enabling clients to understand the full pyramid structure without traversing child groups.

### Validation Rules

- **Level Consistency**: Resolution level group names SHALL match children group path values in the `layout` array

## Examples

See the [examples](examples/) directory for complete Zarr convention metadata examples:

- [power-of-2-pyramid.json](examples/power-of-2-pyramid.json) - Simple power-of-2 pyramid with 3 resolution levels
- [custom-pyramid-levels.json](examples/custom-pyramid-levels.json) - Custom pyramid levels with named groups
- [array-based-pyramid.json](examples/array-based-pyramid.json) - Array-based layout demonstrating direct array references using paths with `/` separator (e.g., `"0/data"`)
- [sentinel-2-multiresolution.json](examples/sentinel-2-multiresolution.json) - Sentinel-2 multi-resolution layout with bands at different resolutions (10m, 20m, and 60m)
- [dem-multiresolution.json](examples/dem-multiresolution.json) - Digital Elevation Model with multiple resolution levels including 30m, downsampled levels (90m, 270m), and upsampled level (10m super-resolution)
- [geospatial-pyramid.json](examples/geospatial-pyramid.json) - Geospatial pyramid composed with geo:proj convention for coordinate reference system

## Composition with Domain-Specific Metadata

This generic multiscales specification is designed to be composed with domain-specific metadata:

### Geospatial Data

For geospatial data, combine with `proj:*` attributes from [`geo-proj` convention](https://github.com/zarr-conventions/geo-proj) to specify the Coordinate Reference System:

```json
{
  "zarr_format": 3,
  "node_type": "group",
  "attributes": {
    "zarr_conventions_version": "0.1.0",
    "zarr_conventions": {
      "d35379db-88df-4056-af3a-620245f8e347": {
        "version": "0.1.0",
        "schema": "https://raw.githubusercontent.com/zarr-conventions/multiscales/refs/tags/v0.1.0/schema.json",
        "name": "multiscales",
        "description": "Multiscale layout of zarr datasets",
        "spec": "https://github.com/zarr-conventions/multiscales/blob/v0.1.0/README.md"
      },
      "f17cb550-5864-4468-aeb7-f3180cfb622f": {
        "version": "0.1.0",
        "schema": "https://raw.githubusercontent.com/zarr-conventions/geo-proj/refs/tags/v0.1.0/schema.json",
        "name": "geo-proj",
        "description": "Coordinate reference system information for geospatial data",
        "spec": "https://github.com/zarr-conventions/geo-proj/blob/v0.1.0/README.md"
      }
    },
    "multiscales": {
      "layout": [
        {"asset": "0", "transform": {"scale": [1.0, 1.0], "translation": [0.0, 0.0]}},
        {"asset": "1", "derived_from": "0", "transform": {"scale": [2.0, 2.0], "translation": [0.0, 0.0]}}
      ]
    },
    "proj:code": "EPSG:32633",
    "proj:spatial_dimensions": ["Y", "X"],
    "proj:transform": [10.0, 0.0, 500000.0, 0.0, -10.0, 5000000.0],
    "proj:bbox": [500000.0, 4900000.0, 600000.0, 5000000.0]
  }
}
```

At each resolution level, the `proj:*` metadata can be overridden with level-specific values as needed.

### Bioimaging Data

For bioimaging, spatial metadata can be integrated directly at each level following OME-NGFF conventions while using this specification for the pyramid structure.

## Versioning and Compatibility

This specification uses semantic versioning (SemVer) for version management:

- **Major version** changes indicate backward-incompatible changes to the attribute schema
- **Minor version** changes add new optional fields while maintaining backward compatibility
- **Patch version** changes fix documentation, clarify behavior, or make other non-breaking updates

### Compatibility Guarantees

- Parsers MUST support all fields defined in their major version
- Parsers SHOULD gracefully handle unknown optional fields from newer minor versions
- Producers SHOULD include the `version` field to indicate specification compliance level

## Implementation Notes

### Transform Object

The `transform` object explicitly captures the **relative** coordinate transformation between resolution levels. This approach has several advantages:

1. **Explicit vs. Implicit**: Clients don't need to infer transformations from resampling factors; the exact coordinate mapping is specified
2. **Flexibility**: Supports arbitrary resampling schemes (both downsampling and upsampling) with precise coordinate relationships. The transform object contains relative transformation parameters (scale, translation, factors)
3. **Composability**: Domain-specific coordinate systems can build upon these transformations. Absolute positioning information (e.g., `proj:transform` for geospatial data) is placed at the layout entry level, outside the transform object
4. **Graph Structure**: Allows flexible pyramid topologies where any level can reference any other level via `derived_from`
5. **Clarity**: Separating relative transformations (inside `transform`) from absolute positioning (outside `transform`) makes the intent clear and avoids confusion

## References

- [OME-NGFF Multiscale Specification](https://ngff.openmicroscopy.org/latest/#multiscale-md)
- [Zarr Specifications Discussion on Multiscales](https://github.com/zarr-developers/zarr-specs/issues/50)
- [GeoZarr Specification](https://github.com/zarr-developers/geozarr-spec)

## Acknowledgements

The template is based on the [STAC extensions template](https://github.com/stac-extensions/template/blob/main/README.md).

The convention was copied and modified from [EOPF-Explorer data-model](https://github.com/EOPF-Explorer/data-model/blob/main/attributes/multiscales/).
