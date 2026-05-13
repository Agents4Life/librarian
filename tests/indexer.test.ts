import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildIndex, loadIndex, saveIndex, createQueryApi, parseNote, detectSection, computeContentHash, extractHeadings, extractLinks, extractTags, parseFrontmatter } from "../src/indexer/index.js";
import { buildOrLoadIndex, createIndexContext } from "../src/index-context.js";

const createVault = async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), "librarian-vault-"));

  await mkdir(path.join(vaultPath, "raw"), { recursive: true });
  await mkdir(path.join(vaultPath, "wiki", "conceptos"), { recursive: true });
  await mkdir(path.join(vaultPath, "wiki", "entidades"), { recursive: true });
  await mkdir(path.join(vaultPath, "reportes"), { recursive: true });

  await writeFile(
    path.join(vaultPath, "raw", "idea.md"),
    ["---", "librarian:", "  processed: false", "---", "", "Idea about [[Clean Architecture]]."].join("\n"),
  );

  await writeFile(
    path.join(vaultPath, "wiki", "conceptos", "clean-architecture.md"),
    ["---", "tags: [software, architecture]", "librarian:", "  status: active", "  processed: true", "---", "", "# Clean Architecture", "", "A software pattern. See [[SOLID]]."].join("\n"),
  );

  await writeFile(
    path.join(vaultPath, "wiki", "entidades", "solid.md"),
    ["---", "tags: [software]", "---", "", "# SOLID", "", "Five principles. Used in [[Clean Architecture]]."].join("\n"),
  );

  await writeFile(
    path.join(vaultPath, "reportes", "report.md"),
    ["---", "---", "", "# Report", "", "Status report."].join("\n"),
  );

  return vaultPath;
};

test("detectSection classifies paths correctly", () => {
  assert.equal(detectSection("raw/idea.md"), "raw");
  assert.equal(detectSection("wiki/conceptos/test.md"), "wiki");
  assert.equal(detectSection("reportes/2024.md"), "reports");
  assert.equal(detectSection("reviews/pr.md"), "reviews");
  assert.equal(detectSection("memory/session.md"), "memory");
  assert.equal(detectSection("templates/note.md"), "templates");
  assert.equal(detectSection("random.md"), "unknown");
});

test("detectSection with custom section map", () => {
  const custom = { "src/": "raw" as const };
  assert.equal(detectSection("src/foo.md", custom), "raw");
  assert.equal(detectSection("raw/foo.md", custom), "unknown");
});

test("computeContentHash is deterministic", () => {
  const hash1 = computeContentHash("hello world");
  const hash2 = computeContentHash("hello world");
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test("computeContentHash ignores whitespace differences", () => {
  const hash1 = computeContentHash("hello\nworld");
  const hash2 = computeContentHash("hello\r\nworld");
  assert.equal(hash1, hash2);
});

test("extractHeadings parses markdown headings", () => {
  const body = "# Title\n## Section 1\n### Sub\nText\n## Section 2";
  const headings = extractHeadings(body);
  assert.deepEqual(headings, ["Title", "Section 1", "Sub", "Section 2"]);
});

test("extractLinks extracts wikilinks", () => {
  const content = "See [[Clean Architecture]] and [[SOLID|principles]]. Also [[Design Patterns#creational]].";
  const links = extractLinks(content);
  assert.deepEqual(links, ["Clean Architecture", "SOLID", "Design Patterns"]);
});

test("extractTags reads from frontmatter and body", () => {
  const tags = extractTags({ tags: ["software", "architecture"] }, "body text #pattern #software");
  assert.ok(tags.includes("software"));
  assert.ok(tags.includes("architecture"));
  assert.ok(tags.includes("pattern"));
});

test("parseFrontmatter handles valid frontmatter", () => {
  const content = "---\ntitle: Test\nlibrarian:\n  processed: true\n---\n\nBody text";
  const { data, body } = parseFrontmatter(content);
  assert.equal(data.title, "Test");
  assert.equal(body.trim(), "Body text");
});

test("parseFrontmatter handles no frontmatter", () => {
  const content = "# Just a note\n\nNo frontmatter here.";
  const { data, body } = parseFrontmatter(content);
  assert.deepEqual(data, {});
  assert.ok(body.includes("Just a note"));
});

test("parseNote parses a single markdown file", async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), "librarian-vault-"));
  await writeFile(
    path.join(vaultPath, "test.md"),
    ["---", "tags: [test]", "---", "", "# Test Note", "", "Links to [[Other]]."].join("\n"),
  );

  const note = await parseNote(path.join(vaultPath, "test.md"), vaultPath);

  assert.equal(note.title, "test");
  assert.equal(note.section, "unknown");
  assert.deepEqual(note.tags, ["test"]);
  assert.deepEqual(note.links, ["Other"]);
  assert.deepEqual(note.headings, ["Test Note"]);
  assert.equal(note.wordCount, 6);
  assert.equal(note.contentHash.length, 64);
});

