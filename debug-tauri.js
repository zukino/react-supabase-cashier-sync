#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Tauri Debugging Helper');
console.log('==========================');

console.log('\n📂 Checking project structure...');

// Check if tauri.conf.json exists
const tauriConfigPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfigPath)) {
  console.log('✅ tauri.conf.json found');
} else {
  console.log('❌ tauri.conf.json not found');
}

// Check if main.rs exists
const mainRsPath = path.join(__dirname, 'src-tauri', 'src', 'main.rs');
if (fs.existsSync(mainRsPath)) {
  console.log('✅ main.rs found');
} else {
  console.log('❌ main.rs not found');
}

// Check if Cargo.toml exists
const cargoTomlPath = path.join(__dirname, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  console.log('✅ Cargo.toml found');
} else {
  console.log('❌ Cargo.toml not found');
}

console.log('\n📦 Checking package.json scripts...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('Available scripts:', Object.keys(packageJson.scripts || {}));

  if (packageJson.scripts?.['tauri:dev']) {
    console.log('✅ tauri:dev script found');
  } else {
    console.log('❌ tauri:dev script not found');
  }
} else {
  console.log('❌ package.json not found');
}

console.log('\n🔧 Recommended commands:');
console.log('1. npm install                 # Install dependencies');
console.log('2. npm run tauri:dev           # Run Tauri development mode');
console.log('3. Check terminal output for errors');
console.log('4. Look for database initialization messages');

console.log('\n📝 Common issues and solutions:');
console.log('- If Rust compilation fails: Check Rust toolchain installation');
console.log('- If database fails: Check permissions for app data directory');
console.log('- If commands not found: Check Tauri build configuration');
console.log('- If app crashes: Check terminal for detailed error messages');