import { EntitySheetHelper } from "./helper.js";
import { ATTRIBUTE_TYPES } from "./constants.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Feuille d'objet Application V2 (Foundry V13+ / V14).
 * @extends {ItemSheetV2}
 */
export class SimpleItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["worldbuilding", "sheet", "item"],
    position: { width: 520, height: 480 },
    actions: {
      editImage: SimpleItemSheet.#onEditImage,
      attrControl: SimpleItemSheet.#onAttrControl,
      groupControl: SimpleItemSheet.#onGroupControl,
      attrRoll: SimpleItemSheet.#onAttrRoll
    },
    form: {
      handler: SimpleItemSheet.#onSubmitForm,
      submitOnChange: true,
      closeOnSubmit: false
    },
    window: {
      resizable: true,
      contentClasses: ["standard-form"]
    }
  };

  /** @inheritDoc */
  static PARTS = {
    sheet: {
      template: "systems/worldbuilding/templates/item-sheet.html"
    }
  };

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    const sheetData = {
      system: item.system,
      items: null
    };
    EntitySheetHelper.getAttributeData(sheetData);
    context.data = item.toObject(false);
    context.systemData = sheetData.system;
    context.dtypes = ATTRIBUTE_TYPES;
    const textEditor = foundry.applications?.ux?.TextEditor ?? globalThis.TextEditor;
    context.descriptionHTML = await textEditor.enrichHTML(context.systemData.description, {
      secrets: item.isOwner,
      async: true
    });
    context.cssClass = this.constructor.DEFAULT_OPTIONS.classes.join(" ");
    return context;
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const initialTab = this._activePrimaryTab ?? "description";
    const tabs = new foundry.applications.ux.Tabs({
      navSelector: ".sheet-tabs",
      contentSelector: ".sheet-body",
      group: "primary",
      initial: initialTab
    });
    tabs.bind(this.element);
    this.element.removeEventListener("click", this.#onTabClick);
    this.element.addEventListener("click", this.#onTabClick);
    const activeTab = this.element.querySelector(".sheet-tabs .item.active");
    if ( activeTab?.dataset?.tab ) this._activePrimaryTab = activeTab.dataset.tab;
    this.element.removeEventListener("dragstart", this.#onAttributeDragStart);
    this.element.addEventListener("dragstart", this.#onAttributeDragStart);
  }

  /** @param {PointerEvent} event */
  #onTabClick = (event) => {
    const tab = event.target.closest(".sheet-tabs .item");
    if (!tab?.dataset?.tab) return;
    this._activePrimaryTab = tab.dataset.tab;
    if ( this.tabGroups ) this.tabGroups.primary = tab.dataset.tab;
  };

  /** @param {DragEvent} event */
  #onAttributeDragStart = (event) => {
    const a = event.target.closest("a.attribute-roll");
    if (!a?.draggable) return;
    event.dataTransfer.setData("text/plain", JSON.stringify({ ...a.dataset }));
  };

  static async #onEditImage(event, target) {
    event.preventDefault();
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);
    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current,
      callback: (path) => this.document.update({ [field]: path })
    });
    await fp.render(true);
  }

  static async #onAttrControl(event, target) {
    event.preventDefault();
    const action = target.dataset.attrOp;
    const synthetic = { preventDefault() {}, currentTarget: target };
    if (action === "create") {
      return EntitySheetHelper.createAttribute(synthetic, this);
    }
    if (action === "delete") {
      return EntitySheetHelper.deleteAttribute(synthetic, this);
    }
    return undefined;
  }

  static async #onGroupControl(event, target) {
    event.preventDefault();
    const action = target.dataset.groupOp;
    const synthetic = { preventDefault() {}, currentTarget: target };
    if (action === "create-group") {
      return EntitySheetHelper.createAttributeGroup(synthetic, this);
    }
    if (action === "delete-group") {
      return EntitySheetHelper.deleteAttributeGroup(synthetic, this);
    }
    return undefined;
  }

  static #onAttrRoll(event, target) {
    event.preventDefault();
    const synthetic = { preventDefault() {}, currentTarget: target };
    return EntitySheetHelper.onAttributeRoll.call(this, synthetic);
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault();
    if (!this.isEditable) return;
    const fd = new FormDataExtended(form);
    const flat = foundry.utils.flattenObject(fd.object);
    const updateData = EntitySheetHelper.updateGroups(
      EntitySheetHelper.updateAttributes(flat, this.document),
      this.document
    );
    await this.document.update(updateData, { render: false });
  }
}
