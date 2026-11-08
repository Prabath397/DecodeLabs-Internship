import { AppError, notFound } from '../utils/errors.js';
import { productRepository } from '../repositories/productRepository.js';
import { stockRepository } from '../repositories/stockRepository.js';

export function inventoryService(db) {
  const products=productRepository(db), stock=stockRepository(db);
  return {
    createProduct(v) {
      db.exec('BEGIN IMMEDIATE');
      try { const id=products.insert(v); if(v.quantity>0) stock.insert(id,'IN',v.quantity,'Opening stock'); db.exec('COMMIT'); return products.byId(id); }
      catch(e){ db.exec('ROLLBACK'); throw e; }
    },
    recordMovement(productId,v) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const product=products.byId(productId); if(!product) throw notFound('Product');
        const delta=v.type==='IN'?v.quantity:-v.quantity;
        const result=db.prepare("UPDATE products SET quantity=quantity+?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND quantity+?>=0").run(delta,productId,delta);
        if(!result.changes) throw new AppError(409,'INSUFFICIENT_STOCK','Stock-out quantity exceeds available stock');
        const id=stock.insert(productId,v.type,v.quantity,v.note?.trim()||'');
        db.exec('COMMIT');
        return { movement:stock.list(productId,100).find(x=>x.id===id), product:products.byId(productId) };
      } catch(e){ db.exec('ROLLBACK'); throw e; }
    },
    deleteProduct(id) {
      const count=db.prepare('SELECT COUNT(*) count FROM stock_movements WHERE product_id=?').get(id).count;
      if(count) throw new AppError(409,'PRODUCT_HAS_HISTORY','Products with stock movement history cannot be deleted; mark the product inactive instead');
      if(!products.remove(id)) throw notFound('Product');
    }
  };
}
