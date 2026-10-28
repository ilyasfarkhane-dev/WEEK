import { useNavigate } from "react-router-dom";
import { postForm } from "@/client/api";

export function ActionForm({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <form
      className={className}
      action={async (formData) => {
        const result = await postForm(name, formData);
        if (result.redirect) navigate(result.redirect);
      }}
    >
      {children}
    </form>
  );
}
