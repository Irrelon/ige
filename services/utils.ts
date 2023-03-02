export const arrPull = (arr, item): number => {
    const index = arr.indexOf(item);

    if (index > -1) {
        arr.splice(index, 1);
        return index;
    } else {
        return -1;
    }
};

export const arrClone = (arr) => {
    const newArray = [];

    for (const i in arr) {
        if (arr.hasOwnProperty(i)) {
            if (arr[i] instanceof Array) {
                newArray[i] = arrClone(arr[i]);
            } else {
                newArray[i] = arr[i];
            }
        }
    }

    return newArray;
};
