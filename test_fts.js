const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./data/edubridge.db');

// Drop and recreate FTS table without external content
db.exec(`DROP TABLE IF EXISTS materials_fts;`);
db.exec(`CREATE VIRTUAL TABLE materials_fts USING fts5(title, description, subject, department, year);`);

// Repopulate
const materials = db.prepare("SELECT id, title, description, subject, department, year FROM materials").all();
for (const m of materials) {
  db.prepare("INSERT INTO materials_fts(rowid, title, description, subject, department, year) VALUES (?, ?, ?, ?, ?, ?)")
    .run(m.id, m.title, m.description, m.subject, m.department, m.year);
}

console.log("Repopulated count:", db.prepare("SELECT COUNT(*) as c FROM materials_fts").get().c);
console.log("Complexity:", db.prepare("SELECT * FROM materials_fts WHERE description MATCH ?").all('complexity'));
console.log("Analysis:", db.prepare("SELECT * FROM materials_fts WHERE description MATCH ?").all('analysis'));
console.log("Algorithms:", db.prepare("SELECT * FROM materials_fts WHERE title MATCH ?").all('Algorithms'));
console.log("Notes:", db.prepare("SELECT * FROM materials_fts WHERE title MATCH ?").all('Notes'));