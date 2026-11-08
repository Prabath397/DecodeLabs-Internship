const query=`SELECT m.id,m.product_id,m.type,m.quantity,m.note,m.created_at,p.name product_name,p.sku FROM stock_movements m JOIN products p ON p.id=m.product_id`;
const map=r=>({id:r.id,productId:r.product_id,productName:r.product_name,sku:r.sku,type:r.type,quantity:r.quantity,note:r.note,createdAt:r.created_at});
export function stockRepository(db) { return {
  list:(productId=null,limit=100)=>db.prepare(`${query}${productId?' WHERE m.product_id=?':''} ORDER BY m.created_at DESC,m.id DESC LIMIT ?`).all(...(productId?[productId,limit]:[limit])).map(map),
  insert:(productId,type,quantity,note)=>db.prepare('INSERT INTO stock_movements (product_id,type,quantity,note) VALUES (?,?,?,?) RETURNING id').get(productId,type,quantity,note).id
}; }
