import { openDatabase,resolveDbPath } from './connection.js';
import { initializeDatabase } from './init.js';

const db=openDatabase();initializeDatabase(db);
db.exec('BEGIN IMMEDIATE');
try {
  const category=db.prepare('INSERT OR IGNORE INTO categories (name,description) VALUES (?,?)');
  [['Electronics','Electronic accessories and office equipment'],['Office Supplies','Everyday workplace consumables'],['Storage','Shelving and storage products']].forEach(x=>category.run(...x));
  const supplier=db.prepare('INSERT INTO suppliers (name,contact_person,email,phone,address) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name=? COLLATE NOCASE)');
  [['Lanka Business Supplies','Nimali Perera','orders@lankabusiness.example','+94 11 555 0140','Colombo 03'],['TechSource Lanka','Kasun Silva','sales@techsource.example','+94 77 555 0188','Kandy']].forEach(x=>supplier.run(...x,x[0]));
  const product=db.prepare(`INSERT OR IGNORE INTO products (sku,name,description,category_id,supplier_id,cost_price,selling_price,quantity,reorder_level,status) VALUES (?, ?, ?, (SELECT id FROM categories WHERE name=?), (SELECT id FROM suppliers WHERE name=?), ?, ?, ?, ?, 'ACTIVE') RETURNING id`);
  const movement=db.prepare("INSERT INTO stock_movements (product_id,type,quantity,note) VALUES (?,'IN',?,'Opening stock from demonstration seed')");
  [['USB-C-HUB-01','7-Port USB-C Hub','Aluminium USB-C desk hub','Electronics','TechSource Lanka',850000,1090000,12,5],['PAPER-A4-80','A4 Copy Paper 80gsm','500-sheet ream','Office Supplies','Lanka Business Supplies',165000,195000,4,10],['ARCH-BOX-01','Archive Storage Box','Reinforced document storage box','Storage','Lanka Business Supplies',95000,125000,0,6]].forEach(x=>{const r=product.get(...x);if(r&&x[7]>0)movement.run(r.id,x[7]);});
  db.exec('COMMIT');console.log(`Seed data loaded into ${resolveDbPath()}`);
} catch(e){db.exec('ROLLBACK');throw e;} finally {db.close();}
