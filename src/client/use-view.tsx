import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadView } from "@/client/api";

type ViewState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "missing" }
  | { status: "forbidden" }
  | { status: "error" };

export function useView<T>() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = `${location.pathname}${location.search}`;
  const [state, setState] = useState<ViewState<T>>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    loadView<T & { redirect?: string; notFound?: boolean; forbidden?: boolean }>(path)
      .then((data) => {
        if (!live || !data || typeof data !== "object") {
          if (live) setState({ status: "error" });
          return;
        }
        if ("redirect" in data && data.redirect) {
          navigate(data.redirect);
          return;
        }
        if ("notFound" in data && data.notFound) setState({ status: "missing" });
        else if ("forbidden" in data && data.forbidden) setState({ status: "forbidden" });
        else setState({ status: "ready", data });
      })
      .catch(() => {
        if (live) setState({ status: "error" });
      });
    return () => {
      live = false;
    };
  }, [path, navigate]);

  return state;
}
