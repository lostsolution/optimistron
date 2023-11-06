export type Todo = { id: string; value: string; revision: number; done: boolean };
export type TodoState = Record<string, Todo>;
