/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import "../../common/catalog-entities";

import { action, observable } from "mobx";

import {
  CatalogCategoryRegistry,
  CatalogCategorySpec,
  CatalogEntity,
  CatalogEntityData,
  CatalogEntityKindData,
} from "../../common/catalog";
import { broadcastMessage, ipcRendererOn } from "../../common/ipc";
import { Singleton } from "../utils";

export class CatalogEntityRegistry extends Singleton {
  @observable protected _items: CatalogEntity[] = observable.array([], { deep: true });
  @observable protected _activeEntity: CatalogEntity;

  init() {
    ipcRendererOn("catalog:items", (ev, items: (CatalogEntityData & CatalogEntityKindData)[]) => {
      this.updateItems(items);
    });
    broadcastMessage("catalog:broadcast");
  }

  @action updateItems(items: (CatalogEntityData & CatalogEntityKindData)[]) {
    const registry = CatalogCategoryRegistry.getInstance();

    this._items = items.map(data => registry.getEntityForData(data));
  }

  set activeEntity(entity: CatalogEntity) {
    this._activeEntity = entity;
  }

  get activeEntity() {
    console.log(this._activeEntity);

    return this._activeEntity;
  }

  get items() {
    return this._items;
  }

  getById(id: string) {
    return this._items.find((entity) => entity.metadata.uid === id);
  }

  getItemsForApiKind<T extends CatalogEntity>(apiVersion: string, kind: string): T[] {
    const items = this._items.filter((item) => item.apiVersion === apiVersion && item.kind === kind);

    return items as T[];
  }

  getItemsForCategory<T extends CatalogEntity>(category: CatalogCategorySpec): T[] {
    const supportedVersions = category.spec.versions.map((v) => `${category.spec.group}/${v.version}`);
    const items = this._items.filter((item) => supportedVersions.includes(item.apiVersion) && item.kind === category.spec.names.kind);

    return items as T[];
  }
}
