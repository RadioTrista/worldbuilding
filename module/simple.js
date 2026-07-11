/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 */

// Import Modules
import { SimpleActor } from "./actor.js";
import { SimpleItem } from "./item.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleActorSheet } from "./actor-sheet.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createWorldbuildingMacro } from "./macro.js";
import { SimpleToken, SimpleTokenDocument } from "./token.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
  console.log(`Initializing Simple Worldbuilding System`);

  /**
   * Set an initiative formula for the system. This will be updated later.
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  game.worldbuilding = {
    SimpleActor,
    createWorldbuildingMacro
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SimpleActor;
  CONFIG.Item.documentClass = SimpleItem;
  CONFIG.Token.documentClass = SimpleTokenDocument;
  CONFIG.Token.objectClass = SimpleToken;

  // Register sheet application classes (core defaults to Application V2 sheets in V13+)
  const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
  Actors.unregisterSheet("core", ActorSheetV2);
  Actors.registerSheet("worldbuilding", SimpleActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheetV2);
  Items.registerSheet("worldbuilding", SimpleItemSheet, { makeDefault: true });

  // Register system settings
  game.settings.register("worldbuilding", "macroShorthand", {
    name: "SETTINGS.SimpleMacroShorthandN",
    hint: "SETTINGS.SimpleMacroShorthandL",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  // Register initiative setting.
  game.settings.register("worldbuilding", "initFormula", {
    name: "SETTINGS.SimpleInitFormulaN",
    hint: "SETTINGS.SimpleInitFormulaL",
    scope: "world",
    type: String,
    default: "1d20",
    config: true,
    onChange: formula => _simpleUpdateInit(formula, true)
  });

  // Retrieve and assign the initiative formula setting.
  const initFormula = game.settings.get("worldbuilding", "initFormula");
  _simpleUpdateInit(initFormula);

  /**
   * Update the initiative formula.
   * @param {string} formula - Dice formula to evaluate.
   * @param {boolean} notify - Whether or not to post nofications.
   */
  function _simpleUpdateInit(formula, notify = false) {
    const isValid = Roll.validate(formula);
    if ( !isValid ) {
      if ( notify ) ui.notifications.error(`${game.i18n.localize("SIMPLE.NotifyInitFormulaInvalid")}: ${formula}`);
      return;
    }
    CONFIG.Combat.initiative.formula = formula;
  }

  /**
   * Slugify a string.
   */
  const handlebars = foundry.applications?.handlebars?.Handlebars ?? globalThis.Handlebars;
  handlebars.registerHelper('slugify', function(value) {
    return value.slugify({strict: true});
  });

  // Preload template partials
  await preloadHandlebarsTemplates();
});

/**
 * Macrobar hook.
 */
Hooks.on("hotbarDrop", (bar, data, slot) => createWorldbuildingMacro(data, slot));

/**
 * Resolve document id from a sidebar context-menu target element.
 * @param {HTMLElement} li
 * @returns {string|undefined}
 */
function _getContextDocumentId(li) {
  return li?.dataset?.documentId ?? li?.dataset?.entryId;
}

/**
 * Adds the actor template context menu.
 */
Hooks.on("getActorContextOptions", (_application, options) => {

  // Define an actor as a template.
  options.push({
    label: game.i18n.localize("SIMPLE.DefineTemplate"),
    icon: '<i class="fas fa-stamp"></i>',
    visible: li => {
      const actor = game.actors.get(_getContextDocumentId(li));
      return !!actor && !actor.isTemplate;
    },
    onClick: li => {
      const actor = game.actors.get(_getContextDocumentId(li));
      return actor?.setFlag("worldbuilding", "isTemplate", true);
    }
  });

  // Undefine an actor as a template.
  options.push({
    label: game.i18n.localize("SIMPLE.UnsetTemplate"),
    icon: '<i class="fas fa-times"></i>',
    visible: li => {
      const actor = game.actors.get(_getContextDocumentId(li));
      return !!actor?.isTemplate;
    },
    onClick: li => {
      const actor = game.actors.get(_getContextDocumentId(li));
      return actor?.setFlag("worldbuilding", "isTemplate", false);
    }
  });
});

/**
 * Adds the item template context menu.
 */
Hooks.on("getItemContextOptions", (_application, options) => {

  // Define an item as a template.
  options.push({
    label: game.i18n.localize("SIMPLE.DefineTemplate"),
    icon: '<i class="fas fa-stamp"></i>',
    visible: li => {
      const item = game.items.get(_getContextDocumentId(li));
      return !!item && !item.isTemplate;
    },
    onClick: li => {
      const item = game.items.get(_getContextDocumentId(li));
      return item?.setFlag("worldbuilding", "isTemplate", true);
    }
  });

  // Undefine an item as a template.
  options.push({
    label: game.i18n.localize("SIMPLE.UnsetTemplate"),
    icon: '<i class="fas fa-times"></i>',
    visible: li => {
      const item = game.items.get(_getContextDocumentId(li));
      return !!item?.isTemplate;
    },
    onClick: li => {
      const item = game.items.get(_getContextDocumentId(li));
      return item?.setFlag("worldbuilding", "isTemplate", false);
    }
  });
});
