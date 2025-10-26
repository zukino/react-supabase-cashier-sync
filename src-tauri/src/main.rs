// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use chrono::{DateTime, Utc};

// Data structures
#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    id: Option<String>,
    customer_id: Option<String>,
    items: Vec<TransactionItem>,
    total_amount: f64,
    payment_method: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionItem {
    id: Option<String>,
    transaction_id: Option<String>,
    product_id: String,
    quantity: i32,
    unit_price: f64,
    total_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    id: Option<String>,
    name: String,
    description: Option<String>,
    barcode: Option<String>,
    price: f64,
    stock: i32,
    category: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
    id: Option<String>,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    synced_at: Option<DateTime<Utc>>,
}

// Database state
pub struct DbState {
    conn: Arc<Mutex<Connection>>,
}

// Initialize database
fn init_database() -> SqlResult<Connection> {
    // Use proper app data directory
    let app_dir = if cfg!(target_os = "macos") {
        // macOS: ~/Library/Application Support/com.cashier.sync/
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.cashier.sync")
    } else if cfg!(target_os = "windows") {
        // Windows: %APPDATA%/Cashier System/
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Cashier System")
    } else {
        // Linux: ~/.local/share/cashier-system/
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("cashier-system")
    };

    fs::create_dir_all(&app_dir).map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some(format!("Failed to create app directory: {}", e)),
        )
    })?;

    let db_path = app_dir.join("cashier.db");
    println!("📂 Database path: {:?}", db_path);
    println!("🔍 Checking if database file exists: {}", db_path.exists());

    // Check if we can create the directory
    println!("📁 Creating app directory: {:?}", app_dir);
    match fs::create_dir_all(&app_dir) {
        Ok(_) => println!("✅ App directory created successfully"),
        Err(e) => {
            println!("❌ Failed to create app directory: {}", e);
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some(format!("Failed to create app directory: {}", e)),
            ));
        }
    }

    println!("🗄️ Opening database connection...");
    let conn = match Connection::open(&db_path) {
        Ok(conn) => {
            println!("✅ Database connection opened successfully");
            conn
        }
        Err(e) => {
            println!("❌ Failed to open database: {}", e);
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some(format!("Failed to open database at {:?}: {}", db_path, e)),
            ));
        }
    };

    // Set database connection options
    conn.pragma_update(None, "foreign_keys", &1i32)?; // Enable foreign keys
    conn.pragma_update(None, "journal_mode", &"WAL")?; // Use WAL mode for better concurrency
    conn.pragma_update(None, "synchronous", &"NORMAL")?; // Balance between safety and performance
    conn.pragma_update(None, "temp_store", &"MEMORY")?; // Store temporary tables in memory

    // Create tables
    println!("🛠️ Creating database tables...");

    println!("  📋 Creating customers table...");
    match conn.execute(
        "CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at TEXT
        )",
        [],
    ) {
        Ok(_) => println!("  ✅ Customers table created successfully"),
        Err(e) => println!("  ⚠️ Failed to create customers table: {}", e),
    }

    println!("  📦 Creating products table...");
    match conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            barcode TEXT,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            category TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at TEXT
        )",
        [],
    ) {
        Ok(_) => println!("  ✅ Products table created successfully"),
        Err(e) => println!("  ⚠️ Failed to create products table: {}", e),
    }

    println!("  💰 Creating transactions table...");
    match conn.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            total_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )",
        [],
    ) {
        Ok(_) => println!("  ✅ Transactions table created successfully"),
        Err(e) => println!("  ⚠️ Failed to create transactions table: {}", e),
    }

    println!("  🛒 Creating transaction_items table...");
    match conn.execute(
        "CREATE TABLE IF NOT EXISTS transaction_items (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )",
        [],
    ) {
        Ok(_) => println!("  ✅ Transaction_items table created successfully"),
        Err(e) => println!("  ⚠️ Failed to create transaction_items table: {}", e),
    }

    // Create indexes for better performance
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(updated_at)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)", [])?;

    Ok(conn)
}

