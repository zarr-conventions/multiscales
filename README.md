# Template Convention Metadata

- **UUID**: f010a634-3525-416e-9320-8f44b5bc352c
- **Name**: Template
- **Schema**: "https://raw.githubusercontent.com/zarr-conventions/template/refs/tags/v0.1.0/schema.json"
- **Extension Maturity Classification**: Proposal
- **Owner**: @your-github-handle, @another-github-handle

The document explains the Template convention, which is a Zarr convention metadata. This is the place to add a short introduction.

- Examples:
    - [Zarr metadata conventions example](examples/zarr_convention_metadata.json)

## Configuration

The configuration in the Zarr convention metadata can be used in these parts of the Zarr hierarchy:

- [x] Group
- [x] Array

| Field Name           | Type                      | Description                                  |
| -------------------- | ------------------------- | -------------------------------------------- |
| new_field   | string                    | **REQUIRED**. Describe the required field... |
| xyz         | [XYZ Object](#xyz-object) | Describe the field...                        |
| another_one | \[number]                 | Describe the field...                        |

### Additional Field Information

#### new_field

This is a much more detailed description of the field `new_field`...

### XYZ Object

This is the introduction for the purpose and the content of the XYZ Object...

| Field Name | Type   | Description                                  |
| ---------- | ------ | -------------------------------------------- |
| x          | number | **REQUIRED**. Describe the required field... |
| y          | number | **REQUIRED**. Describe the required field... |
| z          | number | **REQUIRED**. Describe the required field... |

## Acknowledgements

This template is based on the [STAC extensions template](https://github.com/stac-extensions/template/blob/main/README.md).
