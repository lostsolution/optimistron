/** Extracts keys of `T` whose values are `string` */
export type StringKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T] &
    string;

/** Maps a keys tuple to a tuple of string IDs — one per nesting level */
export type PathMap<Keys extends readonly string[]> = { [K in keyof Keys]: string } & string[];

export type MaybeNull<T> = T | null;
export type Maybe<T> = T | undefined;
