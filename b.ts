import { createControlledPromise } from "utftu";

const b = createControlledPromise();

b.controls.reject();
// b.promise.catch(() => {});

console.log("-----", "123", 123);
