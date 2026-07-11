/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    // Attribute list partial.
    "systems/worldbuilding/templates/parts/sheet-attributes.html",
    "systems/worldbuilding/templates/parts/sheet-groups.html"
  ];

  // Load template parts using the V13+/V14 namespace with global fallback.
  const load = foundry.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  return load(templatePaths);
};