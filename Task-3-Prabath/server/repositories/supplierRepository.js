export function supplierRepository(db) {
  const map = (r) => r && ({ id: r.id, name: r.name, contactPerson: r.contact_person, email: r.email, phone: r.phone, address: r.address, createdAt: r.created_at, updatedAt: r.updated_at });
  return {
    all: (search = '') => db.prepare("SELECT * FROM suppliers WHERE name LIKE ? ESCAPE '\\' ORDER BY name COLLATE NOCASE").all(`%${search.replace(/[\\%_]/g, '\\$&')}%`).map(map),
    byId: (id) => map(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)),
    create: (v) => map(db.prepare('INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?) RETURNING *').get(v.name.trim(), v.contactPerson?.trim() || '', v.email?.trim() || '', v.phone?.trim() || '', v.address?.trim() || '')),
    update: (id, v) => map(db.prepare("UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? RETURNING *").get(v.name.trim(), v.contactPerson?.trim() || '', v.email?.trim() || '', v.phone?.trim() || '', v.address?.trim() || '', id)),
    remove: (id) => db.prepare('DELETE FROM suppliers WHERE id = ?').run(id).changes
  };
}
