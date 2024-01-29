export type Todo = {
    createdAt: number;
    done: boolean;
    id: string;
    revision: number;
    value: string;
};

export type TodoState = Record<string, Todo>;
