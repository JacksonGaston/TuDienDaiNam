const PipelineVerifier = require('./verify-pipeline');

console.log('🔍 TuDienDaiNam Pipeline Verification Tool');
console.log('='.repeat(50));
console.log('');
console.log('This tool helps you verify the accuracy of transformed data');
console.log('at each stage of the text processing pipeline.');
console.log('');
console.log('Available commands:');
console.log('  node simple-verify.js full     - Complete pipeline verification');
console.log('  node simple-verify.js text     - Show text files only');
console.log('  node simple-verify.js parsed   - Show parsed entries only');
console.log('  node simple-verify.js valid    - Show validation results only');
console.log('  node simple-verify.js db       - Show database contents only');
console.log('  node simple-verify.js search   - Test search functionality only');
console.log('');
console.log('Starting full verification...');
console.log('');

const verifier = new PipelineVerifier();
verifier.runFullVerification().catch(console.error);