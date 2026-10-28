function join(...parts: Array<string | undefined>) {
  return parts.filter((part) => Boolean(part)).join("/").replace(/\/+/g, "/");
}

function dirname(file: string) {
  const parts = file.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

function resolve(...parts: Array<string | undefined>) {
  return join(...parts);
}

export { dirname, join, resolve };
export default { dirname, join, resolve };
