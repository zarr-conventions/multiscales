import Ajv from 'ajv';
import fs from 'fs';

// Read command line arguments
const schemaPath = process.argv[2];
const dataPath = process.argv[3];

if (!schemaPath || !dataPath) {
  console.error('Usage: node validate.js <schema.json> <data.json>');
  process.exit(1);
}

// Read files
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Extract attributes for validation (if the data is a Zarr metadata file)
const dataToValidate = data.attributes?.multiscales || data;

// Validate
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
const valid = validate(dataToValidate);

if (valid) {
  console.log('✅ Validation successful!');
  process.exit(0);
} else {
  console.log('❌ Validation failed!');
  console.log(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
