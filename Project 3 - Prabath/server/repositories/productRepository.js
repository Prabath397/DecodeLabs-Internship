const select = `SELECT p.*, c.name category_name, s.name supplier_name FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id`;
const map = (r) => r && ({ id:r.id, sku:r.sku, name:r.name, description:r.description, categoryId:r.category_id, categoryName:r.category_name, supplierId:r.supplier_id, supplierName:r.supplier_name, costPrice:r.cost_price, sellingPrice:r.selling_price, quantity:r.quantity, reorderLevel:r.reorder_level, status:r.status, createdAt:r.created_at, updatedAt:r.updated_at });
export function productRepository(db) {
  return {
    list(q) {
      const where = [], values = [];
      if (q.search) { where.push("(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\')"); const s=`%${q.search.replace(/[\\%_]/g,'\\$&')}%`; values.push(s,s); }
      if (q.categoryId) { where.push('p.category_id=?'); values.push(q.categoryId); }
      if (q.status) { where.push('p.status=?'); values.push(q.status); }
      if (q.stock === 'LOW') where.push('p.quantity > 0 AND p.quantity <= p.reorder_level');
      if (q.stock === 'OUT') where.push('p.quantity = 0');
      if (q.stock === 'OK') where.push('p.quantity > p.reorder_level');
      const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const columns={name:'p.name COLLATE NOCASE',quantity:'p.quantity',price:'p.selling_price',date:'p.created_at'};
      const order=columns[q.sort] || columns.name, direction=q.order==='desc'?'DESC':'ASC';
      const total=db.prepare(`SELECT COUNT(*) total FROM products p${clause}`).get(...values).total;
      const rows=db.prepare(`${select}${clause} ORDER BY ${order} ${direction}, p.id ASC LIMIT ? OFFSET ?`).all(...values,q.limit,(q.page-1)*q.limit).map(map);
      return { rows, total };
    },
    byId: (id) => map(db.prepare(`${select} WHERE p.id=?`).get(id)),
    insert(v) { return db.prepare(`INSERT INTO products (sku,name,description,category_id,supplier_id,cost_price,selling_price,quantity,reorder_level,status) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`).get(v.sku.trim(),v.name.trim(),v.description?.trim()||'',v.categoryId,v.supplierId??null,v.costPrice,v.sellingPrice,v.quantity,v.reorderLevel,v.status).id; },
    update(id,v) { return db.prepare(`UPDATE products SET sku=?,name=?,description=?,category_id=?,supplier_id=?,cost_price=?,selling_price=?,reorder_level=?,status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`).run(v.sku.trim(),v.name.trim(),v.description?.trim()||'',v.categoryId,v.supplierId??null,v.costPrice,v.sellingPrice,v.reorderLevel,v.status,id).changes; },
    remove: (id) => db.prepare('DELETE FROM products WHERE id=?').run(id).changes
  };
}
