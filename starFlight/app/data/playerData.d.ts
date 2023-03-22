export declare const playerData: {
    inventory: {
        type: string;
        meta: {
            type: string;
        };
    }[];
    modules: ({
        _id: string;
        moduleId: string;
        abilityId: number;
    } | {
        _id: string;
        moduleId: string;
        abilityId?: undefined;
    })[];
};
