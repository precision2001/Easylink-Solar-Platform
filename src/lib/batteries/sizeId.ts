/** A battery picked by size on the Design Platform: "size:<range>:<phase>:<stacks>x<modules>". */
export const SIZE_PREFIX = "size:";
export const isSizeId = (id: string | undefined | null): id is string => typeof id === "string" && id.startsWith(SIZE_PREFIX);