test("buildIndex walks vault and computes backlinks", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);

  assert.equal(index.version, 1);
  assert.ok(index.builtAt);

  const notePaths = Object.keys(index.notes);
  assert.ok(notePaths.length >= 4);

  const cleanArch = index.notes["wiki/conceptos/clean-architecture.md"];
  assert.ok(cleanArch, "clean-architecture.md should be indexed");
  assert.equal(cleanArch.section, "wiki");
  assert.ok(cleanArch.links.includes("SOLID"));

  const solid = index.notes["wiki/entidades/solid.md"];
  assert.ok(solid, "solid.md should be indexed");
  assert.ok(solid.backlinks.includes("wiki/conceptos/clean-architecture.md"), "solid should have clean-architecture as backlink");

  const rawIdea = index.notes["raw/idea.md"];
  assert.ok(rawIdea, "raw/idea.md should be indexed");
  assert.equal(rawIdea.section, "raw");
});

test("buildIndex skips dot directories", async () => {
  const vaultPath = await createVault();
  await mkdir(path.join(vaultPath, ".obsidian"), { recursive: true });
  await writeFile(path.join(vaultPath, ".obsidian", "config.md"), "config");

  const index = await buildIndex(vaultPath);
  const paths = Object.keys(index.notes);

  assert.ok(!paths.some((p) => p.includes(".obsidian")));
});

test("saveIndex and loadIndex round-trip", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);

  await saveIndex(vaultPath, index);
  const loaded = await loadIndex(vaultPath);

  assert.ok(loaded, "loaded index should not be null");
  assert.equal(loaded.version, 1);
  assert.deepEqual(Object.keys(loaded.notes), Object.keys(index.notes));
  assert.equal(loaded.notes["wiki/conceptos/clean-architecture.md"].title, "clean-architecture");
});

test("loadIndex returns null when no index exists", async () => {
  const vaultPath = await mkdtemp(path.join(os.tmpdir(), "librarian-vault-"));
  const loaded = await loadIndex(vaultPath);
  assert.equal(loaded, null);
});

test("query API - getByPath", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const note = query.getByPath("wiki/conceptos/clean-architecture.md");
  assert.ok(note);
  assert.equal(note.title, "clean-architecture");

  assert.equal(query.getByPath("nonexistent.md"), undefined);
});

test("query API - getByTag", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const software = query.getByTag("software");
  assert.ok(software.length >= 2);

  const architecture = query.getByTag("architecture");
  assert.equal(architecture.length, 1);
});

test("query API - getBySection", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const wiki = query.getBySection("wiki");
  assert.ok(wiki.length >= 2);

  const raw = query.getBySection("raw");
  assert.equal(raw.length, 1);

  const reports = query.getBySection("reports");
  assert.equal(reports.length, 1);
});

test("query API - getBacklinks", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const backlinks = query.getBacklinks("wiki/entidades/solid.md");
  assert.equal(backlinks.length, 1);
  assert.equal(backlinks[0].title, "clean-architecture");
});

test("query API - getForwardLinks", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const forward = query.getForwardLinks("wiki/conceptos/clean-architecture.md");
  assert.equal(forward.length, 1);
  assert.equal(forward[0].title, "solid");
});

