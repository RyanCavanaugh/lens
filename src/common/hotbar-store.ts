import { action, comparer, makeObservable, observable } from "mobx";
import { BaseStore } from "./base-store";
import migrations from "../migrations/hotbar-store";
import * as uuid from "uuid";
import { toJS } from "./utils";
import { CatalogEntityItem } from "../renderer/components/+catalog/catalog-entity.store";
import isNull from "lodash/isNull";

export interface HotbarItem {
  entity: {
    uid: string;
  };
  params?: {
    [key: string]: string;
  }
}

export interface Hotbar {
  id: string;
  name: string;
  items: HotbarItem[];
}

export interface HotbarCreateOptions {
  id?: string;
  name: string;
  items?: HotbarItem[];
}

export interface HotbarStoreModel {
  hotbars: Hotbar[];
  activeHotbarId: string;
}

export const defaultHotbarCells = 12; // Number is choosen to easy hit any item with keyboard

export class HotbarStore extends BaseStore<HotbarStoreModel> {
  @observable hotbars: Hotbar[] = [];
  @observable private _activeHotbarId: string;

  constructor() {
    super({
      configName: "lens-hotbar-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      syncOptions: {
        equals: comparer.structural,
      },
      migrations,
    });
    makeObservable(this);
  }

  get activeHotbarId() {
    return this._activeHotbarId;
  }

  set activeHotbarId(id: string) {
    if (this.getById(id)) {
      this._activeHotbarId = id;
    }
  }

  get activeHotbarIndex() {
    return this.hotbars.findIndex((hotbar) => hotbar.id === this.activeHotbarId);
  }

  get initialItems() {
    return [...Array.from(Array(defaultHotbarCells).fill(null))];
  }

  @action
  protected async fromStore(data: Partial<HotbarStoreModel> = {}) {
    if (data.hotbars?.length === 0) {
      this.hotbars = [{
        id: uuid.v4(),
        name: "Default",
        items: this.initialItems,
      }];
    } else {
      this.hotbars = data.hotbars;
    }

    if (data.activeHotbarId) {
      if (this.getById(data.activeHotbarId)) {
        this.activeHotbarId = data.activeHotbarId;
      }
    }

    if (!this.activeHotbarId) {
      this.activeHotbarId = this.hotbars[0].id;
    }
  }

  getActive() {
    return this.getById(this.activeHotbarId);
  }

  getByName(name: string) {
    return this.hotbars.find((hotbar) => hotbar.name === name);
  }

  getById(id: string) {
    return this.hotbars.find((hotbar) => hotbar.id === id);
  }

  add(data: HotbarCreateOptions) {
    const {
      id = uuid.v4(),
      items = this.initialItems,
      name,
    } = data;

    const hotbar = { id, name, items };

    this.hotbars.push(hotbar as Hotbar);

    return hotbar as Hotbar;
  }

  @action
  remove(hotbar: Hotbar) {
    this.hotbars = this.hotbars.filter((h) => h !== hotbar);

    if (this.activeHotbarId === hotbar.id) {
      this.activeHotbarId = this.hotbars[0].id;
    }
  }

  addToHotbar(item: CatalogEntityItem, cellIndex = -1) {
    const hotbar = this.getActive();
    const newItem = { entity: { uid: item.id }};

    if (hotbar.items.find(i => i?.entity.uid === item.id)) {
      return;
    }

    if (cellIndex == -1) {
      // Add item to empty cell
      const emptyCellIndex = hotbar.items.findIndex(isNull);

      if (emptyCellIndex != -1) {
        hotbar.items[emptyCellIndex] = newItem;
      } else {
        // Add new item to the end of list
        hotbar.items.push(newItem);
      }
    } else {
      hotbar.items[cellIndex] = newItem;
    }
  }

  removeFromHotbar(uid: string) {
    const hotbar = this.getActive();
    const index = hotbar.items.findIndex((i) => i?.entity.uid === uid);

    if (index == -1) {
      return;
    }

    hotbar.items[index] = null;
  }

  findClosestEmptyIndex(from: number, direction = 1) {
    let index = from;

    while(this.getActive().items[index] != null) {
      index += direction;
    }

    return index;
  }

  restackItems(from: number, to: number): void {
    const { items } = this.getActive();
    const source = items[from];
    const moveDown = from < to;

    if (from < 0 || to < 0 || from >= items.length || to >= items.length || isNaN(from) || isNaN(to)) {
      throw new Error("Invalid 'from' or 'to' arguments");
    }

    if (from == to) {
      return;
    }

    items.splice(from, 1, null);

    if (items[to] == null) {
      items.splice(to, 1, source);
    } else {
      // Move cells up or down to closes empty cell
      items.splice(this.findClosestEmptyIndex(to, moveDown ? -1 : 1), 1);
      items.splice(to, 0, source);
    }
  }

  switchToPrevious() {
    const hotbarStore = HotbarStore.getInstance();
    let index = hotbarStore.activeHotbarIndex - 1;

    if (index < 0) {
      index = hotbarStore.hotbars.length - 1;
    }

    hotbarStore.activeHotbarId = hotbarStore.hotbars[index].id;
  }

  switchToNext() {
    const hotbarStore = HotbarStore.getInstance();
    let index = hotbarStore.activeHotbarIndex + 1;

    if (index >= hotbarStore.hotbars.length) {
      index = 0;
    }

    hotbarStore.activeHotbarId = hotbarStore.hotbars[index].id;
  }

  toJSON(): HotbarStoreModel {
    return toJS({
      hotbars: this.hotbars,
      activeHotbarId: this.activeHotbarId
    });
  }
}