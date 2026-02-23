export type RecordState<T> = Record<string, T>;

/** Recursively builds a nested Record type from a keys tuple.
 * `NestedRecord<['groupId', 'itemId'], T>` = `Record<string, Record<string, T>>` */
export type RecursiveRecordState<Keys extends readonly string[], T> = Keys extends readonly [
    string,
    ...infer Rest extends string[],
]
    ? Rest extends []
        ? Record<string, T>
        : Record<string, RecursiveRecordState<Rest, T>>
    : never;

/** Maps a keys tuple to a typed path object.
 * `PathOf<['groupId', 'itemId']>` = `{ groupId: string; itemId: string }` */
export type PathOf<Keys extends readonly string[]> = { [K in Keys[number]]: string };
