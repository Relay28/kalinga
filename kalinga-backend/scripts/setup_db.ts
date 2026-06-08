import { pool } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

async function runSqlFile(filePath: string) {
  console.log(`[Kalinga:Setup] Reading SQL file: ${path.basename(filePath)}`);
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Clean line-by-line SQL comments starting with '--'
  const lines = sql.split('\n');
  const cleanedLines = lines.map(line => {
    const commentIndex = line.indexOf('--');
    if (commentIndex !== -1) {
      return line.substring(0, commentIndex);
    }
    return line;
  });
  const cleanedSql = cleanedLines.join('\n');
  
  // Split by semicolons and filter out empty queries
  const queries = cleanedSql
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0);

  console.log(`[Kalinga:Setup] Executing ${queries.length} queries...`);
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      await pool.query(query);
    } catch (err) {
      console.error(`❌ Error executing query ${i + 1}:`, query);
      console.error(err);
      throw err;
    }
  }
  console.log(`✅ Completed SQL file: ${path.basename(filePath)}`);
}

async function main() {
  const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'src', 'db', 'seed.sql');

  try {
    console.log('[Kalinga:Setup] Starting Database Initialization...');
    
    // Apply Schema
    await runSqlFile(schemaPath);
    
    // Apply Seeds
    await runSqlFile(seedPath);

    console.log('🎉 Database initialized and seeded successfully!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
