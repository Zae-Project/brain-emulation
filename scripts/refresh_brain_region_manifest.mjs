#!/usr/bin/env node

/**
 * Rebuilds data/brain_region_maps/manifest.json by scanning all JSON templates.
 * Run whenever you add or update atlas templates so the client can auto-load them.
 *
 * Usage:
 *   node scripts/refresh_brain_region_manifest.mjs
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const atlasDir = path.join(repoRoot, 'data', 'brain_region_maps');
const manifestPath = path.join(atlasDir, 'manifest.json');

function pickDescription(metadata = {}) {
  if (typeof metadata.description === 'string' && metadata.description.trim()) {
    return metadata.description.trim();
  }
  if (Array.isArray(metadata.notes) && metadata.notes.length) {
    const note = metadata.notes.find((item) => typeof item === 'string' && item.trim());
    if (note) return note.trim();
  }
  if (Array.isArray(metadata.references) && metadata.references.length) {
    const ref = metadata.references[0];
    if (typeof ref === 'string' && ref.trim()) {
      return `Ref: ${ref.trim()}`;
    }
  }
  return undefined;
}

async function readTemplateSummary(fileName) {
  const fullPath = path.join(atlasDir, fileName);
  const contents = await fs.readFile(fullPath, 'utf8');
  const template = JSON.parse(contents);

  const metadata = template.metadata || {};
  const label =
    template.regionName ||
    metadata.displayLabel ||
    metadata.region ||
    template.id ||
    fileName.replace(/\.json$/i, '');

  const source =
    metadata.source ||
    metadata.atlas ||
    metadata.release ||
    'Unknown source';

  const summary = {
    id: template.id || label.replace(/\s+/g, '_'),
    file: fileName,
    label,
    source,
  };

  const description = pickDescription(metadata);
  if (description) summary.description = description;

  if (Array.isArray(metadata.regions) && metadata.regions.length) {
    summary.regions = metadata.regions;
  } else if (metadata.regionName) {
    summary.regions = [metadata.regionName];
  }

  return summary;
}

async function buildManifest() {
  try {
    const entries = await fs.readdir(atlasDir, { withFileTypes: true });
    const templates = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      if (!name.toLowerCase().endsWith('.json')) continue;
      if (name === 'manifest.json') continue;

      try {
        const summary = await readTemplateSummary(name);
        templates.push(summary);
      } catch (error) {
        console.warn(`⚠️  Skipping ${name}: ${error.message}`);
      }
    }

    templates.sort((a, b) => a.label.localeCompare(b.label));

    const manifest = {
      version: new Date().toISOString().slice(0, 10),
      templates,
    };

    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log(`✅ Updated manifest with ${templates.length} template(s).`);
    console.log(`   -> ${path.relative(repoRoot, manifestPath)}`);
  } catch (error) {
    console.error('Failed to rebuild brain region manifest:', error);
    process.exitCode = 1;
  }
}

buildManifest();
