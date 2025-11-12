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
| **version**           | `string`   | Multiscales metadata version                       | &#10003; Yes | [version](#version)                     |
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

Each level can optionally reference another level via `from_group`, establishing a directed graph of resolution relationships. Levels can be derived through either downsampling (scale > 1.0) or upsampling (scale < 1.0) from their source group.

**Transformation Semantics**:

The `scale` and `translation` parameters describe the coordinate transformation from the source level (`from_group`) to the current level. Specifically:

- **Scale** represents the multiplicative factor applied to coordinates when transforming from the source level to the current level:
  - Scale > 1.0: Coordinates expand (e.g., scale of 2.0 means coordinate [10, 20] in source becomes [20, 40] in current level)
  - Scale = 1.0: No scaling (same coordinate space)
  - Scale < 1.0: Coordinates contract (e.g., scale of 0.5 means coordinate [10, 20] in source becomes [5, 10] in current level)
- **Translation** represents the coordinate offset applied in the current level's coordinate space

These transformations allow clients to map coordinates between levels and determine spatial extents without needing to understand the specific resampling algorithm.

### Layout Object

Each object in the layout array represents a single resolution level with the following properties:

|                       | Type       | Description                                                                                                                           | Required                                  |
| --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **group**             | `string`   | Relative group name for this resolution level                                                                                         | &#10003; Yes                              |
| **from_group**        | `string`   | Source group used to generate this level                                                                                              | No                                        |
| **factors**           | `number[]` | Array of resampling factors per axis describing this level's resolution characteristics (e.g., `[2.0, 2.0]` indicates half the sampling rate in each dimension compared to a reference level) | No                                        |
| **scale**             | `number[]` | Array of scale factors per axis describing the coordinate transformation from the source level (`from_group`) to this level | &#10003; Yes (if `from_group` is present) |
| **translation**       | `number[]` | Array of translation offsets per axis in the coordinate space                                                                         | No                                        |
| **resampling_method** | `string`   | Resampling method for this specific level                                                                                             | No                                        |

Additional properties are allowed.

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
- **Transformation Consistency**: If both `factors` and `scale` are provided, they SHALL be consistent with each other

## Examples

See the [examples](examples/) directory for complete Zarr convention metadata examples:

- [power-of-2-pyramid.json](examples/power-of-2-pyramid.json) - Simple power-of-2 pyramid with 3 resolution levels
- [custom-pyramid-levels.json](examples/custom-pyramid-levels.json) - Custom pyramid levels with named groups
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
      "version": "0.1.0",
      "layout": [
        {"group": "0", "scale": [1.0, 1.0]},
        {"group": "1", "from_group": "0", "scale": [2.0, 2.0]}
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

### Scale and Translation Parameters

The `scale` and `translation` parameters explicitly capture the coordinate transformation between resolution levels. This approach has several advantages:

1. **Explicit vs. Implicit**: Clients don't need to infer transformations from resampling factors; the exact coordinate mapping is specified
2. **Flexibility**: Supports arbitrary resampling schemes (both downsampling and upsampling) with precise coordinate relationships
3. **Composability**: Domain-specific coordinate systems can build upon these transformations
4. **Graph Structure**: Allows flexible pyramid topologies where any level can reference any other level via `from_group`

### Relationship Between `factors` and `scale`

The `factors` and `scale` fields serve complementary purposes in describing resolution relationships:

- **`scale`**: Describes the coordinate transformation from a specific source level (`from_group`) to the current level. This is a pairwise relationship between two groups. For example, `from_group: "level_10m"` with `scale: [2.0, 2.0]` means coordinates are multiplied by 2.0 when transforming from `level_10m` to the current level.

- **`factors`**: Describes the resolution characteristics of a level, which can be interpreted relative to other levels in the pyramid. This is useful for documenting the overall resolution structure. For example, `factors: [1.0, 1.0]` might indicate the finest resolution in the collection, while `factors: [4.0, 4.0]` indicates a coarser resolution.

**Consistency**: When both fields are present, they MUST be mathematically consistent with the pyramid structure. If multiple levels are chained via `from_group` relationships, the cumulative product of `scale` values along a path should equal the ratio of `factors` values between the endpoints.

**Example** with three levels:
```json
{
  "layout": [
    {"group": "10m", "factors": [1.0, 1.0]},
    {"group": "20m", "from_group": "10m", "scale": [2.0, 2.0], "factors": [2.0, 2.0]},
    {"group": "40m", "from_group": "20m", "scale": [2.0, 2.0], "factors": [4.0, 4.0]}
  ]
}
```

In this example:
- `20m` has `scale: [2.0, 2.0]` relative to `10m`, and `factors: [2.0, 2.0]`
- `40m` has `scale: [2.0, 2.0]` relative to `20m`, and `factors: [4.0, 4.0]`
- The cumulative scale from `10m` to `40m` is 2.0 × 2.0 = 4.0, matching the factors ratio (4.0 / 1.0)

The `scale` field is the authoritative source for coordinate transformations between specific levels. The `factors` field provides convenient documentation of each level's resolution characteristics within the collection.

## References

- [OME-NGFF Multiscale Specification](https://ngff.openmicroscopy.org/latest/#multiscale-md)
- [Zarr Specifications Discussion on Multiscales](https://github.com/zarr-developers/zarr-specs/issues/50)
- [GeoZarr Specification](https://github.com/zarr-developers/geozarr-spec)

## Acknowledgements

The template is based on the [STAC extensions template](https://github.com/stac-extensions/template/blob/main/README.md).

The convention was copied and modified from [EOPF-Explorer data-model](https://github.com/EOPF-Explorer/data-model/blob/main/attributes/multiscales/).
