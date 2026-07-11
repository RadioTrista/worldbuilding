/**
 * Combat tracker hooks: auto-remove combatants on token delete,
 * and clear defeated/dead status when combat ends or tokens are placed outside combat.
 */

/** @returns {string} */
export function getDefeatedStatusId() {
  return CONFIG.Combat?.defeatedStatusId ?? "dead";
}

/**
 * @param {string} sceneId
 * @param {string} tokenId
 * @returns {Combatant[]}
 */
export function findCombatantsForToken(sceneId, tokenId) {
  const results = [];
  if (!game.combats?.size) return results;
  for (const combat of game.combats) {
    for (const combatant of combat.combatants) {
      if (combatant.tokenId === tokenId && combatant.sceneId === sceneId) {
        results.push(combatant);
      }
    }
  }
  return results;
}

/**
 * @param {string} sceneId
 * @param {string} tokenId
 */
export async function removeCombatantsForToken(sceneId, tokenId) {
  if (!game.user.isGM) return;
  const combatants = findCombatantsForToken(sceneId, tokenId);
  for (const combatant of combatants) {
    try {
      await combatant.delete();
    } catch (e) {
      console.warn("Worldbuilding removeCombatantsForToken:", e);
    }
  }
}

/**
 * @param {TokenDocument|null} tokenDoc
 * @param {Actor|null} actorDoc
 */
export async function clearDefeatedStatus(tokenDoc, actorDoc) {
  const statusId = getDefeatedStatusId();

  if (tokenDoc) {
    try {
      const tokenObject = tokenDoc.object ?? canvas.tokens?.get(tokenDoc.id);
      if (tokenObject?.toggleEffect) {
        await tokenObject.toggleEffect(statusId, { active: false });
      } else if (typeof tokenDoc.toggleStatusEffect === "function") {
        await tokenDoc.toggleStatusEffect(statusId, { active: false });
      }
    } catch (e) {
      console.warn("Worldbuilding clearDefeatedStatus (token):", e);
    }
  }

  if (actorDoc?.effects) {
    const effects = actorDoc.effects.filter(
      e => e.getFlag("core", "statusId") === statusId
    );
    for (const effect of effects) {
      try {
        await effect.delete();
      } catch (e) {
        console.warn("Worldbuilding clearDefeatedStatus (actor effect):", e);
      }
    }
  }
}

/**
 * @param {Combat} combat
 */
export async function clearCombatDefeatedEffects(combat) {
  if (!combat?.combatants?.size) return;
  for (const combatant of combat.combatants) {
    await clearDefeatedStatus(combatant.token, combatant.actor);
  }
}

/**
 * @param {TokenDocument} tokenDocument
 * @returns {boolean}
 */
export function isTokenInActiveCombat(tokenDocument) {
  const sceneId = tokenDocument.parent?.id;
  const tokenId = tokenDocument.id;
  if (!sceneId || !tokenId) return false;

  for (const combat of game.combats) {
    if (!combat.active) continue;
    for (const combatant of combat.combatants) {
      if (combatant.tokenId === tokenId && combatant.sceneId === sceneId) return true;
    }
  }
  return false;
}

/**
 * Register all combat-related hooks (call once at module load).
 */
export function registerCombatHooks() {
  Hooks.on("deleteToken", (tokenDocument, _options, _userId) => {
    const sceneId = tokenDocument.parent?.id;
    if (!sceneId) return;
    removeCombatantsForToken(sceneId, tokenDocument.id);
  });

  Hooks.on(
    "deleteCombat",
    combat => {
      clearCombatDefeatedEffects(combat);
    },
    100
  );

  Hooks.on(
    "updateCombat",
    (combat, changes) => {
      if ("active" in changes && changes.active === false) {
        clearCombatDefeatedEffects(combat);
      }
    },
    100
  );

  Hooks.on(
    "createToken",
    tokenDocument => {
      if (isTokenInActiveCombat(tokenDocument)) return;
      clearDefeatedStatus(tokenDocument, tokenDocument.actor);
    },
    100
  );
}
