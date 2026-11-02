'use strict';

const express = require('express');
const { authRequired } = require('../auth');
const { all, get, run } = require('../db');

const router = express.Router();
router.use(authRequired);

const DEFAULT_BOOKS = [
  { name: '工作笔记', color: '#2563eb' },
  { name: '学习笔记', color: '#10b981' },
  { name: '灵感收集', color: '#f59e0b' },
  { name: '生活随笔', color: '#ec4899' }
];

function owner(req) {
  return { tenantId: req.tenant.id, userId: req.user.id };
}

function ensureBooks(req) {
  const { tenantId, userId } = owner(req);
  const count = get('SELECT COUNT(*) c FROM note_books WHERE tenant_id = ? AND owner_user_id = ?', [tenantId, userId]).c;
  if (!count) {
    DEFAULT_BOOKS.forEach((book, i) => {
      run('INSERT INTO note_books (tenant_id, owner_user_id, name, color, sort_order) VALUES (?,?,?,?,?)', [tenantId, userId, book.name, book.color, i]);
    });
  }
  return all('SELECT * FROM note_books WHERE tenant_id = ? AND owner_user_id = ? ORDER BY sort_order, id', [tenantId, userId]);
}

function bookOut(row) {
  return row ? { id: row.id, name: row.name, color: row.color, sortOrder: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at } : null;
}

function noteOut(row) {
  return row ? {
    id: row.id,
    notebookId: row.notebook_id,
    title: row.title,
    content: row.content,
    tag: row.tag || '',
    pinned: !!row.pinned,
    starred: !!row.starred,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  } : null;
}

function findBook(req, id) {
  const { tenantId, userId } = owner(req);
  return get('SELECT * FROM note_books WHERE id = ? AND tenant_id = ? AND owner_user_id = ?', [Number(id), tenantId, userId]);
}

function findNote(req, id) {
  const { tenantId, userId } = owner(req);
  return get('SELECT * FROM notes WHERE id = ? AND tenant_id = ? AND owner_user_id = ?', [Number(id), tenantId, userId]);
}

function parseNotebook(value) {
  const id = Number(String(value || '').replace(/^nb-/, ''));
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.get('/books', (req, res) => {
  const books = ensureBooks(req);
  const counts = all('SELECT notebook_id, COUNT(*) c FROM notes WHERE tenant_id = ? AND owner_user_id = ? AND status = ? GROUP BY notebook_id', [req.tenant.id, req.user.id, 'normal']);
  const map = new Map(counts.map((r) => [r.notebook_id, r.c]));
  res.json({ books: books.map((b) => ({ ...bookOut(b), noteCount: map.get(b.id) || 0 })) });
});

router.post('/books', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 40);
  const color = String(req.body.color || '#2563eb').slice(0, 20);
  if (!name) return res.status(400).json({ error: '请填写笔记本名称' });
  const max = get('SELECT COALESCE(MAX(sort_order), -1) m FROM note_books WHERE tenant_id = ? AND owner_user_id = ?', [req.tenant.id, req.user.id]).m;
  const id = run('INSERT INTO note_books (tenant_id, owner_user_id, name, color, sort_order) VALUES (?,?,?,?,?)', [req.tenant.id, req.user.id, name, color, max + 1]).lastInsertRowid;
  res.json({ ok: true, book: bookOut(findBook(req, id)) });
});

