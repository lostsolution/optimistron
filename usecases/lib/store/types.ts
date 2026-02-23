export type Epic = {
    createdAt: number;
    done: boolean;
    id: string;
    revision: number;
    value: string;
};

export type Profile = {
    displayName: string;
    avatarUrl: string;
    revision: number;
};

export type ProjectTodo = {
    id: string;
    projectId: string;
    value: string;
    done: boolean;
    revision: number;
    createdAt: number;
};

export type ActivityEntry = {
    id: string;
    message: string;
    category: 'system' | 'user' | 'error';
    timestamp: number;
    revision: number;
};