// Tauri commands
#[tauri::command]
async fn create_transaction(
    transaction: Transaction,
    state: State<'_, DbState>,
) -> Result<String, String> {
    println!("\n💰 [RUST] CREATE TRANSACTION COMMAND RECEIVED");
    println!("📝 Transaction data: {:?}", transaction);

    let conn = state.conn.lock().map_err(|e| format!("Failed to acquire database lock: {}", e))?;
    let transaction_id = transaction.id.unwrap_or_else(|| {
        let id = uuid::Uuid::new_v4().to_string();
        println!("Generated new transaction ID: {}", id);
        id
    });

    let mut stmt = conn.prepare(
        "INSERT INTO transactions (id, customer_id, total_amount, payment_method, created_at, updated_at, synced_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
         customer_id = excluded.customer_id,
         total_amount = excluded.total_amount,
         payment_method = excluded.payment_method,
         updated_at = excluded.updated_at,
         synced_at = excluded.synced_at"
    ).map_err(|e| e.to_string())?;

    stmt.execute((
        &transaction_id,
        transaction.customer_id,
        transaction.total_amount,
        transaction.payment_method,
        transaction.created_at.to_rfc3339(),
        transaction.updated_at.to_rfc3339(),
        transaction.synced_at.map(|dt| dt.to_rfc3339()),
    )).map_err(|e| e.to_string())?;

    // Insert transaction items
    for item in transaction.items {
        let item_id = item.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let mut item_stmt = conn.prepare(
            "INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, total_price)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
             product_id = excluded.product_id,
             quantity = excluded.quantity,
             unit_price = excluded.unit_price,
             total_price = excluded.total_price"
        ).map_err(|e| e.to_string())?;

        item_stmt.execute((
            &item_id,
            &transaction_id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.total_price,
        )).map_err(|e| e.to_string())?;
    }

    Ok(transaction_id)
}

