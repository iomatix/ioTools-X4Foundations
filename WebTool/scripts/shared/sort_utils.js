"use strict";

import SharedEnums from "./shared_enums.js";

/**
 * Utilities for sorting items
 *
 * @type {{ sortItemsAlpha: (a: any, b: any) => number; sortItemsWithParent: (items: {}, parentName?: string) => {}; sortItemsAlphabetically: (items: {}) => {}; sortItemsByDateNewest: (items: {}) => {}; ... 4 more ...; sortItems: (items: {}, sortMode: string) => {}; }}
 */
export const SortUtils = {
  /**
   * Sort items alphabetically, with special characters first.
   * @param {object} a - First item to compare.
   * @param {object} b - Second item to compare.
   * @returns {number} A negative value if "a" comes first, a positive value if "b" comes first, or 0 if both are equal.
   */
  sortItemsAlpha: async (a, b) => {
    const aFirstChar = a.name[0];
    const bFirstChar = b.name[0];

    const isASpecial = /^[^a-zA-Z0-9]/.test(aFirstChar);
    const isBSpecial = /^[^a-zA-Z0-9]/.test(bFirstChar);

    if (isASpecial && !isBSpecial) return -1;
    if (!isASpecial && isBSpecial) return 1;

    return await a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
  },

  /**
   * Sorts items so that the parent directory ("../") is always on top, followed by alphabetical sorting of the remaining items.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - name {string}: The name of the item.
   *   - type {string}: The type of item (either "directory" or "file").
   *   - path {string}: The path of the item.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsWithParent: async (items, parentName = "../") => {
    let parentDir = items.filter((item) => item.name === parentName);
    let otherItems = items.filter((item) => item.name !== parentName);

    otherItems.sort(SortUtils.sortItemsAlpha);
    return [...parentDir, ...otherItems];
  },

  /**
   * Sorts items alphabetically, separating folders and files, and then sorting each group.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - name {string}: The name of the item.
   *   - type {string}: The type of item (either "directory" or "file").
   *   - path {string}: The path of the item.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsAlphabetically: async (items) => {
    let folders = items.filter((item) => item.type === "directory");
    let files = items.filter((item) => item.type !== "directory");

    folders.sort(SortUtils.sortItemsAlpha);
    files.sort(SortUtils.sortItemsAlpha);

    return [...folders, ...files];
  },

  /**
   * Sorts items by date (newest first). If a date is missing for an item, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - date {string}: A date string in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ).
   * @returns {object[]} The sorted array of items.
   */
  sortItemsByDateNewest: async (items) => {
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Sorts items by date (oldest first). If a date is missing for an item, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - date {string}: A date string in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ).
   * @returns {object[]} The sorted array of items.
   */
  sortItemsByDateOldest: async (items) => {
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /**
   * Sorts items by type, with folders first, then alphabetically.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - type {string}: The type of item (either "directory" or "file").
   * @returns {object[]} The sorted array of items.
   */
  sortItemsByType: async (items) => {
    return items.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return SortUtils.sortItemsAlpha(a, b); // Folders are sorted first, then alphabetically
    });
  },

  /**
   * Sorts items by size (largest first). If an item's size is missing, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - size {number}: The size of the item in bytes.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsBySizeLargest: async (items) => {
    return items.sort((a, b) => b.size - a.size);
  },

  /**
   * Sorts items by size (smallest first). If an item's size is missing, it will be sorted to the end.
   * @param {object[]} items - An array of item objects with the following properties:
   *   - size {number}: The size of the item in bytes.
   * @returns {object[]} The sorted array of items.
   */
  sortItemsBySizeSmallest: async (items) => {
    return items.sort((a, b) => a.size - b.size);
  },

  /**
   * Sorts an array of items according to the given sort mode.
   *
   * @param {object[]} items - An array of item objects with the following properties:
   *   - name {string}: The name of the item.
   *   - type {string}: The type of item (either "directory" or "file").
   *   - path {string}: The path of the item.
   *   - date {string}: A date string in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ).
   *   - size {number}: The size of the item in bytes.
   * @param {string} sortMode - The sort mode to use, one of the following:
   *   - `SharedEnums.SORT_MODE.ALPHA`: Sort alphabetically with special characters first.
   *   - `SharedEnums.SORT_MODE.ALPHA_WITH_PARENT`: Sort alphabetically with special characters first and `../` on top.
   *   - `SharedEnums.SORT_MODE.DATE_NEWEST`: Sort by date (newest first).
   *   - `SharedEnums.SORT_MODE.DATE_OLDEST`: Sort by date (oldest first).
   *   - `SharedEnums.SORT_MODE.TYPE`: Sort by type, with folders first, then alphabetically.
   *   - `SharedEnums.SORT_MODE.SIZE_LARGEST`: Sort by size (largest first).
   *   - `SharedEnums.SORT_MODE.SIZE_SMALLEST`: Sort by size (smallest first).
   * @returns {object[]} The sorted array of items.
   */
  sortItems: async (items, sortMode) => {
    switch (sortMode) {
      case SharedEnums.SORT_MODE.ALPHA:
        return SortUtils.sortItemsAlphabetically(items);
      case SharedEnums.SORT_MODE.ALPHA_WITH_PARENT:
        return SortUtils.sortItemsWithParent(items);
      case SharedEnums.SORT_MODE.DATE_NEWEST:
        return SortUtils.sortItemsByDateNewest(items);
      case SharedEnums.SORT_MODE.DATE_OLDEST:
        return SortUtils.sortItemsByDateOldest(items);
      case SharedEnums.SORT_MODE.TYPE:
        return SortUtils.sortItemsByType(items);
      case SharedEnums.SORT_MODE.SIZE_LARGEST:
        return SortUtils.sortItemsBySizeLargest(items);
      case SharedEnums.SORT_MODE.SIZE_SMALLEST:
        return SortUtils.sortItemsBySizeSmallest(items);
      default:
        return items;
    }
  },
};
export default SortUtils;
