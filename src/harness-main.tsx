import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Harness, AudienceHarness } from "./harness";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const isAudience = params.has("audience");
const initialPath =
  params.get("route") === "events"
    ? "/admin/events"
    : params.get("route") === "library"
      ? "/admin/library"
      : params.get("route") === "live"
        ? "/admin/live"
        : "/admin";

const Component = isAudience ? AudienceHarness : () => <Harness initialPath={initialPath} />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Component />
  </StrictMode>,
);