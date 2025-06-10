import { argv } from "node:process";
import { pathToFileURL } from "url";

if (import.meta.url === pathToFileURL(argv[1] || "").href) {
  main();
}

function main() {
  console.log("Модуль запущен напрямую");
}

// const a = argv[1];

// if (import.meta.url === `file://${argv[1]}`) {
//   // Модуль запущен напрямую
//   main();
// }

// function main() {
//   console.log("Модуль запущен напрямую");
// }
