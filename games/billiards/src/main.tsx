import "./ui/style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Billiards } from "./ui/Billiards.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <Billiards />
  </StrictMode>,
);
