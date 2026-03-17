export function indexById<T extends { id: string }>(
  records: T[],
): Record<string, T> {
  return records.reduce<Record<string, T>>((accumulator, record) => {
    accumulator[record.id] = record;
    return accumulator;
  }, {});
}
