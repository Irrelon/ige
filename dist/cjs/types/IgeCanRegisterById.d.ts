export interface IgeCanRegisterById {
    _idRegistered: boolean;
    _id?: string;
    id(id: string): this;
    id(): string;
    id(id?: string): this | string;
}
