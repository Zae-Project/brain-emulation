// Utilities for serialising and validating SNN template configurations.
// Consumes the schemas exposed by js/templates/schema.js and provides
// helpers to load/save JSON configurations that mirror those structures.

(function () {
  const schema = window.SNN_TEMPLATE_SCHEMA || {};

  const VALID_CONN_TYPES = new Set(['excitatory', 'inhibitory']);

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Invalid template configuration');
    }
  }

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeNeuronGroup(group, index) {
    assert(group && typeof group === 'object', `Neuron group #${index} must be an object`);
    const preset = String(group.preset || group.typeId || '').trim();
    assert(preset.length > 0, `Neuron group #${index} is missing a preset/id`);
    const count = Math.max(0, Math.round(toNumber(group.count, 0)));
    assert(count > 0, `Neuron group "${preset}" must specify a positive count`);
    return { preset, count };
  }

  function normalizeConnectivityRule(rule, index) {
    assert(rule && typeof rule === 'object', `Connectivity rule #${index} must be an object`);
    const from = String(rule.from || rule.source || '').trim();
    const to = String(rule.to || rule.target || '').trim();
    assert(from && to, `Connectivity rule #${index} must specify "from" and "to" groups`);
    const probability = Math.max(0, Math.min(1, toNumber(rule.probability ?? rule.prob, 0)));
    const type = String(rule.type || '').trim().toLowerCase();
    assert(VALID_CONN_TYPES.has(type), `Connectivity rule ${from}->${to} has invalid type "${rule.type}"`);
    const weight = rule.weight !== undefined ? toNumber(rule.weight) : undefined;
    const delay = rule.delay !== undefined ? toNumber(rule.delay) : undefined;
    return Object.assign(
      { from, to, probability, type },
      weight !== undefined ? { weight } : null,
      delay !== undefined ? { delay } : null
    );
  }

  function normalizeCluster(cluster, index) {
    assert(cluster && typeof cluster === 'object', `Cluster #${index} must be an object`);
    const id = String(cluster.id || cluster.name || `cluster_${index}`).trim();
    assert(id.length > 0, `Cluster #${index} is missing an id/name`);
    const name = String(cluster.name || id).trim();
    const neuronGroups = Array.isArray(cluster.neuronGroups)
      ? cluster.neuronGroups.map(normalizeNeuronGroup)
      : Array.isArray(cluster.groups)
      ? cluster.groups.map(normalizeNeuronGroup)
      : [];
    assert(neuronGroups.length > 0, `Cluster "${id}" must define at least one neuron group`);

    const internalConnectivity = Array.isArray(cluster.internalConnectivity)
      ? cluster.internalConnectivity.map(normalizeConnectivityRule)
      : Array.isArray(cluster.connectivity)
      ? cluster.connectivity.map(normalizeConnectivityRule)
      : [];

    return {
      id,
      name,
      neuronGroups,
      internalConnectivity,
      metadata: cluster.metadata || undefined,
    };
  }

  function normalizeConnectionEdge(edge, index) {
    assert(edge && typeof edge === 'object', `Connection edge #${index} must be an object`);
    const fromCluster = String(edge.fromCluster || edge.from || '').trim();
    const toCluster = String(edge.toCluster || edge.to || '').trim();
    assert(fromCluster && toCluster, `Connection edge #${index} must specify fromCluster/toCluster`);
    const connectivity = Array.isArray(edge.connectivity)
      ? edge.connectivity.map(normalizeConnectivityRule)
      : [];
    assert(connectivity.length > 0, `Connection edge ${fromCluster}->${toCluster} needs at least one rule`);
    return {
      fromCluster,
      toCluster,
      connectivity,
      metadata: edge.metadata || undefined,
    };
  }

  function normalizeTemplate(template) {
    assert(template && typeof template === 'object', 'Template must be an object');
    const regionName = String(template.regionName || template.name || 'Custom Template').trim();
    const regionId = String(template.id || template.regionId || regionName.replace(/\s+/g, '_')).trim();
    const clusters = Array.isArray(template.clusters) ? template.clusters.map(normalizeCluster) : [];
    assert(clusters.length > 0, 'Template must contain at least one cluster definition');

    const connections = Array.isArray(template.connections)
      ? template.connections.map(normalizeConnectionEdge)
      : [];

    return {
      id: regionId,
      regionName,
      clusters,
      connections,
      metadata: template.metadata || undefined,
      notes: template.notes || undefined,
    };
  }

  function serializeTemplate(template, spacing = 2) {
    const normalized = normalizeTemplate(template);
    return JSON.stringify(normalized, null, spacing);
  }

  function deserializeTemplate(jsonOrObject) {
    const template =
      typeof jsonOrObject === 'string'
        ? JSON.parse(jsonOrObject)
        : Object.assign({}, jsonOrObject);
    return normalizeTemplate(template);
  }

  async function loadTemplateFromUrl(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load template config from ${url}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return deserializeTemplate(data);
  }

  window.SNN_CONFIG_IO = {
    normalizeTemplate,
    serializeTemplate,
    deserializeTemplate,
    loadTemplateFromUrl,
  };
})();
