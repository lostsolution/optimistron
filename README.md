# 🧙‍♂️ Optimistron

Optimistron is a _(very)_ opinionated library designed to simplify optimistic state management in _(certain)_ Redux applications. It enables you to _(almost seamlessly)_ handle optimistic actions within your reducers without the need for creating separate copies of your state. _Spoiler alert: it may not fit your needs.._

## 🧐 How does it work ?

Optimistron introduces the concept of _"transitions"_ to manage optimistic actions (essentially transitions are just actions with extra metadata). These transitions are tracked alongside your reducer's state. Until these transitions are _"committed"_, they are applied to your reducer only through selectors. This eliminates the need to keep a separate copy of the state as a checkpoint, which is a common practice in other optimistic state management libraries.

Transitions are comprised of five operations:

-   `STAGE`: The action is added to the transition list.
-   `AMEND`: The action is amended from the transition list.
-   `STASH`: The action is removed from the transition list.
-   `FAIL`: The action is marked as having encountered some failure or error.
-   `COMMIT`: The action is removed from the transition list and applied to the wrapped reducer.

**Optimistic state is inferred through selectors**, where transitions are played on the current state, much like a _git rebase_. This means that actions are constantly _"rebased"_ on top of the latest state, which can lead to conflicts and noops.

Depending on how you structure your state, applying an action on top of a particular state may result in a no-op or an error (ie: editing or deleting a non-existing item). To mitigate this, state changes are controlled by a custom **state handler** that restrains these updates to the most granular operations possible _(more on this later)_. This requires the implementation of a "merging" function on the handler, which is used to detect potential issues. As a result, the library ensures that your optimistic transitions are _nearly_ conflict-free. Transitions that result in errors or no-ops are simply **discarded**. That being said, in certain cases, you may also want to let the user resolve conflicts.

## ❓ When to use it

-   When you are using sagas, thunks, or any kind of async redux middleware in which you compose actions around async operations
-   When you need to optimistically show the result of an asynchronous operation in your UI.
-   When this async operation may fail and you would like to give your user the ability to retry.
-   When you want to support some kind of _offline mode_ by leveraging optimistic failures
-   When your state updates can be modelled around a simple _CRUD interface_.

## 🪖 Rules of transitions

-   Transitions should have unique identifiers that you can use to map back to your entities. (In most cases, just use your entity's identifier as a the transition id).
-   One entity should never have multiple transitions at the same time. This is already enforced in the internal `processTransition` function but depending on how you model your transition identifiers, we may not be able to enforce this rule. This essentially means that before starting a new transition on one of your entities, ensure there are no ongoing ones.
-   Keep transition effects on state as granular as possible.

## 🏗️ Getting Started

> to see full examples, checkout the `usecases/` folder of the repository. It includes usages with common async redux middlewares.

### 1️⃣ Define Transitions

> ❗️ Each transition has a _unique identifier_ : for most use cases, you should use your entity's identifier as the transition id. This effectively allows coupling a transition to a specific item in order to derive optimistic state.

To get started with Optimistron, you need to define transitions for your actions. Make sure to namespace them correctly :

```typescript
const createTodo = createTransitions('todos::add')((todo: Todo) => ({ payload: { todo } }));
const editTodo = createTransitions('todos::edit')((id: string, update: Todo) => ({ payload: { id, update } }));

const deleteTodo = createTransitions(
    'todos::delete',
    TransitionDedupeMode.TRAILING,
)((id: string) => ({ payload: { id } }));
```

This will essentially give you a set of transitions for you to dispatch.

```typescript
const transitionId = 'some-entity-id';
createTodo.stage(transitionId, todo);
createTodo.amend(transitionId);
createTodo.commit(transitionId);
createTodo.stash(transitionId);
createTodo.fail(transitionId);
```

> ❗️ If you need to customize the underlying transition action preparators, you can pass a configuration object to `createTransitions`.

### 2️⃣ Create an Optimistic Reducer

Next, create an optimistic reducer :

-   Define which transition namespace this reducer will react to (this does not mean your reducer cannot react to other types of actions)
-   Use one of the provided state handler factories (or create your own) to wrap your state
-   Leverage the transition's matching function to update your state

```typescript
export const todosReducer = optimistron(
    'todos',
    initial,
    indexedStateFactory<Todo>({ itemIdKey: 'id', compare, eq }) // see section about state handlers
    ({ getState, create, update, remove }, action) => {
        if (createTodo.match(action)) return create(action.payload.todo);
        if (editTodo.match(action)) return update(action.payload.id, action.payload.update);
        if (deleteTodo.match(action)) return remove(action.payload.id);
        return getState();
    },
);
```

### 3️⃣ Dispatch Optimistic Transitions

Now you can dispatch optimistic transitions like this:

```typescript
/* here we are creating an optimisticId that will be both
 * used as the transitionId and the todo's temporary id */
const optimisticId = 'e29b-41d4-a716';

dispatch(
    createTodo.stage(optimisticId, {
        id: optimisticId,
        value: 'Do groceries',
        done: false,
        revision: 0,
    }),
);
```

Now, depending on how you orchestrate your async operations (thunks, sagas etc..), you can resolve the staged transition. Essentially, state will only be updated once a transition is committed.

```typescript
/* resolve the transitionId or just read
 * `action.payload.todo.id` in this case */
const transitionId = getTransitionMeta(action).id;

try {
    const result = await createTodoAPICall(action.payload.todo);
    dispatch(createTodo.commit(transitionId, result));
} catch (_) {
    dispatch(createTodo.fail(transitionId));
    /* `dispatch(createTodo.stash(transitionId));` */
}
```

### 4️⃣ Access Optimistic State

Access optimistic state using selectors :

```typescript
export const selectOptimisticTodos = createSelector(
    (state: State) => state.todos,
    selectOptimistic((todos) => Object.values(todos.state)),
);
```

Available selectors :

-   `selectOptimistic` : given a selector function acting on an _optimistron_ state, will return its result over the state as if transitions were committed
-   `selectIsOptimistic` : given a _transitionId_, checks wether it is in our state's transition list. By coupling the _transitionId_ to your _entity's identifier_, you can essentially derive optimistic state at the entity level.
-   `selectIsFailed` : similar to _selectIsOptimistic_ but checks if the transition has failed
-   `selectIsConflicting` : similar to _selectIsOptimistic_ but checks if the transition is conflicting
-   `selectFailedAction` : given a _transitionId_, spits back the original failed action if any
