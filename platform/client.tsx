// Browser entry: hydrates the server-rendered page from its serialized props.
import { hydrateRoot } from "react-dom/client";
import { type Page, PageView } from "./pages.tsx";

const root = document.getElementById("root");
const data = document.getElementById("page-data");
if (root && data?.textContent) {
  const page: Page = JSON.parse(data.textContent);
  hydrateRoot(root, <PageView page={page} />);
}
