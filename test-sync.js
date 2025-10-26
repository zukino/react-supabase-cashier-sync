#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

console.log('🔧 Testing Supabase Connection and Schema...');

// Load environment variables
const supabaseUrl = 'https://olrtjlgncypfwkduapil.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scnRqbGduY3lwZndrZHVhcGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQxODksImV4cCI6MjA3NzAxMDE4OX0.yNanc9ONXyuKxa-zbcW7F4QZLX4F7_7XGD5F8zdrUlE';

console.log('🔧 Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Key:', supabaseAnonKey ? '✅ Loaded' : '❌ Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n🔗 Testing connection...');

    // Test basic connection
    const { data, error } = await supabase.from('products').select('count').limit(1);

    if (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }

    console.log('✅ Connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}

async function testTables() {
  const tables = ['customers', 'products', 'transactions', 'transaction_items'];

  for (const table of tables) {
    try {
      console.log(`\n📋 Testing table: ${table}`);

      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ Table ${table} error:`, error);
      } else {
        console.log(`✅ Table ${table} exists (${count} rows)`);

        if (count > 0 && table === 'products') {
          // Show sample data for products
          const { data: sampleData } = await supabase
            .from('products')
            .select('*')
            .limit(3);

          console.log('📦 Sample products:', sampleData);
        }
      }
    } catch (error) {
      console.error(`❌ Error testing table ${table}:`, error);
    }
  }
}

async function testInsert() {
  try {
    console.log('\n➕ Testing insert operation...');

    const testData = {
      id: `test-${Date.now()}`,
      name: 'Test Product',
      description: 'This is a test product',
      barcode: '123456789',
      price: 100.00,
      stock: 10,
      category: 'Test'
    };

    const { data, error } = await supabase
      .from('products')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert failed:', error);
    } else {
      console.log('✅ Insert successful:', data);

      // Clean up test data
      await supabase
        .from('products')
        .delete()
        .eq('id', testData.id);

      console.log('🧹 Test data cleaned up');
    }
  } catch (error) {
    console.error('❌ Insert test error:', error);
  }
}

async function main() {
  console.log('🚀 Starting Supabase tests...\n');

  const connected = await testConnection();

  if (!connected) {
    console.log('\n❌ Cannot proceed with table tests due to connection failure');
    return;
  }

  await testTables();
  await testInsert();

  console.log('\n✅ All tests completed!');
  console.log('\n📋 Next steps:');
  console.log('1. If tables don\'t exist, run the SQL in supabase-schema.sql');
  console.log('2. Check the logs in your Tauri app for sync activity');
  console.log('3. Try the manual sync button in the app');
}

main().catch(console.error);