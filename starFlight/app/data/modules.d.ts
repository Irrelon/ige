export declare const modules: ({
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    action: string;
    classId: string;
    name: string;
    abilityTitle: string;
    canBeActive: string;
    usageCost: {
        energy: number;
    };
    input: {
        fuel?: undefined;
        energy?: undefined;
    };
    output: {
        $target?: undefined;
        energy?: undefined;
        shield?: undefined;
    };
    state: {
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        fuel?: undefined;
        shield?: undefined;
        integrity?: undefined;
        energy?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    range: number;
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    requiresTarget: boolean;
    enabled: boolean;
    active: boolean;
    activeDuration: number;
    cooldownDuration: number;
    effects: {
        onActive: {
            action: string;
            classId: string;
            mount: string;
            data: {};
        }[];
        onInactive: {
            action: string;
            classId: string;
            mount: string;
            data: {};
        }[];
    };
    audio: {
        onActive: {
            action: string;
            audioId: string;
            for: string;
            loop: boolean;
            position: string;
            mount: string;
        }[];
        onInactive: {
            action: string;
            audioId: string;
        }[];
        onComplete: ({
            action: string;
            audioId: string;
            for?: undefined;
            position?: undefined;
        } | {
            action: string;
            audioId: string;
            for: string;
            position: string;
        })[];
    };
    damageIndex?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    action: string;
    classId: string;
    name: string;
    abilityTitle: string;
    canBeActive: string;
    usageCost: {
        energy: number;
    };
    input: {
        fuel?: undefined;
        energy?: undefined;
    };
    output: {
        $target: {
            integrity: number;
        };
        energy?: undefined;
        shield?: undefined;
    };
    state: {
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        fuel?: undefined;
        shield?: undefined;
        integrity?: undefined;
        energy?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    range: number;
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    requiresTarget: boolean;
    enabled: boolean;
    active: boolean;
    activeDuration: number;
    cooldownDuration: number;
    effects: {
        onActive: {
            classId: string;
            mount: string;
            data: {};
        }[];
        onInactive?: undefined;
    };
    audio?: undefined;
    damageIndex?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    classId: string;
    name: string;
    input: {
        fuel: number;
        energy?: undefined;
    };
    output: {
        energy: number;
        $target?: undefined;
        shield?: undefined;
    };
    state: {
        maxSpeed: {
            initial: number;
            min: number;
            max: number;
        };
        thrustPower: {
            initial: number;
            min: number;
            max: number;
        };
        reversePower: {
            initial: number;
            min: number;
            max: number;
        };
        linearDamping: {
            initial: number;
            max: number;
            min: number;
        };
        fuel?: undefined;
        shield?: undefined;
        integrity?: undefined;
        energy?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    enabled: boolean;
    active: boolean;
    action?: undefined;
    abilityTitle?: undefined;
    canBeActive?: undefined;
    usageCost?: undefined;
    range?: undefined;
    requiresTarget?: undefined;
    activeDuration?: undefined;
    cooldownDuration?: undefined;
    effects?: undefined;
    audio?: undefined;
    damageIndex?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    classId: string;
    name: string;
    input: {
        fuel?: undefined;
        energy?: undefined;
    };
    output: {
        $target?: undefined;
        energy?: undefined;
        shield?: undefined;
    };
    state: {
        fuel: {
            initial: number;
            min: number;
            max: number;
        };
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        shield?: undefined;
        integrity?: undefined;
        energy?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    enabled: boolean;
    active: boolean;
    action?: undefined;
    abilityTitle?: undefined;
    canBeActive?: undefined;
    usageCost?: undefined;
    range?: undefined;
    requiresTarget?: undefined;
    activeDuration?: undefined;
    cooldownDuration?: undefined;
    effects?: undefined;
    audio?: undefined;
    damageIndex?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    classId: string;
    name: string;
    damageIndex: number;
    input: {
        energy: number;
        fuel?: undefined;
    };
    output: {
        shield: number;
        $target?: undefined;
        energy?: undefined;
    };
    state: {
        shield: {
            initial: number;
            min: number;
            max: number;
        };
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        fuel?: undefined;
        integrity?: undefined;
        energy?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    enabled: boolean;
    active: boolean;
    action?: undefined;
    abilityTitle?: undefined;
    canBeActive?: undefined;
    usageCost?: undefined;
    range?: undefined;
    requiresTarget?: undefined;
    activeDuration?: undefined;
    cooldownDuration?: undefined;
    effects?: undefined;
    audio?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    classId: string;
    name: string;
    damageIndex: number;
    input: {
        fuel?: undefined;
        energy?: undefined;
    };
    output: {
        $target?: undefined;
        energy?: undefined;
        shield?: undefined;
    };
    state: {
        integrity: {
            initial: number;
            min: number;
            max: number;
        };
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        fuel?: undefined;
        shield?: undefined;
        energy?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    enabled: boolean;
    active: boolean;
    action?: undefined;
    abilityTitle?: undefined;
    canBeActive?: undefined;
    usageCost?: undefined;
    range?: undefined;
    requiresTarget?: undefined;
    activeDuration?: undefined;
    cooldownDuration?: undefined;
    effects?: undefined;
    audio?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    classId: string;
    name: string;
    input: {
        fuel?: undefined;
        energy?: undefined;
    };
    output: {
        $target?: undefined;
        energy?: undefined;
        shield?: undefined;
    };
    state: {
        energy: {
            initial: number;
            min: number;
            max: number;
        };
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        fuel?: undefined;
        shield?: undefined;
        integrity?: undefined;
        inventorySpace?: undefined;
        inventoryCount?: undefined;
    };
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    enabled: boolean;
    active: boolean;
    action?: undefined;
    abilityTitle?: undefined;
    canBeActive?: undefined;
    usageCost?: undefined;
    range?: undefined;
    requiresTarget?: undefined;
    activeDuration?: undefined;
    cooldownDuration?: undefined;
    effects?: undefined;
    audio?: undefined;
    damageIndex?: undefined;
} | {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: number;
    classId: string;
    name: string;
    input: {
        fuel?: undefined;
        energy?: undefined;
    };
    output: {
        $target?: undefined;
        energy?: undefined;
        shield?: undefined;
    };
    state: {
        inventorySpace: {
            initial: number;
        };
        inventoryCount: {
            initial: number;
        };
        maxSpeed?: undefined;
        thrustPower?: undefined;
        reversePower?: undefined;
        linearDamping?: undefined;
        fuel?: undefined;
        shield?: undefined;
        integrity?: undefined;
        energy?: undefined;
    };
    attachTo: string[];
    baseCost: {
        credits: number;
    };
    enabled: boolean;
    active: boolean;
    action?: undefined;
    abilityTitle?: undefined;
    canBeActive?: undefined;
    usageCost?: undefined;
    range?: undefined;
    requiresTarget?: undefined;
    activeDuration?: undefined;
    cooldownDuration?: undefined;
    effects?: undefined;
    audio?: undefined;
    damageIndex?: undefined;
})[];
