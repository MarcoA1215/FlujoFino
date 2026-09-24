export class ColumnNumericTransformer {
  to(data: number | null): number | null {
    return data;
  }
  from(data: string | null): number {
    return data !== null && data !== undefined ? parseFloat(data) : 0;
  }
}