router.patch('/books/:id', (req, res) => {
  const book = findBook(req, req.params.id);
  if (!book) return res.status(404).json({ error: '笔记本不存在' });
  const updates = [];
  const params = [];
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ error: '请填写笔记本名称' });
    updates.push('name = ?'); params.push(name);
  }
  if (req.body.color !== undefined) { updates.push('color = ?'); params.push(String(req.body.color || '#2563eb').slice(0, 20)); }
  if (req.body.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(Number(req.body.sortOrder) || 0); }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  updates.push("updated_at = datetime('now')");
  params.push(book.id);
  run(`UPDATE note_books SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true, book: bookOut(findBook(req, book.id)) });
});

router.delete('/books/:id', (req, res) => {
  const book = findBook(req, req.params.id);
  if (!book) return res.status(404).json({ error: '笔记本不存在' });
  const count = get('SELECT COUNT(*) c FROM notes WHERE tenant_id = ? AND owner_user_id = ? AND notebook_id = ? AND status = ?', [req.tenant.id, req.user.id, book.id, 'normal']).c;
  if (count) return res.status(409).json({ error: '请先移除该笔记本下的笔记' });
  run('DELETE FROM note_books WHERE id = ?', [book.id]);
  res.json({ ok: true });
});

router.get('/', (req, res) => {
  const books = ensureBooks(req);
  const view = String(req.query.view || 'all');
  const q = String(req.query.q || '').trim();
  const sort = ['newest', 'oldest', 'title'].includes(req.query.sort) ? req.query.sort : 'newest';
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 500));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const where = ['tenant_id = ?', 'owner_user_id = ?'];
  const params = [req.tenant.id, req.user.id];
  if (view === 'trash') where.push("status = 'trash'");
  else where.push("status = 'normal'");
  if (view === 'starred') where.push('starred = 1');
  if (view === 'recent') { /* sorted below */ }
  if (req.query.notebookId) {
    const notebookId = parseNotebook(req.query.notebookId);
    if (notebookId) { where.push('notebook_id = ?'); params.push(notebookId); }
  }
  if (q) {
    where.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const orderBy = view === 'recent' ? 'updated_at DESC' : sort === 'oldest' ? 'updated_at ASC' : sort === 'title' ? 'title COLLATE NOCASE ASC' : 'updated_at DESC';
  const rows = all(`SELECT * FROM notes WHERE ${where.join(' AND ')} ORDER BY pinned DESC, ${orderBy} LIMIT ? OFFSET ?`, [...params, view === 'recent' ? 10 : limit, offset]);
  const total = get(`SELECT COUNT(*) c FROM notes WHERE ${where.join(' AND ')}`, params).c;
  res.json({ notes: rows.map(noteOut), total, view, books: books.map(bookOut) });
});

router.post('/', (req, res) => {
  const books = ensureBooks(req);
  let notebookId = parseNotebook(req.body.notebookId);
  if (notebookId && !findBook(req, notebookId)) notebookId = null;
  if (!notebookId) notebookId = books[0] ? books[0].id : null;
  const title = String(req.body.title || '').slice(0, 200);
  const content = String(req.body.content || '').slice(0, 200000);
  const tag = String(req.body.tag || '').slice(0, 20);
  const id = run('INSERT INTO notes (tenant_id, owner_user_id, notebook_id, title, content, tag) VALUES (?,?,?,?,?,?)', [req.tenant.id, req.user.id, notebookId, title, content, tag]).lastInsertRowid;
  res.json({ ok: true, note: noteOut(findNote(req, id)) });
});

router.get('/:id', (req, res) => {
  const note = findNote(req, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  res.json({ note: noteOut(note) });
});

router.patch('/:id', (req, res) => {
  const note = findNote(req, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  if (note.status !== 'normal') return res.status(400).json({ error: '回收站中的笔记不可编辑' });
  const version = req.body.version == null ? null : Number(req.body.version);
  if (version != null && version !== Number(note.version)) {
    return res.status(409).json({ error: '笔记已在其他窗口更新，请刷新后再试', note: noteOut(note) });
  }
  const updates = [];
  const params = [];
  if (req.body.title !== undefined) { updates.push('title = ?'); params.push(String(req.body.title || '').slice(0, 200)); }
  if (req.body.content !== undefined) { updates.push('content = ?'); params.push(String(req.body.content || '').slice(0, 200000)); }
  if (req.body.tag !== undefined) { updates.push('tag = ?'); params.push(String(req.body.tag || '').slice(0, 20)); }
  if (req.body.pinned !== undefined) { updates.push('pinned = ?'); params.push(req.body.pinned ? 1 : 0); }
  if (req.body.starred !== undefined) { updates.push('starred = ?'); params.push(req.body.starred ? 1 : 0); }
  if (req.body.notebookId !== undefined) {
    const notebookId = parseNotebook(req.body.notebookId);
    if (notebookId && !findBook(req, notebookId)) return res.status(400).json({ error: '笔记本不存在' });
    updates.push('notebook_id = ?'); params.push(notebookId);
  }
  if (!updates.length) return res.status(400).json({ error: '没有可更新字段' });
  updates.push('version = version + 1', "updated_at = datetime('now')");
  params.push(note.id);
  run(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true, note: noteOut(findNote(req, note.id)) });
});

router.delete('/:id', (req, res) => {
  const note = findNote(req, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  if (note.status === 'trash') return res.status(400).json({ error: '笔记已在回收站' });
  run("UPDATE notes SET status = 'trash', deleted_at = datetime('now'), version = version + 1, updated_at = datetime('now') WHERE id = ?", [note.id]);
  res.json({ ok: true, note: noteOut(findNote(req, note.id)) });
});

router.post('/:id/restore', (req, res) => {
  const note = findNote(req, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  if (note.status !== 'trash') return res.status(400).json({ error: '笔记不在回收站' });
  run("UPDATE notes SET status = 'normal', deleted_at = NULL, version = version + 1, updated_at = datetime('now') WHERE id = ?", [note.id]);
  res.json({ ok: true, note: noteOut(findNote(req, note.id)) });
});

router.delete('/:id/purge', (req, res) => {
  const note = findNote(req, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  run('DELETE FROM notes WHERE id = ?', [note.id]);
  res.json({ ok: true });
});

module.exports = router;
