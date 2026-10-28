import type { ActionResult } from "@/server/result";
import { callAction as runAction, loadView as readView, postForm as submitForm } from "@/client/runtime";

export async function callAction<T = undefined>(name: string, input?: unknown): Promise<ActionResult<T>> {
  return runAction<T>(name, input);
}

export async function postForm(name: string, formData: FormData): Promise<ActionResult & { redirect?: string }> {
  return submitForm(name, formData);
}

export async function loadView<T>(path: string): Promise<T> {
  return readView<T>(path);
}
