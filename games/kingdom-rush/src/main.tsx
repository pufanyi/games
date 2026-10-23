import "./ui/style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KingdomRush } from "./ui/KingdomRush.tsx";

// The canvas draws in this font but cannot trigger loading it.
document.fonts.load('20px "Lilita One"');

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <KingdomRush />
  </StrictMode>,
);
