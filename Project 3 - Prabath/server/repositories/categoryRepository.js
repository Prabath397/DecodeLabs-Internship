export function categoryRepository(db) {
  const map = (r) => r && ({ id: r.id, name: r.name, description: r.description, createdAt: r.created_at, updatedAt: r.updated_at });
  return {
    all: () => db.prepare('SELECT * FROM categories ORDER BY name COLLATE NOCASE').all().map(map),
    byId: (id) => map(db.prepare('SELECT * FROM categories WHERE id = ?').get(id)),
    create: (v) => map(db.prepare("INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *").get(v.name.trim(), v.description?.trim() || '')),
    update: (id, v) => map(db.prepare("UPDATE categories SET name = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? RETURNING *").get(v.name.trim(), v.description?.trim() || '', id)),
    remove: (id) => db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes
  };
}
