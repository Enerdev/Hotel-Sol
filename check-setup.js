#!/usr/bin/env node

/**
 * Script de verificación general del proyecto
 * Verifica que todo esté configurado correctamente antes de ejecutar
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración del proyecto...\n');

// Verificar archivos de configuración
const checks = [
  {
    file: 'backend/.env',
    description: 'Archivo de configuración del backend',
    required: false,
  },
  {
    file: 'frontend/.env',
    description: 'Archivo de configuración del frontend',
    required: false,
  },
  {
    file: 'backend/package.json',
    description: 'Dependencias del backend',
    required: true,
  },
  {
    file: 'frontend/package.json',
    description: 'Dependencias del frontend',
    required: true,
  },
];

console.log('ℹ️  El esquema y los seeds de la BD ya están cargados directamente en Plesk (no viven en este repo).\n');

let allOk = true;

for (const check of checks) {
  const filePath = path.join(__dirname, check.file);
  const exists = fs.existsSync(filePath);

  if (check.required && !exists) {
    console.log(`❌ ${check.description}: ${check.file} - NO ENCONTRADO`);
    allOk = false;
  } else if (!exists && !check.required) {
    console.log(`ℹ️  ${check.file} no encontrado; usa variables de entorno del servidor o valores predeterminados.`);
  } else if (exists) {
    console.log(`✅ ${check.description}: ${check.file}`);
  }
}

console.log('');

// Verificar node_modules
const backendModules = fs.existsSync(path.join(__dirname, 'backend/node_modules'));
const frontendModules = fs.existsSync(path.join(__dirname, 'frontend/node_modules'));

if (!backendModules) {
  console.log('⚠️  Dependencias del backend no instaladas. Ejecuta: cd backend && npm install');
  allOk = false;
} else {
  console.log('✅ Dependencias del backend instaladas');
}

if (!frontendModules) {
  console.log('⚠️  Dependencias del frontend no instaladas. Ejecuta: cd frontend && npm install');
  allOk = false;
} else {
  console.log('✅ Dependencias del frontend instaladas');
}

console.log('');

if (allOk) {
  console.log('✨ ¡Todo está configurado correctamente!');
  console.log('');
  console.log('Para iniciar el proyecto:');
  console.log('1. Asegúrate de que MySQL esté corriendo');
  console.log('2. Terminal 1: cd backend && npm run dev');
  console.log('3. Terminal 2: cd frontend && npm run dev');
  console.log('');
  console.log('Accede en: http://localhost:5173');
} else {
  console.log('❌ Hay problemas de configuración. Revisa los mensajes anteriores.');
  process.exit(1);
}