export async function mkdir() {}

export async function writeFile() {}

export async function readFile() {
  throw new Error("File downloads stay in the JSON record. The file itself is not stored in the browser.");
}
