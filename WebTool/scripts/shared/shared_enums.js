/**
 * A collection of useful enums, currently only for various sort options.
 */
export const SharedEnums = {
  SORT_MODE: {
    DEFAULT: "default", // No sorting
    ALPHA: "alpha", // Alphabetical sorting
    ALPHA_WITH_PARENT: "alpha_with_parent", // Alphabetical with `../` on top
    DATE_NEWEST: "date_newest", // Sort by date (newest first)
    DATE_OLDEST: "date_oldest", // Sort by date (oldest first)
    TYPE: "type", // Sort by item type (folders first)
    SIZE_LARGEST: "size_largest", // Sort by size (largest first)
    SIZE_SMALLEST: "size_smallest", // Sort by size (smallest first)
  },
};

export default SharedEnums;
