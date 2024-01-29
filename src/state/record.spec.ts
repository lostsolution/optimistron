import { OptimisticMergeResult } from '~transitions';
import { recordHandlerFactory } from './record';

type TestItem = { id: string; version: number; value: string };

describe('RecordState', () => {
    const compare = (a: TestItem) => (b: TestItem) => {
        if (a.version > b.version) return 1;
        if (a.version === b.version) return 0;
        return -1;
    };

    const eq = (a: TestItem) => (b: TestItem) => a.id === b.id && a.value === b.value;

    const testHandler = recordHandlerFactory<TestItem>({ itemIdKey: 'id', compare, eq });

    test('create', () => {
        const item = { id: '1', version: 0, value: 'test' };
        const next = testHandler.create({}, item);
        expect(next[1]).toEqual(item);
    });

    test('update', () => {
        const item: TestItem = { id: '1', version: 0, value: 'test' };
        const update: Partial<TestItem> = { value: 'newvalue', version: 1 };

        const next = testHandler.update({ [item.id]: item }, item.id, update);
        expect(next[1]).toEqual({ id: '1', version: 1, value: 'newvalue' });
    });

    test('remove', () => {
        const item: TestItem = { id: '1', version: 0, value: 'test' };
        const next = testHandler.remove({ [item.id]: item }, item.id);
        expect(next).toEqual({});
    });

    describe('merge', () => {
        test('should detect created entries', () => {
            const item: TestItem = { id: '1', version: 0, value: 'test' };
            const next = testHandler.merge({}, { [item.id]: item });
            expect(next).toEqual({ [item.id]: item });
        });

        test('should detect deleted entries', () => {
            const item: TestItem = { id: '1', version: 0, value: 'test' };
            const next = testHandler.merge({ [item.id]: item }, {});
            expect(next).toEqual({});
        });

        test('should detect noops and throw `SKIP`', () => {
            const item: TestItem = { id: '1', version: 0, value: 'test' };
            const existing = { [item.id]: item };
            const incoming = { [item.id]: item };
            expect(() => testHandler.merge(existing, incoming)).toThrow(OptimisticMergeResult.SKIP);
        });
    });
});