test("query API - getOrphans", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const orphans = query.getOrphans();
  assert.ok(orphans.length >= 1);
});

test("query API - getGraphStats", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const stats = query.getGraphStats();
  assert.ok(stats.total_nodes >= 4);
  assert.ok(stats.total_edges >= 2);
  assert.ok(stats.most_connected.length >= 1);
});

test("query API - getStale", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const stale = query.getStale(90);
  assert.ok(Array.isArray(stale));
});

test("query API - getIncomplete", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const incomplete = query.getIncomplete();
  assert.ok(Array.isArray(incomplete));
});

test("query API - search", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const results = query.search("clean architecture", { sections: ["wiki"] });
  assert.ok(results.length >= 1);
  assert.ok(results[0].note.title.includes("clean"));
});

test("query API - getStats", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const stats = query.getStats();
  assert.ok(stats.total_files >= 4);
  assert.ok(stats.by_section.wiki >= 2);
  assert.ok(stats.by_section.raw >= 1);
  assert.equal(stats.by_status.active, 1);
});

test("query API - findPath finds shortest path between notes", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const result = query.findPath("clean-architecture", "solid");
  assert.equal(result.found, true);
  assert.ok(result.path.length >= 2);
  assert.ok(result.path.includes("clean-architecture"));
  assert.ok(result.path.includes("solid"));
});

test("query API - findPath returns not found for disconnected notes", async () => {
  const vaultPath = await createVault();
  await writeFile(path.join(vaultPath, "wiki", "conceptos", "isolated.md"), "# Isolated\n\nNo links.");
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const result = query.findPath("clean-architecture", "isolated");
  assert.equal(result.found, false);
  assert.deepEqual(result.path, []);
});

test("query API - findPath returns not found for nonexistent notes", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const result = query.findPath("nonexistent-a", "nonexistent-b");
  assert.equal(result.found, false);
});

test("query API - getSimilar ranks related notes", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const similar = query.getSimilar("wiki/conceptos/clean-architecture.md", 5);
  assert.ok(similar.length >= 1);
  assert.ok(similar[0].score > 0);
  assert.ok(similar.every((s) => s.note.path !== "wiki/conceptos/clean-architecture.md"));
});

test("query API - getSimilar returns empty for nonexistent path", async () => {
  const vaultPath = await createVault();
  const index = await buildIndex(vaultPath);
  const query = createQueryApi(index);

  const similar = query.getSimilar("nonexistent.md");
  assert.deepEqual(similar, []);
});

test("index-context - buildOrLoadIndex builds new index when none exists", async () => {
  const vaultPath = await createVault();
  const index = await buildOrLoadIndex(vaultPath);

  assert.ok(index);
  assert.equal(index.version, 1);
  assert.ok(Object.keys(index.notes).length >= 4);
});

test("index-context - buildOrLoadIndex loads existing index", async () => {
  const vaultPath = await createVault();
  const built = await buildIndex(vaultPath);
  await saveIndex(vaultPath, built);

  const loaded = await buildOrLoadIndex(vaultPath);
  assert.deepEqual(Object.keys(loaded.notes), Object.keys(built.notes));
});

test("index-context - buildOrLoadIndex rebuilds when vaultPath mismatches", async () => {
  const vaultPath = await createVault();
  const otherVault = await mkdtemp(path.join(os.tmpdir(), "librarian-vault-"));

  const built = await buildIndex(vaultPath);
  await saveIndex(otherVault, built);

  await mkdir(path.join(otherVault, "raw"), { recursive: true });
  await writeFile(path.join(otherVault, "raw", "note.md"), "# Test");

  const loaded = await buildOrLoadIndex(otherVault);
  assert.ok(loaded);
});

test("index-context - createIndexContext returns index and query", async () => {
  const vaultPath = await createVault();
  const ctx = await createIndexContext(vaultPath);

  assert.ok(ctx.index);
  assert.ok(ctx.query);
  assert.ok(ctx.query.getByPath);
  assert.ok(ctx.query.search);

  const note = ctx.query.getByPath("wiki/conceptos/clean-architecture.md");
  assert.ok(note);
});
