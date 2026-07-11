/**
 * Extend the base TokenDocument to support resource type attributes.
 * @extends {TokenDocument}
 */
export class SimpleTokenDocument extends TokenDocument {

  /** @inheritdoc */
  getBarAttribute(barName, {alternative}={}) {
    const data = super.getBarAttribute(barName, {alternative});
    const attr = alternative || this[barName]?.attribute;
    if ( !data || !attr || !this.actor ) return data;
    const current = foundry.utils.getProperty(this.actor.system, attr);
    if ( current?.dtype === "Resource" ) data.min = parseInt(current.min || 0);
    data.editable = true;
    return data;
  }

  /* -------------------------------------------- */

  static getTrackedAttributes(data, _path=[]) {
    if (data || _path.length) return super.getTrackedAttributes(data, _path);
    data = {};
  
    // Prefer the modern dataModels API in V14, keep fallbacks for older cores.
    const models = CONFIG.Actor?.dataModels ?? CONFIG.Actor?.systemDataModels ?? game.model?.Actor ?? {};
    for (const model of Object.values(models)) {
      foundry.utils.mergeObject(data, model);
    }
  
    // Merge des templates d'acteurs
    for (const actor of game.actors) {
      if (actor.isTemplate) {
        const a = actor.toObject();
        foundry.utils.mergeObject(data, a.system ?? a);
      }
    }
  
    return super.getTrackedAttributes(data);
  }
}  
  

/* -------------------------------------------- */


/**
 * Extend the base Token class to implement additional system-specific logic.
 * @extends {Token}
 */
export class SimpleToken extends Token {
  _drawBar(number, bar, data) {
    if ( "min" in data ) {
      // Copy the data to avoid mutating what the caller gave us.
      data = {...data};
      // Shift the value and max by the min to draw the bar percentage accurately for a non-zero min
      data.value -= data.min;
      data.max -= data.min;
    }
    return super._drawBar(number, bar, data);
  }
}