#[tauri::command]
async fn get_transactions(
    limit: Option<i32>,
    offset: Option<i32>,
    state: State<'_, DbState>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, customer_id, total_amount, payment_method, created_at, updated_at, synced_at
         FROM transactions
         ORDER BY created_at DESC
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        (limit.unwrap_or(50), offset.unwrap_or(0)),
        |row| {
            Ok(Transaction {
                id: Some(row.get(0)?),
                customer_id: row.get(1)?,
                items: Vec::new(), // Will be populated separately if needed
                total_amount: row.get(2)?,
                payment_method: row.get(3)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                synced_at: row.get::<_, Option<String>>(6)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut transactions = Vec::new();
    for row in rows {
        transactions.push(row.map_err(|e| e.to_string())?);
    }

    Ok(transactions)
}

#[tauri::command]
async fn create_product(
    product: Product,
    state: State<'_, DbState>,
) -> Result<String, String> {
    println!("\n📦 [RUST] CREATE PRODUCT COMMAND RECEIVED");
    println!("📝 Product data: {:?}", product);

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let product_id = product.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut stmt = conn.prepare(
        "INSERT INTO products (id, name, description, barcode, price, stock, category, created_at, updated_at, synced_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         barcode = excluded.barcode,
         price = excluded.price,
         stock = excluded.stock,
         category = excluded.category,
         updated_at = excluded.updated_at,
         synced_at = excluded.synced_at"
    ).map_err(|e| e.to_string())?;

    stmt.execute((
        &product_id,
        product.name,
        product.description,
        product.barcode,
        product.price,
        product.stock,
        product.category,
        product.created_at.to_rfc3339(),
        product.updated_at.to_rfc3339(),
        product.synced_at.map(|dt| dt.to_rfc3339()),
    )).map_err(|e| e.to_string())?;

    Ok(product_id)
}

#[tauri::command]
async fn get_products(
    limit: Option<i32>,
    offset: Option<i32>,
    state: State<'_, DbState>,
) -> Result<Vec<Product>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, barcode, price, stock, category, created_at, updated_at, synced_at
         FROM products
         ORDER BY name ASC
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        (limit.unwrap_or(100), offset.unwrap_or(0)),
        |row| {
            Ok(Product {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                description: row.get(2)?,
                barcode: row.get(3)?,
                price: row.get(4)?,
                stock: row.get(5)?,
                category: row.get(6)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                    .unwrap()
                    .with_timezone(&Utc),
                synced_at: row.get::<_, Option<String>>(9)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        products.push(row.map_err(|e| e.to_string())?);
    }

    Ok(products)
}

#[tauri::command]
async fn create_customer(
    customer: Customer,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let customer_id = customer.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut stmt = conn.prepare(
        "INSERT INTO customers (id, name, email, phone, address, created_at, updated_at, synced_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         email = excluded.email,
         phone = excluded.phone,
         address = excluded.address,
         updated_at = excluded.updated_at,
         synced_at = excluded.synced_at"
    ).map_err(|e| e.to_string())?;

    stmt.execute((
        &customer_id,
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.created_at.to_rfc3339(),
        customer.updated_at.to_rfc3339(),
        customer.synced_at.map(|dt| dt.to_rfc3339()),
    )).map_err(|e| e.to_string())?;

    Ok(customer_id)
}

#[tauri::command]
async fn get_customers(
    limit: Option<i32>,
    offset: Option<i32>,
    state: State<'_, DbState>,
) -> Result<Vec<Customer>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, email, phone, address, created_at, updated_at, synced_at
         FROM customers
         ORDER BY name ASC
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        (limit.unwrap_or(100), offset.unwrap_or(0)),
        |row| {
            Ok(Customer {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .unwrap()
                    .with_timezone(&Utc),
                synced_at: row.get::<_, Option<String>>(7)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut customers = Vec::new();
    for row in rows {
        customers.push(row.map_err(|e| e.to_string())?);
    }

    Ok(customers)
}

#[tauri::command]
async fn update_inventory(
    product_id: String,
    quantity_change: i32,
    state: State<'_, DbState>,
) -> Result<(), String> {
    println!("\n📊 [RUST] UPDATE INVENTORY COMMAND RECEIVED");
    println!("📦 Product ID: {}", product_id);
    println!("🔢 Quantity Change: {}", quantity_change);

    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE products SET stock = stock + ?1, updated_at = ?2 WHERE id = ?3",
        (
            quantity_change,
            Utc::now().to_rfc3339(),
            product_id,
        ),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// Sync-related commands
#[tauri::command]
async fn get_transactions_since(
    timestamp: String,
    state: State<'_, DbState>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, customer_id, total_amount, payment_method, created_at, updated_at, synced_at
         FROM transactions
         WHERE updated_at > ?1 OR synced_at IS NULL
         ORDER BY updated_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        [&timestamp],
        |row| {
            Ok(Transaction {
                id: Some(row.get(0)?),
                customer_id: row.get(1)?,
                items: Vec::new(), // Items will be fetched separately if needed
                total_amount: row.get(2)?,
                payment_method: row.get(3)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                synced_at: row.get::<_, Option<String>>(6)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut transactions = Vec::new();
    for row in rows {
        let mut transaction = row.map_err(|e| e.to_string())?;

        // Fetch transaction items for this transaction
        if let Some(ref transaction_id) = transaction.id {
            let mut item_stmt = conn.prepare(
                "SELECT id, product_id, quantity, unit_price, total_price
                 FROM transaction_items
                 WHERE transaction_id = ?1"
            ).map_err(|e| e.to_string())?;

            let item_rows = item_stmt.query_map(
                [transaction_id],
                |row| {
                    Ok(TransactionItem {
                        id: Some(row.get(0)?),
                        transaction_id: Some(transaction_id.clone()),
                        product_id: row.get(1)?,
                        quantity: row.get(2)?,
                        unit_price: row.get(3)?,
                        total_price: row.get(4)?,
                    })
                },
            ).map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for item_row in item_rows {
                items.push(item_row.map_err(|e| e.to_string())?);
            }
            transaction.items = items;
        }

        transactions.push(transaction);
    }

    Ok(transactions)
}

#[tauri::command]
async fn get_products_since(
    timestamp: String,
    state: State<'_, DbState>,
) -> Result<Vec<Product>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, description, barcode, price, stock, category, created_at, updated_at, synced_at
         FROM products
         WHERE updated_at > ?1 OR synced_at IS NULL
         ORDER BY updated_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        [&timestamp],
        |row| {
            Ok(Product {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                description: row.get(2)?,
                barcode: row.get(3)?,
                price: row.get(4)?,
                stock: row.get(5)?,
                category: row.get(6)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                    .unwrap()
                    .with_timezone(&Utc),
                synced_at: row.get::<_, Option<String>>(9)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for row in rows {
        products.push(row.map_err(|e| e.to_string())?);
    }

    Ok(products)
}

#[tauri::command]
async fn get_customers_since(
    timestamp: String,
    state: State<'_, DbState>,
) -> Result<Vec<Customer>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, email, phone, address, created_at, updated_at, synced_at
         FROM customers
         WHERE updated_at > ?1 OR synced_at IS NULL
         ORDER BY updated_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(
        [&timestamp],
        |row| {
            Ok(Customer {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .unwrap()
                    .with_timezone(&Utc),
                synced_at: row.get::<_, Option<String>>(7)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Utc)),
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut customers = Vec::new();
    for row in rows {
        customers.push(row.map_err(|e| e.to_string())?);
    }

    Ok(customers)
}

#[tauri::command]
async fn mark_transaction_synced(
    id: String,
    synced_at: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE transactions SET synced_at = ?1 WHERE id = ?2",
        [&synced_at, &id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn mark_product_synced(
    id: String,
    synced_at: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE products SET synced_at = ?1 WHERE id = ?2",
        [&synced_at, &id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn test_database_connection(state: State<'_, DbState>) -> Result<bool, String> {
    println!("🔍 Testing database connection...");

    match state.conn.lock() {
        Ok(conn) => {
            // Test with a simple query (use query_row for SELECT)
            match conn.query_row("SELECT 1", [], |row| {
                let _result: i32 = row.get(0)?;
                Ok(())
            }) {
                Ok(_) => {
                    println!("✅ Database connection test: SUCCESS");
                    Ok(true)
                }
                Err(e) => {
                    println!("❌ Database connection test: FAILED - {}", e);
                    Err(format!("Database query failed: {}", e))
                }
            }
        }
        Err(e) => {
            println!("❌ Database connection test: FAILED - {}", e);
            Err(format!("Failed to acquire database lock: {}", e))
        }
    }
}

#[tauri::command]
async fn ping() -> Result<String, String> {
    println!("🏓 Ping command received");
    Ok("pong".to_string())
}

#[tauri::command]
async fn get_database_stats(state: State<'_, DbState>) -> Result<serde_json::Value, String> {
    println!("\n📊 [RUST] GET DATABASE STATS COMMAND RECEIVED");

    // Test database connection first
    match state.conn.lock() {
        Ok(conn) => {
            println!("✅ Database lock acquired successfully");

            // Test basic database query
            match conn.query_row("SELECT 1", [], |row| {
                let _result: i32 = row.get(0)?;
                Ok(())
            }) {
                Ok(_) => println!("✅ Database connection test: SUCCESS"),
                Err(e) => {
                    println!("❌ Database connection test: FAILED - {}", e);
                    return Err(format!("Database connection failed: {}", e));
                }
            }

            // Get transactions count
            let total_transactions: i64 = match conn.query_row("SELECT COUNT(*) FROM transactions", [], |row| row.get(0)) {
                Ok(count) => {
                    println!("📈 Total transactions: {}", count);
                    count
                }
                Err(e) => {
                    println!("⚠️ Failed to get transactions count: {}", e);
                    0
                }
            };

            // Get products count
            let total_products: i64 = match conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0)) {
                Ok(count) => {
                    println!("📦 Total products: {}", count);
                    count
                }
                Err(e) => {
                    println!("⚠️ Failed to get products count: {}", e);
                    0
                }
            };

            // Get customers count
            let total_customers: i64 = match conn.query_row("SELECT COUNT(*) FROM customers", [], |row| row.get(0)) {
                Ok(count) => {
                    println!("👥 Total customers: {}", count);
                    count
                }
                Err(e) => {
                    println!("⚠️ Failed to get customers count: {}", e);
                    0
                }
            };

            // Get total stock value
            let total_stock_value: f64 = match conn.query_row("SELECT COALESCE(SUM(stock * price), 0) FROM products", [], |row| row.get(0)) {
                Ok(value) => {
                    println!("💰 Total stock value: {:.2}", value);
                    value
                }
                Err(e) => {
                    println!("⚠️ Failed to get stock value: {}", e);
                    0.0
                }
            };

            let stats = serde_json::json!({
                "totalTransactions": total_transactions,
                "totalProducts": total_products,
                "totalCustomers": total_customers,
                "totalStockValue": total_stock_value
            });

            println!("✅ [RUST] DATABASE STATS SUCCESS: {}", stats);
            Ok(stats)
        }
        Err(e) => {
            println!("❌ [RUST] DATABASE LOCK FAILED: {}", e);
            Err(format!("Failed to acquire database lock: {}", e))
        }
    }
}

#[tauri::command]
async fn mark_customer_synced(
    id: String,
    synced_at: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE customers SET synced_at = ?1 WHERE id = ?2",
        [&synced_at, &id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    println!("🚀 Starting Tauri application...");

    // Initialize database
    println!("📁 Initializing database...");
    let conn = match init_database() {
        Ok(conn) => {
            println!("✅ Database initialized successfully");
            conn
        }
        Err(e) => {
            eprintln!("❌ Failed to initialize database: {}", e);
            panic!("Database initialization failed: {}", e);
        }
    };

    let db_state = DbState {
        conn: Arc::new(Mutex::new(conn)),
    };

    println!("🔧 Setting up Tauri builders...");
    tauri::Builder::default()
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            create_transaction,
            get_transactions,
            create_product,
            get_products,
            create_customer,
            get_customers,
            update_inventory,
            get_transactions_since,
            get_products_since,
            get_customers_since,
            mark_transaction_synced,
            mark_product_synced,
            mark_customer_synced,
            get_database_stats,
            test_database_connection,
            ping
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}