import { Link as RouterLink, type LinkProps } from "react-router-dom";

export function Link({ href, ...props }: { href: string } & Omit<LinkProps, "to">) {
  return <RouterLink to={href} {...props} />;
}
