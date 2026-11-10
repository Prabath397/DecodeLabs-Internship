export function dashboardRepository(db) { return {
  stats:()=>db.prepare(`SELECT COUNT(*) totalProducts, COALESCE(SUM(status='ACTIVE'),0) activeProducts, COALESCE(SUM(quantity>0 AND quantity<=reorder_level),0) lowStockProducts, COALESCE(SUM(quantity=0),0) outOfStockProducts, COALESCE(SUM(cost_price*quantity),0) totalInventoryValue, (SELECT COUNT(*) FROM categories) totalCategories, (SELECT COUNT(*) FROM suppliers) totalSuppliers FROM products`).get(),
  restock:()=>db.prepare(`SELECT id,sku,name,quantity,reorder_level reorderLevel FROM products WHERE status='ACTIVE' AND quantity<=reorder_level ORDER BY quantity=0 DESC,(reorder_level-quantity) DESC,name LIMIT 10`).all()
}; }
