import "./style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoldMiner } from "./GoldMiner.tsx";

// The canvas draws text in this font but can't trigger loading it.
document.fonts.load('20px "Lilita One"');

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <GoldMiner />
  </StrictMode>,
);
