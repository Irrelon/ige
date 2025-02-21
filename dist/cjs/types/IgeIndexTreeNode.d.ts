export interface IgeIndexTreeNode<ValueType = any> {
    id: string;
    values: ValueType[];
    branches: Record<string, IgeIndexTreeNode>;
}
