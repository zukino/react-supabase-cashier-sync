#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Tauri Diagnostic Tool');
console.log('========================');

// Check if Tauri CLI is installed
try {
  const tauriVersion = execSync('npm list @tauri-apps/cli', { encoding: 'utf8' });
  console.log('✅ Tauri CLI installed:');
  console.log(tauriVersion);
} catch (error) {
  console.log('❌ Tauri CLI not found. Installing...');
  try {
    execSync('npm install @tauri-apps/cli', { stdio: 'inherit' });
    console.log('✅ Tauri CLI installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install Tauri CLI:', installError.message);
    process.exit(1);
  }
}

// Check if Rust is installed
try {
  const rustVersion = execSync('rustc --version', { encoding: 'utf8' });
  console.log('✅ Rust installed:', rustVersion.trim());
} catch (error) {
  console.log('❌ Rust not found. Please install Rust from https://rustup.rs/');
  process.exit(1);
}

// Check Tauri configuration
const tauriConfigPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfigPath)) {
  console.log('✅ Tauri configuration found');
} else {
  console.log('❌ Tauri configuration not found');
}

// Check Rust source files
const mainRsPath = path.join(__dirname, 'src-tauri', 'src', 'main.rs');
if (fs.existsSync(mainRsPath)) {
  console.log('✅ Rust source files found');
} else {
  console.log('❌ Rust source files not found');
}

// Check if Cargo.toml exists
const cargoTomlPath = path.join(__dirname, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  console.log('✅ Cargo.toml found');
} else {
  console.log('❌ Cargo.toml not found');
}

console.log('\n📋 Recommended Steps:');
console.log('1. Stop any running development servers (Ctrl+C)');
console.log('2. Run: npm run tauri:dev');
console.log('3. Wait for the desktop window to open');
console.log('4. Check the terminal for compilation logs');
console.log('5. The app should run in a desktop window, not browser');

console.log('\n🚀 Starting Tauri development mode...');
console.log('   (This will open a desktop window)');

try {
  execSync('npm run tauri:dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to run Tauri:', error.message);
}