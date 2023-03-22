export declare const systems: {
    valeria: {
        _id: string;
        name: string;
        station: {
            _id: string;
            name: string;
            classId: string;
            public: {
                texture: string;
            };
            position: number[];
            market: {
                jobs: never[];
                goods: {
                    _id: string;
                    name: string;
                    type: string;
                }[];
            }[];
            interior: {
                _id: string;
                width: number;
                height: number;
                floorTiles: number[];
                wallTiles: never[];
                features: {
                    _id: string;
                    name: string;
                    classId: string;
                    position: number[];
                }[];
            }[];
        }[];
        jumpGate: {
            _id: string;
            name: string;
            classId: string;
            visible: boolean;
            position: number[];
            public: {
                texture: string;
            };
            destination: {
                _id: string;
                name: string;
            };
        }[];
        asteroidBelt: {
            _id: string;
            position: number[];
        }[];
    };
    orhaan: {
        _id: string;
        name: string;
        jumpGate: {
            _id: string;
            name: string;
            classId: string;
            visible: boolean;
            position: number[];
            destination: {
                _id: string;
                name: string;
            };
        }[];
    };
};
