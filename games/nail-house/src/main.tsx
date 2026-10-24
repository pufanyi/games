import { createRoot } from "react-dom/client";
import { NailHouse } from "./ui/NailHouse.tsx";

const root = document.getElementById("root");
if (root) createRoot(root).render(<NailHouse />);
