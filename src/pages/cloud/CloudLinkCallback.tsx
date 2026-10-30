import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cloudAccountClient } from "@/lib/cloud/cloudAccountAuth";
import { useCloudConsolePaths } from "@/lib/cloudPaths";

export default function CloudLinkCallback() {
  const navigate = useNavigate();
  const { link } = useCloudConsolePaths();

  useEffect(() => {
    const auth = cloudAccountClient();
    if (!auth) {
      navigate(link, { replace: true });
      return;
    }
    void auth.auth.getSession().finally(() => {
      navigate(link, { replace: true });
    });
  }, [link, navigate]);

  return <p className="p-6 text-sm text-muted-foreground">Returning to the link step…</p>;
}
